import React, { useState, useEffect } from 'react';
import { WebcamCapture } from './components/WebcamCapture';
import { LogHistory } from './components/LogHistory';
import { LiveShopAssistant } from './components/LiveShopAssistant';
import { analyzeImageForCount, getApiKey, saveApiKey } from './services/geminiService';
import { CountLog, AppStatus, ShopOrder, ShopInsight } from './types';
import { ChefHat, AlertCircle, Mic2, Camera, Check, X, Plus, Minus, Key, ArrowRight } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<'counter' | 'assistant'>('assistant');
  const [activeApiKey, setActiveApiKey] = useState<string | null>(null);
  
  // Counter State
  const [logs, setLogs] = useState<CountLog[]>([]);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Verification State
  const [pendingCount, setPendingCount] = useState<{count: number, image: string} | null>(null);

  // Assistant State
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [insights, setInsights] = useState<ShopInsight[]>([]);

  // Manual Key Entry State
  const [inputKey, setInputKey] = useState('');

  // Check for API Key on mount
  useEffect(() => {
    const key = getApiKey();
    if (key) {
      setActiveApiKey(key);
    }
  }, []);

  const handleManualKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim().length > 10) {
      saveApiKey(inputKey.trim());
      setActiveApiKey(inputKey.trim());
    }
  };

  // Load logs from local storage on mount
  useEffect(() => {
    const savedLogs = localStorage.getItem('kachori_logs');
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error("Failed to parse logs from storage");
      }
    }
  }, []);

  // Save logs to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('kachori_logs', JSON.stringify(logs));
  }, [logs]);

  const handleCapture = async (imageData: string) => {
    setStatus(AppStatus.ANALYZING);
    setErrorMessage(null);

    try {
      const result = await analyzeImageForCount(imageData);
      setPendingCount({
        count: result.count,
        image: imageData
      });
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      setStatus(AppStatus.ERROR);
      setErrorMessage(err.message || "Failed to analyze image.");
    }
  };

  const confirmCount = () => {
    if (pendingCount) {
        const newLog: CountLog = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            count: pendingCount.count,
            imageUrl: pendingCount.image,
        };
        setLogs(prev => [newLog, ...prev]);
        setPendingCount(null);
        setStatus(AppStatus.IDLE);
    }
  };

  const discardCount = () => {
    setPendingCount(null);
    setStatus(AppStatus.IDLE);
  };

  const adjustCount = (delta: number) => {
    if (pendingCount) {
        setPendingCount(prev => prev ? ({ ...prev, count: Math.max(0, prev.count + delta) }) : null);
    }
  };

  const clearLogs = () => {
    if (confirm("Are you sure you want to clear all history?")) {
      setLogs([]);
    }
  };

  const deleteLog = (id: string) => {
      setLogs(prev => prev.filter(log => log.id !== id));
  };

  const handleNewOrder = (order: ShopOrder) => {
    setOrders(prev => [order, ...prev]);
  };

  const handleNewInsight = (insight: ShopInsight) => {
    setInsights(prev => [insight, ...prev]);
  };

  if (!activeApiKey) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl border border-red-500/30 shadow-2xl max-w-md w-full text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-red-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
             <Key className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Setup Required</h1>
          <p className="text-slate-400 mb-6 text-sm">
            This app requires a Google Gemini API Key to function.
          </p>
          
          <form onSubmit={handleManualKeySubmit} className="mb-6">
             <div className="relative">
               <input 
                 type="password" 
                 value={inputKey}
                 onChange={(e) => setInputKey(e.target.value)}
                 placeholder="Paste API Key here (starts with AIza...)"
                 className="w-full bg-slate-950 border border-slate-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm font-mono placeholder:text-slate-600"
               />
               <button 
                 type="submit"
                 disabled={inputKey.length < 10}
                 className="absolute right-2 top-2 bottom-2 bg-amber-600 hover:bg-amber-500 text-white px-3 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition"
               >
                 <ArrowRight className="w-4 h-4" />
               </button>
             </div>
             <p className="text-[10px] text-slate-500 mt-2 text-left">
               *Key will be saved securely in your browser's Local Storage.
             </p>
          </form>

          <div className="text-left bg-black/30 p-4 rounded-lg text-xs font-mono text-slate-300 mb-6">
             <p className="mb-2 text-amber-500">How to get a key:</p>
             <ol className="list-decimal pl-4 space-y-1">
               <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a></li>
               <li>Click "Create API Key"</li>
               <li>Copy the key and paste it above</li>
             </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-amber-500 selection:text-white overflow-x-hidden flex flex-col">
      {/* Top System Bar */}
      <div className="bg-slate-950 text-slate-500 py-1 px-4 text-[10px] font-mono flex justify-between items-center border-b border-white/5 shrink-0">
        <div className="flex gap-4">
          <span>KACHORI-OS KERNEL V3.2 (VERCEL READY)</span>
          <span>SECURE CONNECTION</span>
        </div>
        <div className="flex gap-4 items-center">
          <span>{new Date().toLocaleDateString()}</span>
          <span className="flex items-center gap-2 text-emerald-500 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 
            ONLINE
          </span>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-slate-900/80 border-b border-white/10 sticky top-0 z-40 backdrop-blur-md shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand */}
          <div className="flex items-center gap-4 group">
            <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-3 rounded-2xl shadow-lg shadow-amber-900/20 text-white group-hover:scale-105 transition-transform duration-300">
                <ChefHat className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">Kachori<span className="text-amber-500">OS</span></h1>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                Enterprise Edition
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-white/5 shadow-inner backdrop-blur-sm z-50">
             <button 
               onClick={() => setMode('assistant')}
               className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-sm font-bold transition-all uppercase tracking-wide
                 ${mode === 'assistant' 
                   ? 'bg-slate-700 text-amber-400 shadow-lg ring-1 ring-white/10' 
                   : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
             >
               <Mic2 className="w-4 h-4" /> 
               <div className="text-left">
                 <span className="block text-[10px] opacity-50">Surveillance</span>
                 Digital Munim
               </div>
             </button>
             <button 
               onClick={() => setMode('counter')}
               className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-sm font-bold transition-all uppercase tracking-wide
                 ${mode === 'counter' 
                   ? 'bg-slate-700 text-amber-400 shadow-lg ring-1 ring-white/10' 
                   : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
             >
               <Camera className="w-4 h-4" />
               <div className="text-left">
                 <span className="block text-[10px] opacity-50">Computer Vision</span>
                 Maal Ginti
               </div>
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full relative">
        
        {/* PERSISTENT ASSISTANT: Always mounted, hidden via CSS when not in mode */}
        <div className={`${mode === 'assistant' ? 'block' : 'hidden'} h-full`}>
           <LiveShopAssistant 
              apiKey={activeApiKey}
              onNewOrder={handleNewOrder}
              onNewInsight={handleNewInsight}
              recentOrders={orders}
              recentInsights={insights}
           />
        </div>

        {/* COUNTER: Only mounted when needed */}
        {mode === 'counter' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* Left Column: Camera */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-800/50 rounded-2xl shadow-2xl border border-white/5 overflow-hidden backdrop-blur-sm relative">
                <div className="bg-slate-900/50 px-6 py-4 border-b border-white/5 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-amber-500" />
                    VISUAL INSPECTION UNIT
                  </h2>
                  <div className="flex gap-2">
                     <span className="h-2 w-2 rounded-full bg-slate-700"></span>
                     <span className="h-2 w-2 rounded-full bg-slate-700"></span>
                     <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                </div>
                
                <div className="p-6">
                   <WebcamCapture 
                    onCapture={handleCapture} 
                    isProcessing={status === AppStatus.ANALYZING} 
                  />
                </div>

                {/* VERIFICATION MODAL OVERLAY */}
                {pendingCount && (
                    <div className="absolute inset-0 bg-slate-900/90 z-50 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-200">
                        <h3 className="text-slate-400 font-bold uppercase tracking-widest text-sm mb-4">Verification Required</h3>
                        
                        <div className="bg-slate-800 rounded-3xl p-8 border border-amber-500/30 shadow-2xl shadow-amber-900/20 text-center max-w-sm w-full">
                            <p className="text-slate-400 text-sm mb-2 font-mono">AI DETECTED</p>
                            <div className="flex items-center justify-center gap-6 mb-6">
                                <button onClick={() => adjustCount(-1)} className="p-4 bg-slate-700 rounded-full hover:bg-slate-600 active:scale-95 transition">
                                    <Minus className="w-6 h-6 text-white" />
                                </button>
                                <span className="text-6xl font-black text-amber-500 font-mono w-32">{pendingCount.count}</span>
                                <button onClick={() => adjustCount(1)} className="p-4 bg-slate-700 rounded-full hover:bg-slate-600 active:scale-95 transition">
                                    <Plus className="w-6 h-6 text-white" />
                                </button>
                            </div>
                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={discardCount}
                                    className="flex-1 py-3 bg-slate-700 text-slate-300 font-bold rounded-xl hover:bg-slate-600 transition flex items-center justify-center gap-2"
                                >
                                    <X className="w-4 h-4" /> RETRY
                                </button>
                                <button 
                                    onClick={confirmCount}
                                    className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" /> SAVE
                                </button>
                            </div>
                        </div>
                    </div>
                )}
              </div>

              {/* Status Messages */}
              {status === AppStatus.ERROR && (
                <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-400 shadow-lg flex items-center gap-3 animate-in shake">
                  <AlertCircle className="w-6 h-6" />
                  <span className="font-bold">SYSTEM ERROR: {errorMessage}</span>
                </div>
              )}
            </div>

            {/* Right Column: Data */}
            <div className="lg:col-span-5">
              <LogHistory 
                logs={logs} 
                onClear={clearLogs} 
                onDelete={deleteLog}
              />
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;