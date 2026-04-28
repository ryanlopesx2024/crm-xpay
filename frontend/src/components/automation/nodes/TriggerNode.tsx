import { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap, Tag, MessageSquare, DollarSign, Clock, ArrowRight, Repeat, CheckCircle } from 'lucide-react';
import NodeActions from './NodeActions';
import NodeAddBelow from './NodeAddBelow';

const TRIGGER_CONFIG: Record<string, { icon: typeof Zap; label: string; iconColor: string; iconBg: string }> = {
  LEAD_CREATED:      { icon: Zap,           label: 'Lead Criado',       iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  TAG_ADDED:         { icon: Tag,           label: 'Tag Adicionada',     iconColor: 'text-blue-600',    iconBg: 'bg-blue-100'    },
  MESSAGE_RECEIVED:  { icon: MessageSquare, label: 'Mensagem Recebida',  iconColor: 'text-violet-600',  iconBg: 'bg-violet-100'  },
  DEAL_WON:          { icon: DollarSign,    label: 'Negócio Ganho',      iconColor: 'text-amber-600',   iconBg: 'bg-amber-100'   },
  DEAL_LOST:         { icon: DollarSign,    label: 'Negócio Perdido',    iconColor: 'text-red-600',     iconBg: 'bg-red-100'     },
  TIME_ELAPSED:      { icon: Clock,         label: 'Tempo Decorrido',    iconColor: 'text-slate-600',   iconBg: 'bg-slate-100'   },
  SCHEDULED:         { icon: Clock,         label: 'Agendado',           iconColor: 'text-indigo-600',  iconBg: 'bg-indigo-100'  },
};

export default function TriggerNode({ id, data, selected }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  const customLabel    = nodeData.label as string | undefined;
  const type           = nodeData.type as string;
  const tagName        = nodeData.tagName as string | undefined;
  const pipelineName   = nodeData.pipelineName as string | undefined;
  const stageName      = nodeData.stageName as string | undefined;
  const connectionName = nodeData.connectionName as string | undefined;
  const frequency      = (nodeData.frequency as string) || 'ONCE_PER_LEAD';
  const [hovered, setHovered] = useState(false);

  const cfg = TRIGGER_CONFIG[type] || { icon: Zap, label: customLabel || 'Gatilho', iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100' };
  const Icon = cfg.icon;

  const renderPreview = () => {
    if (type === 'TAG_ADDED' && tagName) {
      return <span className="inline-block bg-blue-50 text-blue-600 text-[10px] font-medium rounded-full px-2 py-0.5">{tagName}</span>;
    }
    if (type === 'MESSAGE_RECEIVED') {
      const FreqIcon = frequency === 'ALWAYS' ? Repeat : CheckCircle;
      const freqLabel = frequency === 'ALWAYS' ? 'Sempre' : 'Uma vez por lead';
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <MessageSquare size={10} className="text-violet-400 flex-shrink-0" />
            <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate">
              {connectionName || <span className="italic text-slate-400">Qualquer instância</span>}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <FreqIcon size={10} className={frequency === 'ALWAYS' ? 'text-amber-400 flex-shrink-0' : 'text-emerald-400 flex-shrink-0'} />
            <p className={`text-[10px] font-medium ${frequency === 'ALWAYS' ? 'text-amber-600' : 'text-emerald-600'}`}>{freqLabel}</p>
          </div>
        </div>
      );
    }
    if ((type === 'DEAL_WON' || type === 'DEAL_LOST') && pipelineName) {
      return (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-amber-600 font-medium">{pipelineName}</span>
          {stageName && <><ArrowRight size={9} className="text-slate-400" /><span className="text-[10px] text-slate-500">{stageName}</span></>}
        </div>
      );
    }
    if (customLabel) {
      return <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{customLabel}</p>;
    }
    return <p className="text-[10px] text-slate-400 italic">Clique para configurar</p>;
  };

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
          <p className="flex-1 min-w-0 text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{cfg.label}</p>
        </div>

        {/* Preview */}
        <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700">
          {renderPreview()}
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
