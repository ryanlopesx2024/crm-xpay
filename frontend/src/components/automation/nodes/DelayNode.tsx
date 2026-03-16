import { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock } from 'lucide-react';
import NodeActions from './NodeActions';
import NodeAddBelow from './NodeAddBelow';

const UNIT_LABEL: Record<string, string> = {
  MINUTES: 'minuto(s)',
  HOURS:   'hora(s)',
  DAYS:    'dia(s)',
};

export default function DelayNode({ id, data, selected }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  const delay = nodeData.delay as number;
  const unit = (nodeData.unit as string) || 'HOURS';
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <NodeActions nodeId={id} />
      <div
        className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm w-[200px] overflow-hidden transition-all duration-200 ${
          selected
            ? 'border-slate-400 shadow-slate-100 shadow-md'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:shadow-md'
        }`}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-slate-300 !border-2 !border-white"
        />

        {/* Header */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Clock size={14} className="text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Aguardar</p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500">Atraso de tempo</p>
          </div>
        </div>

        {/* Delay info */}
        {delay !== undefined && (
          <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none">
              {delay} <span className="text-xs font-normal text-slate-500">{UNIT_LABEL[unit] || unit}</span>
            </p>
          </div>
        )}

        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-slate-300 !border-2 !border-white"
        />
      </div>
      <NodeAddBelow nodeId={id} show={hovered} />
    </div>
  );
}
