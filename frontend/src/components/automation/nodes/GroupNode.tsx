import React from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { Layers } from 'lucide-react';
import NodeActions from './NodeActions';

export default function GroupNode({ id, data, selected }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  const label = (nodeData.label as string) || 'Grupo';

  return (
    <div
      className={`group relative w-full h-full rounded-2xl border-2 border-dashed transition-colors ${
        selected
          ? 'border-purple-400 bg-purple-50/40 dark:bg-purple-900/10'
          : 'border-slate-300 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-800/30'
      }`}
    >
      <NodeResizer
        minWidth={220}
        minHeight={160}
        isVisible={selected}
        lineClassName="!border-purple-400"
        handleClassName="!w-2.5 !h-2.5 !bg-purple-400 !border-2 !border-white !rounded-sm"
      />
      <NodeActions nodeId={id} />

      {/* Label at top-left */}
      <div className="absolute top-2 left-3 flex items-center gap-1.5 pointer-events-none">
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
            selected ? 'bg-purple-500' : 'bg-slate-400 dark:bg-slate-500'
          }`}
        >
          <Layers size={11} className="text-white" />
        </div>
        <span
          className={`text-[11px] font-semibold ${
            selected ? 'text-purple-700 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
