import { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import NodeActions from './NodeActions';
import NodeAddBelow from './NodeAddBelow';

const FIELD_LABELS: Record<string, string> = {
  tag:             'Tag',
  source:          'Origem',
  deal_value:      'Valor negócio',
  message_content: 'Mensagem',
};

const OP_LABELS: Record<string, string> = {
  equals:       '=',
  contains:     '⊃',
  greater_than: '>',
  less_than:    '<',
  exists:       'existe',
};

export default function ConditionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  const label    = (nodeData.label as string) || 'Condição';
  const field    = nodeData.field as string | undefined;
  const operator = (nodeData.operator as string) || 'equals';
  const value    = nodeData.value as string | undefined;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <NodeActions nodeId={id} />
      <div
        className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm w-[260px] overflow-hidden transition-all duration-200 ${
          selected
            ? 'border-amber-400 shadow-amber-100 shadow-md'
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
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <GitBranch size={14} className="text-amber-600" />
          </div>
          <p className="flex-1 min-w-0 text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{label}</p>
        </div>

        {/* Condition preview */}
        <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700">
          {field ? (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="bg-amber-50 text-amber-700 text-[9px] font-semibold px-1.5 py-0.5 rounded">
                {FIELD_LABELS[field] || field}
              </span>
              <span className="text-[9px] text-slate-400 font-mono">{OP_LABELS[operator] || operator}</span>
              {value && operator !== 'exists' && (
                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-medium px-1.5 py-0.5 rounded truncate max-w-[90px]">
                  {value}
                </span>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 italic">Clique para configurar</p>
          )}
        </div>

        {/* Output branches */}
        <div className="border-t border-slate-100 dark:border-slate-700">
          <div className="relative flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-700">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium flex-1 pr-4 leading-tight">
              Todas as condições verdadeiras
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="yes"
              className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
            />
            <NodeAddBelow nodeId={id} sourceHandle="yes" side="right" show={hovered} />
          </div>

          <div className="relative flex items-center gap-2 px-3 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium flex-1 pr-4 leading-tight">
              Quando não atender as condições
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="no"
              className="!w-3 !h-3 !bg-red-500 !border-2 !border-white"
            />
            <NodeAddBelow nodeId={id} sourceHandle="no" side="right" show={hovered} />
          </div>
        </div>
      </div>
    </div>
  );
}
