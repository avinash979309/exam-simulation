import { useEffect } from 'react';

interface TimelineProps {
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  speed: number;
  setSpeed: (v: number) => void;
  playbackTime: number;
  setPlaybackTime: (v: number) => void;
  totalTime: number;
  formatTime: (secs: number) => string;
  onRestart: () => void;
  onStop: () => void;
  status: string;
}

const SPEEDS = [0.5, 1, 2, 5, 10];

export default function Timeline({
  isPlaying, setIsPlaying, speed, setSpeed, playbackTime, setPlaybackTime,
  totalTime, formatTime, onRestart, onStop, status
}: TimelineProps) {
  
  useEffect(() => {
    if (status === 'RUNNING' && !isPlaying && playbackTime === 0) {
      setIsPlaying(true);
    }
  }, [status, isPlaying, playbackTime, setIsPlaying]);

  const cycleSpeed = (dir: number) => {
    const idx = SPEEDS.indexOf(speed);
    if (dir > 0 && idx < SPEEDS.length - 1) setSpeed(SPEEDS[idx + 1]);
    if (dir < 0 && idx > 0) setSpeed(SPEEDS[idx - 1]);
  };

  return (
    <div className="bg-gray-800 text-white p-4 flex flex-col gap-2 rounded shadow">
      <div className="flex items-center gap-4">
        <button onClick={onRestart} className="hover:bg-gray-700 px-2 py-1 rounded">⟨ Restart</button>
        
        <div className="flex items-center gap-2">
          <button onClick={() => cycleSpeed(-1)} className="hover:bg-gray-700 px-2 py-1 rounded">◀◀</button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="hover:bg-gray-700 px-4 py-1 rounded font-bold">
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button onClick={() => cycleSpeed(1)} className="hover:bg-gray-700 px-2 py-1 rounded">▶▶</button>
        </div>
        
        <button onClick={onStop} className="hover:bg-gray-700 px-2 py-1 rounded text-red-400">■ Stop</button>
        
        <div className="text-gray-300 font-mono">
          Speed: {speed}x
        </div>
        
        <div className="ml-auto font-mono">
          {formatTime(playbackTime)} / {formatTime(totalTime)}
        </div>
      </div>
      
      <input 
        type="range" 
        min={0} 
        max={totalTime > 0 ? totalTime : 100} 
        value={playbackTime} 
        onChange={(e) => setPlaybackTime(Number(e.target.value))} 
        className="w-full accent-blue-500"
      />
    </div>
  );
}