import React, { useState, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  src?: string;
  duration?: number;
  isOutgoing?: boolean;
}

export default function AudioPlayer({ src, duration = 0, isOutgoing }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(pct || 0);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.5, 2];
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const bars = Array.from({ length: 28 }, (_, i) => {
    const h = 4 + Math.sin(i * 0.7) * 8 + Math.random() * 6;
    return Math.max(4, Math.min(16, h));
  });

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded-xl min-w-[180px] ${isOutgoing ? '' : ''}`}>
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
      )}

      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          isOutgoing
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
        }`}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>

      {/* Waveform */}
      <div className="flex items-center gap-0.5 flex-1">
        {bars.map((h, i) => (
          <div
            key={i}
            className={`w-0.5 rounded-full transition-colors ${
              (i / bars.length) * 100 <= progress
                ? isOutgoing
                  ? 'bg-white'
                  : 'bg-blue-500'
                : isOutgoing
                ? 'bg-white/40'
                : 'bg-gray-300'
            }`}
            style={{ height: h }}
          />
        ))}
      </div>

      <div className="flex flex-col items-end gap-0.5">
        <span className={`text-[10px] ${isOutgoing ? 'text-white/70' : 'text-gray-400'}`}>
          {formatDuration(duration)}
        </span>
        <button
          onClick={cycleSpeed}
          className={`text-[10px] font-medium px-1 rounded ${
            isOutgoing ? 'text-white/80 hover:text-white' : 'text-blue-500 hover:text-blue-700'
          }`}
        >
          {speed}x
        </button>
      </div>
    </div>
  );
}
