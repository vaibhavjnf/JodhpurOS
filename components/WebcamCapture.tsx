import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RefreshCw, Aperture, AlertCircle } from 'lucide-react';

interface WebcamCaptureProps {
  onCapture: (imageData: string) => void;
  isProcessing: boolean;
}

export const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      // Explicitly request video only, to avoid conflict with audio context in background
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "environment"
        },
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("CAMERA ACCESS DENIED or BUSY");
      setStreamActive(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      // Cleanup tracks on unmount
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(dataUrl);
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Industrial Monitor Frame */}
      <div className="relative w-full bg-slate-900 rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl mb-8">
        
        {/* Screen Container */}
        <div className="relative w-full aspect-video bg-black group">
          
          {!streamActive && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-amber-500 font-mono">
              <RefreshCw className="w-8 h-8 animate-spin mb-4" />
              <span className="animate-pulse">INITIALIZING OPTICS...</span>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 bg-slate-900 font-mono p-4 text-center z-20">
              <AlertCircle className="w-12 h-12 mb-2 opacity-80" />
              <p className="uppercase tracking-widest font-bold">{error}</p>
              <button onClick={startCamera} className="mt-4 px-4 py-2 bg-red-900/30 border border-red-500 hover:bg-red-900/50 uppercase text-xs rounded">Retry Connection</button>
            </div>
          )}

          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover ${streamActive ? 'opacity-100' : 'opacity-0'}`}
          />
          
          {/* Subtle Grid Overlay for Alignment */}
          {streamActive && (
            <div className="absolute inset-0 pointer-events-none opacity-20">
               <div className="w-full h-full border border-white/20 grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-b border-white/20"></div>
                  <div className="border-r border-white/20"></div>
                  <div className="border-r border-white/20"></div>
                  <div></div>
               </div>
               
               {/* Center Focus Reticle */}
               <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-amber-500/50 rounded-lg"></div>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Industrial Capture Button */}
      <button
        onClick={capture}
        disabled={!streamActive || isProcessing}
        className={`
          group relative w-full max-w-sm py-4 rounded-2xl font-black text-xl uppercase tracking-widest transition-all
          ${!streamActive || isProcessing 
            ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed' 
            : 'bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:to-amber-400 shadow-xl shadow-amber-900/30 hover:shadow-amber-900/50 active:scale-95'}
        `}
      >
        <div className="flex items-center justify-center gap-3">
            {isProcessing ? (
            <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>COUNTING...</span>
            </>
            ) : (
            <>
                <Aperture className="w-6 h-6" />
                <span>CAPTURE TRAY</span>
            </>
            )}
        </div>
      </button>
    </div>
  );
};