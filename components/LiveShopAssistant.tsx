import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration, LiveSession } from "@google/genai";
import { ShopOrder, ShopInsight, OrderItem } from '../types';
import { SHOP_MENU, MenuItem } from '../services/menuData';
import { 
  Mic, Volume2, Activity, MessageSquarePlus, ShieldAlert, ShoppingCart, 
  Clock, AlertTriangle, Smile, Meh, Frown, Save, Zap
} from 'lucide-react';

// --- Types for Live API ---
interface LiveShopAssistantProps {
  onNewOrder: (order: ShopOrder) => void;
  onNewInsight: (insight: ShopInsight) => void;
  recentOrders: ShopOrder[];
  recentInsights: ShopInsight[];
}

// --- Tool Definitions ---
const logOrderTool: FunctionDeclaration = {
  name: "logOrder",
  description: "Log customer orders. Extract item names and quantities from speech.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        items: { 
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Item name (e.g. Samosa, Kachori)" },
            quantity: { type: Type.NUMBER, description: "Quantity (default 1)" },
            notes: { type: Type.STRING }
          },
          required: ["name"]
        },
      },
    },
    required: ["items"],
  },
};

const saveInsightTool: FunctionDeclaration = {
  name: "saveInsight",
  description: "Save a key business insight. IGNORE small talk. Capture shopping needs or security risks.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        enum: ["inventory", "customer", "general", "shopping_list", "security_risk"],
        description: "Category of the insight.",
      },
      content: {
        type: Type.STRING,
        description: "The insight, list item, or risk description.",
      },
      severity: {
        type: Type.STRING,
        enum: ["low", "medium", "high"],
        description: "Only for security_risk or urgent shopping items. Default is low.",
      }
    },
    required: ["category", "content"],
  },
};

const suggestCashierPromptTool: FunctionDeclaration = {
  name: "suggestCashierPrompt",
  description: "Suggest a clarification question for the cashier if the order is ambiguous.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      promptText: {
        type: Type.STRING,
        description: "The exact Hinglish phrase the cashier should say.",
      },
      reason: {
        type: Type.STRING,
        description: "Why this question is needed.",
      },
    },
    required: ["promptText", "reason"],
  },
};

const logSentimentTool: FunctionDeclaration = {
  name: "logSentiment",
  description: "Log customer sentiment if it is notably Positive or Negative.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      sentiment: {
        type: Type.STRING,
        enum: ["positive", "neutral", "negative"],
        description: "The overall mood of the interaction.",
      },
      summary: {
        type: Type.STRING,
        description: "Brief reason for the sentiment.",
      },
    },
    required: ["sentiment", "summary"],
  },
};

// --- Helper Functions ---

// Simple downsampler to 16kHz
function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number = 16000): Float32Array {
  if (inputRate === outputRate) return buffer;
  const compression = inputRate / outputRate;
  const length = Math.floor(buffer.length / compression);
  const result = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    result[i] = buffer[Math.floor(i * compression)];
  }
  return result;
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  // Data is assumed to be 16kHz from downsampler
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 32768 : s * 32767;
  }
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    data: btoa(binary),
    mimeType: "audio/pcm;rate=16000",
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Helper to find canonical menu item from variations
function findMenuItem(query: string): MenuItem | undefined {
    const q = query.toLowerCase().trim();
    // 1. Exact Match Name
    let match = SHOP_MENU.find(item => item.name.toLowerCase() === q);
    if (match) return match;

    // 2. Variation Match
    match = SHOP_MENU.find(item => item.variations?.some(v => v.toLowerCase() === q));
    if (match) return match;
    
    // 3. Partial Match (Name) - e.g. "Kachori" in "Pyaz Kachori"
    match = SHOP_MENU.find(item => item.name.toLowerCase().includes(q) || q.includes(item.name.toLowerCase()));
    
    return match;
}

