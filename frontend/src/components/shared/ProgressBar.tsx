import React from 'react';

interface ProgressBarProps {
  stages: { name: string; color: string }[];
  currentIndex: number;
}

export default function ProgressBar({ stages, currentIndex }: ProgressBarProps) {
  return (
    <div className="flex gap-0.5 w-full">
      {stages.map((stage, index) => (
        <div
          key={index}
          className="flex-1 h-1.5 rounded-sm transition-all duration-300"
          style={{
            backgroundColor: index <= currentIndex ? stage.color : '#e5e7eb',
          }}
          title={stage.name}
        />
      ))}
    </div>
  );
}
