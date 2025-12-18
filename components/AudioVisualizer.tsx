import React, { useRef, useEffect, useState } from 'react';
import { BrainCircuit } from 'lucide-react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  error: string | null;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser, isActive, error }) => {
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(30).fill(0));
  const [isThinking, setIsThinking] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive || !analyser) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setVisualizerData(new Array(30).fill(0));
      setIsThinking(false);
      return;
    }

    const updateVisualizer = () => {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

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

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isActive, analyser]);

  if (!isActive || error) return null;

  return (
    <div className="flex items-center gap-4 mx-auto">
       {/* Thinking Indicator */}
       <div className={`transition-opacity duration-300 ${isThinking ? 'opacity-100' : 'opacity-0'}`}>
          <BrainCircuit className="w-5 h-5 text-amber-400 animate-pulse" />
       </div>

       {/* Visualizer Bars */}
       <div className="flex items-end gap-[2px] h-6 opacity-30">
        {visualizerData.map((val, i) => (
            <div
            key={i}
            className="w-1 bg-amber-400 rounded-t-sm transition-all duration-75"
            style={{ height: `${Math.max(10, val * 100)}%` }}
            ></div>
        ))}
       </div>
    </div>
  );
};
