import { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap, Tag, MessageSquare, DollarSign, Clock } from 'lucide-react';
import NodeActions from './NodeActions';
import NodeAddBelow from './NodeAddBelow';

const TRIGGER_CONFIG: Record<string, { icon: typeof Zap; label: string; iconColor: string; iconBg: string }> = {
  LEAD_CREATED:      { icon: Zap,           label: 'Lead Criado',         iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  TAG_ADDED:         { icon: Tag,           label: 'Tag Adicionada',       iconColor: 'text-blue-600',    iconBg: 'bg-blue-100'    },
  MESSAGE_RECEIVED:  { icon: MessageSquare, label: 'Mensagem Recebida',    iconColor: 'text-violet-600',  iconBg: 'bg-violet-100'  },
  DEAL_WON:          { icon: DollarSign,    label: 'Negócio Ganho',        iconColor: 'text-amber-600',   iconBg: 'bg-amber-100'   },
  DEAL_LOST:         { icon: DollarSign,    label: 'Negócio Perdido',      iconColor: 'text-red-600',     iconBg: 'bg-red-100'     },
  TIME_ELAPSED:      { icon: Clock,         label: 'Tempo Decorrido',      iconColor: 'text-slate-600',   iconBg: 'bg-slate-100'   },
  SCHEDULED:         { icon: Clock,         label: 'Agendado',             iconColor: 'text-indigo-600',  iconBg: 'bg-indigo-100'  },
};

export default function TriggerNode({ id, data, selected }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  const label = (nodeData.label as string) || 'Gatilho';
  const type = nodeData.type as string;
  const [hovered, setHovered] = useState(false);

  const cfg = TRIGGER_CONFIG[type] || { icon: Zap, label, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100' };
  const Icon = cfg.icon;

  return (
    <div
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <NodeActions nodeId={id} />
      <div
        className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm w-[220px] overflow-hidden transition-all duration-200 ${
          selected
            ? 'border-emerald-400 shadow-emerald-100 shadow-md'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:shadow-md'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className={`w-8 h-8 ${cfg.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <Icon size={14} className={cfg.iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{cfg.label}</p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500">Gatilho de início</p>
          </div>
        </div>

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
