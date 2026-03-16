import React from 'react';
import { X } from 'lucide-react';

interface TagPillProps {
  name: string;
  color?: string;
  onRemove?: () => void;
  small?: boolean;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

export default function TagPill({ name, color = '#3b82f6', onRemove, small = false }: TagPillProps) {
  const rgb = hexToRgb(color);
  const bgColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)` : `${color}20`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${
        small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
      }`}
      style={{ backgroundColor: bgColor, color }}
    >
      {name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:opacity-70 transition-opacity"
          type="button"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