export const LiveShopAssistant: React.FC<LiveShopAssistantProps> = ({ 
  onNewOrder, 
  onNewInsight, 
  recentOrders, 
  recentInsights 
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [cashierPrompt, setCashierPrompt] = useState<{text: string, reason: string} | null>(null);
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(30).fill(0));
  const [error, setError] = useState<string | null>(null);
  const [currentSentiment, setCurrentSentiment] = useState<{type: 'positive' | 'neutral' | 'negative', summary: string} | null>(null);
  const [statusText, setStatusText] = useState("INITIALIZING...");

  // Consolidated History
  const [sessionHistory, setSessionHistory] = useState<{orders: ShopOrder[], insights: ShopInsight[]}>({
    orders: [],
    insights: []
  });

  const sessionHistoryRef = useRef<{orders: ShopOrder[], insights: ShopInsight[]}>({
    orders: [],
    insights: []
  });

  const isActiveRef = useRef(false);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const currentSessionRef = useRef<LiveSession | null>(null);
  
  // Refs to avoid stale closures in WebSocket callbacks
  const onNewOrderRef = useRef(onNewOrder);
  const onNewInsightRef = useRef(onNewInsight);

  useEffect(() => {
    sessionHistoryRef.current = sessionHistory;
  }, [sessionHistory]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
    onNewInsightRef.current = onNewInsight;
  }, [onNewOrder, onNewInsight]);
  
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const rafRef = useRef<number | null>(null);
  const cleanupIntervalRef = useRef<number | null>(null);

  // --- Auto-Start on Mount ---
  useEffect(() => {
    const init = async () => {
      try {
        await startSession();
      } catch (e: any) {
        console.warn("Auto-start blocked:", e);
        setStatusText("TAP SCREEN TO ENABLE AUDIO");
        // Fallback: Use a one-time document listener to init audio contexts if autoplay is blocked
        const enableAudio = async () => {
             if (!isActiveRef.current) await startSession();
             window.removeEventListener('click', enableAudio);
             window.removeEventListener('touchstart', enableAudio);
        };
        window.addEventListener('click', enableAudio);
        window.addEventListener('touchstart', enableAudio);
      }
    };
    init();

    return () => {
        // Cleanup on strict unmount only
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        stopSession();
    };
  }, []);

  const generateSessionReport = () => {
    const history = sessionHistoryRef.current;
    if (history.orders.length === 0 && history.insights.length === 0) return;

    const headers = ["Timestamp", "Type", "Qty", "Item/Content", "Notes/Category"];
    const rows = [
      ...history.orders.flatMap(o => 
        o.items.map(item => [
          new Date(o.timestamp).toLocaleTimeString(),
          "ORDER",
          item.quantity,
          item.name,
          item.notes || ""
        ])
      ),
      ...history.insights.map(i => [
        new Date(i.timestamp).toLocaleTimeString(),
        "INSIGHT",
        "",
        i.content,
        `${i.category} (${i.severity || 'low'})`
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `KachoriOS_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResumeAudio = async () => {
    if (inputContextRef.current?.state === 'suspended') await inputContextRef.current.resume();
    if (outputContextRef.current?.state === 'suspended') await outputContextRef.current.resume();
    if (!isActive) startSession();
  };

  const startSession = async () => {
    if (isActiveRef.current) return;
    // Explicitly clean up any previous zombie session before starting new
    stopSession();
    
    setError(null);
    setStatusText("CONNECTING...");

    try {
      if (!navigator.onLine) {
        throw new Error("Network Offline");
      }

      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });
      } catch (err: any) {
        throw new Error(`Mic Error: ${err.message}`);
      }

      const ai = new GoogleGenAI({ apiKey });
      const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Attempt to resume contexts immediately
      if (inputContext.state === 'suspended') await inputContext.resume().catch(() => {});
      if (outputContext.state === 'suspended') await outputContext.resume().catch(() => {});

      inputContextRef.current = inputContext;
      outputContextRef.current = outputContext;
      const outputNode = outputContext.createGain();
      outputNode.connect(outputContext.destination);

      const analyser = inputContext.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;
      
      const updateVisualizer = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a,b) => a+b, 0) / dataArray.length;
        setIsThinking(average > 30);

        const bars: number[] = [];
        const step = Math.floor(dataArray.length / 30);
        for (let i = 0; i < 30; i++) {
           const val = dataArray[i * step] || 0;
           bars.push(val / 255);
        }
        setVisualizerData(bars);
        rafRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();

      const menuContext = SHOP_MENU.map(item => {
         let line = `- ${item.name}: ₹${item.price}`;
         if (item.variations) line += ` [Variations: ${item.variations.join(', ')}]`;
         return line;
      }).join('\n');

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {}, 
          outputAudioTranscription: {},
          systemInstruction: `You are 'Munim Ji', an invisible surveillance OS.
          
          FULL MENU DATABASE:
          ${menuContext}

          CORE PROTOCOLS:
          1. **CONTINUOUS SURVEILLANCE**: Listen continuously. Do not stop.
          2. **SILENT MODE**: NEVER speak unless asked a specific question.
          3. **FUZZY MATCHING**: Match colloquial terms (e.g., 'Pyaz wali') to the Database (e.g., 'Kachori').
          4. **NOISE FILTER**: Ignore all background noise/chatter. Only log Business Info.
          5. **LOGGING**: Use 'logOrder' for sales.
          `,
          tools: [{ functionDeclarations: [logOrderTool, saveInsightTool, suggestCashierPromptTool, logSentimentTool] }],
        },
        callbacks: {
          onopen: () => {
            console.log("Live Session Connected");
            setIsActive(true);
            setStatusText("SURVEILLANCE ACTIVE");

            if (!stream) return;
            const source = inputContext.createMediaStreamSource(stream);
            const processor = inputContext.createScriptProcessor(4096, 1, 1);
            
            source.connect(analyser);
            analyser.connect(processor);

            processor.onaudioprocess = (e) => {
              if (!isActiveRef.current || !currentSessionRef.current) return;
              try {
                  const inputData = e.inputBuffer.getChannelData(0);
                  const downsampledData = downsampleBuffer(inputData, inputContext.sampleRate, 16000);
                  const pcmBlob = createBlob(downsampledData);
                  
                  // Use current session ref directly to avoid promise chain complexity causing lag
                  currentSessionRef.current.sendRealtimeInput({ media: pcmBlob });
              } catch (err) {
                  // Ignore minor audio process errors to keep stream alive
              }
            };
            processor.connect(inputContext.destination);
            
            sourceRef.current = source;
            processorRef.current = processor;
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.toolCall) {
              // Aggregate all function calls into a single response payload
              const functionResponses = msg.toolCall.functionCalls.map(fc => {
                let result: any = { status: "Success" };
                
                try {
                    if (fc.name === 'logOrder') {
                       const args = fc.args as any;
                       let rawItems: any[] = [];
                       
                       // Aggressive argument unpacking to handle AI hallucinations
                       if (Array.isArray(args)) {
                           rawItems = args;
                       } else if (args.items && Array.isArray(args.items)) {
                           rawItems = args.items;
                       } else if (args.order && Array.isArray(args.order)) {
                           rawItems = args.order;
                       } else if (typeof args === 'object') {
                           // Sometimes it returns a single object instead of array
                           rawItems = [args];
                       }
                       
                       const normalizedItems: OrderItem[] = [];

                       for (const i of rawItems) {
                           // 1. Extract raw values (checking multiple possible casings)
                           let rawName = "";
                           if (typeof i === 'string') {
                               rawName = i;
                           } else {
                               rawName = i.name || i.Name || i.item || i.Item || i.itemName || i.food || i.product || i.dish || "";
                           }

                           const rawQty = typeof i === 'object' ? (i.quantity || i.Quantity || i.qty || i.Qty || i.count || i.amount || 1) : 1;
                           const rawNotes = typeof i === 'object' ? (i.notes || i.instructions || "") : "";

                           if (!rawName || rawName === "Unknown Item") continue;

                           // 2. Client-Side Fuzzy Match against Menu
                           const matchedMenu = findMenuItem(rawName);
                           const finalName = matchedMenu ? matchedMenu.name : rawName; // Use canonical name if found

                           normalizedItems.push({
                               name: finalName,
                               quantity: Number(rawQty),
                               notes: rawNotes ? String(rawNotes) : undefined
                           });
                       }

                       if (normalizedItems.length > 0) {
                           const order: ShopOrder = {
                               id: crypto.randomUUID(),
                               timestamp: new Date().toISOString(),
                               items: normalizedItems,
                               status: 'pending'
                           };
                           // Use Ref to call latest state updater
                           onNewOrderRef.current(order);
                           setSessionHistory(prev => ({ ...prev, orders: [...prev.orders, order] }));
                           setCashierPrompt(null);
                           result = { status: "Order Logged" };
                       } else {
                           result = { status: "Empty/Unknown Order Ignored" };
                       }
                    } 
                    else if (fc.name === 'saveInsight') {
                      const args = fc.args as any;
                      const insight: ShopInsight = {
                        id: crypto.randomUUID(),
                        timestamp: new Date().toISOString(),
                        category: args.category,
                        content: args.content,
                        severity: args.severity || 'low'
                      };
                      onNewInsightRef.current(insight);
                      setSessionHistory(prev => ({ ...prev, insights: [...prev.insights, insight] }));
                      result = { status: "Insight Saved" };
                    }
                    else if (fc.name === 'suggestCashierPrompt') {
                        const args = fc.args as any;
                        setCashierPrompt({ text: args.promptText, reason: args.reason });
                        setTimeout(() => setCashierPrompt(null), 10000);
                        result = { status: "Prompt Displayed" };
                    }
                    else if (fc.name === 'logSentiment') {
                      const args = fc.args as any;
                      setCurrentSentiment({ type: args.sentiment, summary: args.summary });
                      setTimeout(() => setCurrentSentiment(null), 15000);
                      result = { status: "Sentiment Logged" };
                    }
                } catch (err) {
                    console.error("Error executing tool", fc.name, err);
                    result = { status: "Error", error: String(err) };
                }

                return {
                    id: fc.id,
                    name: fc.name,
                    response: { result }
                };
              });

              // Send combined response
              if (functionResponses.length > 0 && currentSessionRef.current) {
                  currentSessionRef.current.sendToolResponse({ functionResponses })
                    .catch(e => console.error("Failed to send tool response", e));
              }
            }

            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              setIsSpeaking(true);
              const ctx = outputContextRef.current;
              if (ctx) {
                if (ctx.state === 'suspended') await ctx.resume();
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(outputNode);
                source.onended = () => {
                   sourcesRef.current.delete(source);
                   if (sourcesRef.current.size === 0) setIsSpeaking(false);
                };
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
              }
            }
          },
          onclose: () => {
             console.log("Session Closed.");
             if (isActiveRef.current) {
                 // Only reconnect if we intended to stay active
                 setStatusText("RECONNECTING...");
                 stopSession();
                 reconnectTimeoutRef.current = window.setTimeout(startSession, 3000);
             }
          },
          onerror: (e) => {
            console.error("Session Error", e);
            setStatusText("CONNECTION ERROR. RETRYING...");
            stopSession();
            // Longer backoff for errors
            reconnectTimeoutRef.current = window.setTimeout(startSession, 5000); 
          }
        }
      });
      
      // Store session reference for cleanup
      const session = await sessionPromise;
      currentSessionRef.current = session;

    } catch (e: any) {
      console.error("Start Failed", e);
      setError(e.message);
      setStatusText("OFFLINE - RETRYING");
      setIsActive(false);
      
      // CRITICAL FIX: Ensure contexts are cleaned up if start fails mid-way
      stopSession();

      // Even on start fail, retry
      reconnectTimeoutRef.current = window.setTimeout(startSession, 5000);
    }
  };

  const stopSession = () => {
    // 1. Close the WebSocket Session explicitly
    if (currentSessionRef.current) {
        try {
            currentSessionRef.current.close();
        } catch (e) {
            console.warn("Failed to close session", e);
        }
        currentSessionRef.current = null;
    }

    setIsActive(false);
    setIsSpeaking(false);
    setIsThinking(false);
    setVisualizerData(new Array(30).fill(0));

    // 2. Disconnect Audio Nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
    }
    
    // 3. Close Audio Contexts
    if (inputContextRef.current) {
        if (inputContextRef.current.state !== 'closed') {
            inputContextRef.current.close().catch(console.warn);
        }
        inputContextRef.current = null;
    }
    if (outputContextRef.current) {
        if (outputContextRef.current.state !== 'closed') {
            outputContextRef.current.close().catch(console.warn);
        }
        outputContextRef.current = null;
    }
  };
  
  useEffect(() => {
    cleanupIntervalRef.current = window.setInterval(() => {
        setCurrentTime(Date.now());
    }, 5000);
    return () => clearInterval(cleanupIntervalRef.current!);
  }, []);

  const [currentTime, setCurrentTime] = useState(Date.now());

  const getVisibleOrders = () => {
    return recentOrders.filter(order => {
       const orderTime = new Date(order.timestamp).getTime();
       const ageSeconds = (currentTime - orderTime) / 1000;
       const itemsStr = order.items.map(i => i.name).join(' ');
       const hasJalebi = itemsStr.toLowerCase().includes('jalebi') || itemsStr.toLowerCase().includes('imarti');
       const isLarge = order.items.length > 3;
       const timeout = (hasJalebi || isLarge) ? 90 : 45;
       return ageSeconds < timeout;
    });
  };

  const visibleOrders = getVisibleOrders();
  const shoppingList = recentInsights.filter(i => i.category === 'shopping_list');
  const securityLogs = recentInsights.filter(i => i.category === 'security_risk');

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-6 relative font-sans">
      
      {/* --- DASHBOARD GRID --- */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
        
        {/* LEFT: LIVE ACTIVITY FEED */}
        <div className="md:col-span-7 flex flex-col gap-4 overflow-hidden relative">
          
          {/* Prompt Overlay */}
          {cashierPrompt && (
            <div className="absolute top-0 left-0 right-0 z-50 bg-amber-600 text-white p-6 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 border border-amber-400/50 flex items-center gap-6">
                <div className="bg-white/20 p-4 rounded-xl animate-pulse shrink-0">
                  <MessageSquarePlus className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-200 uppercase tracking-widest text-xs mb-1">CASHIER PROMPT</h4>
                  <p className="text-2xl font-black leading-tight">"{cashierPrompt.text}"</p>
                  <p className="opacity-80 mt-1 text-sm">{cashierPrompt.reason}</p>
                </div>
            </div>
          )}

          {/* Orders List */}
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 scrollbar-none">
            <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-2 px-1">
              <Activity className="w-4 h-4 text-emerald-500" /> Active Orders
            </h3>
            {visibleOrders.length === 0 ? (
              <div className="flex-1 rounded-2xl flex flex-col items-center justify-center text-slate-700 border-2 border-dashed border-slate-800 bg-slate-900/50">
                <Clock className="w-12 h-12 opacity-20 mb-4" />
                <p className="font-medium text-lg tracking-wide opacity-50">LISTENING...</p>
              </div>
            ) : (
              visibleOrders.map((order) => {
                const itemsStr = order.items.map(i => i.name).join(' ');
                const isJalebi = itemsStr.toLowerCase().includes('jalebi') || itemsStr.toLowerCase().includes('imarti');
                
                return (
                  <div key={order.id} 
                       className={`
                         relative rounded-2xl p-5 flex flex-col gap-3 transition-all duration-500 animate-in slide-in-from-left-4
                         ${isJalebi 
                            ? 'bg-amber-900/20 border border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.1)]' 
                            : 'bg-slate-800/80 border border-white/5 shadow-lg'}
                       `}
                  >
                     <div className="flex justify-between items-start text-[10px] font-mono opacity-40 text-slate-300">
                        <span>ID: {order.id.slice(0,6)}</span>
                        <span>{new Date(order.timestamp).toLocaleTimeString()}</span>
                     </div>
                     <div className="flex flex-wrap gap-3">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-4 bg-slate-900/50 px-4 py-3 rounded-xl border border-white/5 min-w-[140px]">
                             <span className={`text-3xl font-black ${isJalebi ? 'text-orange-400' : 'text-amber-500'}`}>
                                {item.quantity}
                             </span>
                             <div className="flex flex-col">
                                <span className="text-lg font-bold text-slate-200 leading-tight">{item.name}</span>
                                {item.notes && <span className="text-xs text-slate-500">{item.notes}</span>}
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: INTELLIGENCE PANEL */}
        <div className="md:col-span-5 flex flex-col gap-4 overflow-y-auto pr-2 pb-20 scrollbar-thin scrollbar-thumb-slate-700">
           
           {/* Sentiment Widget */}
           {currentSentiment && (
             <div className={`rounded-2xl p-4 animate-in slide-in-from-right-4 border shadow-lg backdrop-blur-md ${
                currentSentiment.type === 'positive' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' :
                currentSentiment.type === 'negative' ? 'bg-red-500/10 border-red-500/20 text-red-200' :
                'bg-blue-500/10 border-blue-500/20 text-blue-200'
             }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    currentSentiment.type === 'positive' ? 'bg-emerald-500/20' : 
                    currentSentiment.type === 'negative' ? 'bg-red-500/20' : 'bg-blue-500/20'
                  }`}>
                    {currentSentiment.type === 'positive' ? <Smile className="w-5 h-5" /> : 
                     currentSentiment.type === 'negative' ? <Frown className="w-5 h-5" /> : 
                     <Meh className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider opacity-70">Sentiment Detected</h4>
                    <p className="text-sm font-medium">{currentSentiment.summary}</p>
                  </div>
                </div>
             </div>
           )}

           {/* Security Alert */}
           {securityLogs.length > 0 && (
             <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-4 animate-pulse">
                <h4 className="text-red-400 font-bold flex items-center gap-2 mb-2 tracking-wider text-xs uppercase">
                  <ShieldAlert className="w-4 h-4" /> Security Log
                </h4>
                {securityLogs.slice(0, 3).map(log => (
                  <div key={log.id} className="text-red-200 text-sm bg-red-900/40 p-2 rounded border border-red-500/20 mb-1">
                     {log.content}
                  </div>
                ))}
             </div>
           )}

           {/* Shopping List */}
           <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-5 flex flex-col backdrop-blur-sm h-full">
              <h4 className="text-slate-400 font-bold flex items-center gap-2 mb-3 text-xs uppercase tracking-widest">
                <ShoppingCart className="w-4 h-4" /> Shopping List
              </h4>
              <div className="space-y-2">
                {shoppingList.length === 0 ? (
                  <p className="text-slate-600 text-xs italic">List is empty...</p>
                ) : (
                  shoppingList.map(item => (
                    <div key={item.id} className="flex items-center gap-3 text-slate-300 text-sm border-b border-white/5 pb-2 last:border-0">
                       <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                       <span>{item.content}</span>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      </div>

      {/* --- BOTTOM STATUS BAR (Minimal) --- */}
      <div 
        onClick={handleResumeAudio}
        className={`bg-slate-800/80 backdrop-blur-xl rounded-2xl p-3 shadow-2xl flex items-center justify-between shrink-0 border-t border-white/5 mx-1 mb-2 cursor-pointer hover:bg-slate-800 transition-colors ${error ? 'border-red-500/50' : ''}`}
      >
         <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-500 ${isActive ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-500'}`}>
               {error ? <AlertTriangle className="w-4 h-4 text-red-100" /> : (isSpeaking ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />)}
            </div>
            <div>
               <h3 className={`font-bold text-[10px] tracking-wide uppercase ${error ? 'text-red-400' : 'text-slate-300'}`}>{statusText}</h3>
            </div>
         </div>

         {isActive && !error && (
            <div className="flex items-end gap-[2px] h-6 opacity-30 mx-auto">
               {visualizerData.map((val, i) => (
                  <div key={i} 
                       className="w-1 bg-amber-400 rounded-t-sm transition-all duration-75" 
                       style={{ height: `${Math.max(10, val * 100)}%` }}
                  ></div>
               ))}
            </div>
         )}
         
         <button 
           onClick={(e) => { e.stopPropagation(); generateSessionReport(); }}
           className="text-slate-500 hover:text-amber-500 transition-colors p-2"
           title="Download Full Report"
         >
           <Save className="w-5 h-5" />
         </button>
      </div>

    </div>
  );
};