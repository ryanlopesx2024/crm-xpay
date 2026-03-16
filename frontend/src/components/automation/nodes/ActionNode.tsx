import { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare, Tag, User, Play, Mail, Globe, Filter, ArrowRight, Zap, AlignLeft, MessageCircle, Clock, Mic, Paperclip, Link2 } from 'lucide-react';
import NodeActions from './NodeActions';
import NodeAddBelow from './NodeAddBelow';

interface ContentItem { id: string; type: string; text?: string; placeholder?: string; delay?: number; unit?: string; url?: string; label?: string }

const CONTENT_ICON: Record<string, { icon: typeof AlignLeft; color: string }> = {
  text:        { icon: AlignLeft,     color: 'text-blue-500'    },
  user_input:  { icon: MessageCircle, color: 'text-violet-500'  },
  delay:       { icon: Clock,         color: 'text-amber-500'   },
  audio:       { icon: Mic,           color: 'text-emerald-500' },
  attachment:  { icon: Paperclip,     color: 'text-slate-500'   },
  dynamic_url: { icon: Link2,         color: 'text-indigo-500'  },
};

const ACTION_CONFIG: Record<string, {
  icon: typeof MessageSquare;
  label: string;
  iconColor: string;
  iconBg: string;
}> = {
  SEND_MESSAGE:  { icon: MessageSquare, label: 'Mensagem',        iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  ADD_TAG:       { icon: Tag,           label: 'Adicionar Tag',   iconColor: 'text-blue-600',    iconBg: 'bg-blue-100'    },
  REMOVE_TAG:    { icon: Tag,           label: 'Remover Tag',     iconColor: 'text-red-600',     iconBg: 'bg-red-100'     },
  ASSIGN_AGENT:  { icon: User,          label: 'Atribuir',        iconColor: 'text-violet-600',  iconBg: 'bg-violet-100'  },
  MOVE_PIPELINE: { icon: ArrowRight,    label: 'Mover Pipeline',  iconColor: 'text-indigo-600',  iconBg: 'bg-indigo-100'  },
  CREATE_DEAL:   { icon: Zap,           label: 'Criar Negócio',   iconColor: 'text-orange-600',  iconBg: 'bg-orange-100'  },
  FILTER_LEADS:  { icon: Filter,        label: 'Filtrar Leads',   iconColor: 'text-slate-600',   iconBg: 'bg-slate-100'   },
  SEND_EMAIL:    { icon: Mail,          label: 'Enviar E-mail',   iconColor: 'text-sky-600',     iconBg: 'bg-sky-100'     },
  HTTP_REQUEST:  { icon: Globe,         label: 'Webhook HTTP',    iconColor: 'text-amber-600',   iconBg: 'bg-amber-100'   },
};

/** Renders message text, turning {variable} tokens into blue highlight pills */
function MessagePreview({ text }: { text: string }) {
  const parts = text.split(/(\{[^}]+\})/g);
  return (
    <p className="text-[10px] text-slate-600 leading-relaxed break-words" style={{ display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
      {parts.map((part, i) =>
        /^\{[^}]+\}$/.test(part) ? (
          <span
            key={i}
            className="inline-block bg-blue-100 text-blue-600 rounded px-1 py-px text-[9px] font-semibold mx-px align-middle"
          >
            {part.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

export default function ActionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  const action = (nodeData.action as string) || '';
  const message = nodeData.message as string | undefined;
  const tag = nodeData.tag as string | undefined;
  const [hovered, setHovered] = useState(false);

  const cfg = ACTION_CONFIG[action] || { icon: Play, label: (nodeData.label as string) || 'Ação', iconColor: 'text-slate-600', iconBg: 'bg-slate-100' };
  const Icon = cfg.icon;

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
            ? 'border-emerald-400 shadow-emerald-100 shadow-md'
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
          <div className={`w-8 h-8 ${cfg.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <Icon size={14} className={cfg.iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{cfg.label}</p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500">Ação</p>
          </div>
        </div>

        {/* Content area */}
        {action === 'SEND_MESSAGE' ? (() => {
          const contents = Array.isArray(nodeData.contents) ? (nodeData.contents as ContentItem[]) : [];
          if (contents.length > 0) {
            return (
              <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                {contents.slice(0, 4).map((item) => {
                  const ic = CONTENT_ICON[item.type] || CONTENT_ICON.text;
                  const ItemIcon = ic.icon;
                  const preview =
                    item.type === 'text' ? item.text
                    : item.type === 'user_input' ? (item.placeholder || 'Aguarda resposta')
                    : item.type === 'delay' ? `${item.delay ?? 1} ${item.unit === 'SECONDS' ? 's' : item.unit === 'MINUTES' ? 'min' : 'h'}`
                    : item.url || item.label || '';
                  return (
                    <div key={item.id} className="flex items-start gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700/40">
                      <ItemIcon size={11} className={`${ic.color} mt-0.5 flex-shrink-0`} />
                      {item.type === 'text' && preview ? (
                        <MessagePreview text={String(preview)} />
                      ) : (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{String(preview)}</p>
                      )}
                    </div>
                  );
                })}
                {contents.length > 4 && (
                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700/40">
                    <p className="text-[9px] text-slate-400">+{contents.length - 4} mais elemento(s)</p>
                  </div>
                )}
              </div>
            );
          }
          return (
            <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700">
              <p className="text-[10px] text-slate-400 italic">Clique para configurar</p>
            </div>
          );
        })() : action === 'ADD_TAG' || action === 'REMOVE_TAG' ? (
          tag ? (
            <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700">
              <span className="inline-block bg-blue-50 text-blue-600 text-[10px] font-medium rounded-full px-2 py-0.5">{tag}</span>
            </div>
          ) : (
            <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700">
              <p className="text-[10px] text-slate-400 italic">Clique para configurar</p>
            </div>
          )
        ) : (
          <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700">
            <p className="text-[10px] text-slate-400 italic">Clique para configurar</p>
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
