import { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageCircle, Clock } from 'lucide-react';
import NodeActions from './NodeActions';
import NodeAddBelow from './NodeAddBelow';

export default function UserInputNode({ id, data, selected }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  const timeout = (nodeData.timeout as number) || 5;
  const timeoutUnit = (nodeData.timeoutUnit as string) || 'MINUTES';
  const question = (nodeData.question as string) || '';
  const [hovered, setHovered] = useState(false);

  const unitLabel =
    timeoutUnit === 'SECONDS' ? 's'
    : timeoutUnit === 'HOURS' ? 'h'
    : 'min';

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
            ? 'border-violet-400 shadow-violet-100 shadow-md'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:shadow-md'
        }`}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-slate-300 !border-2 !border-white"
        />

        {/* Header */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
          <div className="w-8 h-8 bg-violet-100 dark:bg-violet-800/40 rounded-lg flex items-center justify-center flex-shrink-0">
            <MessageCircle size={14} className="text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Entrada do Usuário</p>
            <p className="text-[9px] text-violet-500 font-medium">Aguarda resposta do contato</p>
          </div>
        </div>

        {/* Question preview */}
        <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700">
          {question ? (
            <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {question}
            </p>
          ) : (
            <p className="text-[10px] text-slate-400 italic">Clique para configurar pergunta...</p>
          )}
        </div>

        {/* Timeout */}
        <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-1.5">
          <Clock size={10} className="text-slate-400 flex-shrink-0" />
          <span className="text-[9px] text-slate-400">Timeout:</span>
          <span className="text-[9px] font-semibold text-amber-600">{timeout} {unitLabel}</span>
          <span className="text-[9px] text-slate-400 ml-auto">sem resposta → vermelho</span>
        </div>

        {/* Output handle labels */}
        <div className="px-3 pb-3 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-end relative">
          <div className="flex flex-col items-center gap-0.5" style={{ width: '45%' }}>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <span className="text-[9px] text-blue-600 font-semibold">Respondeu</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5" style={{ width: '45%' }}>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-red-500 font-semibold">Sem resposta</span>
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            </div>
          </div>

          {/* Left output: responded (blue) */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="responded"
            style={{ left: '28%', bottom: -6 }}
            className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
          />
          {/* Right output: timeout (red) */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="timeout"
            style={{ left: '72%', bottom: -6 }}
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-white"
          />
        </div>
      </div>
      <NodeAddBelow nodeId={id} show={hovered} />
    </div>
  );
}
