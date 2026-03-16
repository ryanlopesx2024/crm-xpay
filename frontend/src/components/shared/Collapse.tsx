import React, { useState, ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapseProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
}

export default function Collapse({ title, children, defaultOpen = false, icon }: CollapseProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-400">{icon}</span>}
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown size={16} className="text-slate-400" />
        ) : (
          <ChevronRight size={16} className="text-slate-400" />
        )}
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
}
