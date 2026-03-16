import React from 'react';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'ONLINE' | 'AWAY' | 'OFFLINE';
  className?: string;
}

function getColorFromName(name: string): string {
  const colors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#22c55e', '#14b8a6', '#06b6d4',
    '#6366f1', '#f59e0b',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const sizes = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-12 h-12 text-lg',
};

const statusColors = {
  ONLINE: 'bg-green-400',
  AWAY: 'bg-yellow-400',
  OFFLINE: 'bg-gray-300',
};

const statusSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
};

export default function Avatar({ name, src, size = 'md', status, className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const bgColor = getColorFromName(name);

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white overflow-hidden`}
        style={{ backgroundColor: src ? undefined : bgColor }}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      {status && (
        <span
          className={`absolute bottom-0 right-0 ${statusSizes[size]} ${statusColors[status]} rounded-full border-2 border-white`}
        />
      )}
    </div>
  );
}
