import { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  MessageSquare, Tag, User, Play, Mail, Globe, Filter, ArrowRight, Zap,
  AlignLeft, MessageCircle, Clock, Mic, Paperclip, Link2,
  Briefcase, Trophy, TrendingDown, TrendingUp, DollarSign,
  UserCheck, List, ListX, ShoppingCart, Package,
} from 'lucide-react';
import NodeActions from './NodeActions';
import NodeAddBelow from './NodeAddBelow';

interface ContentItem {
  id: string; type: string; text?: string; placeholder?: string;
  delay?: number; unit?: string; timeout?: number; timeoutUnit?: string;
  url?: string; filename?: string; mimeType?: string; label?: string;
}

const CONTENT_ICON: Record<string, { icon: typeof AlignLeft; color: string; bg: string }> = {
  text:        { icon: AlignLeft,     color: 'text-blue-500',    bg: 'bg-blue-50'    },
  user_input:  { icon: MessageCircle, color: 'text-violet-500',  bg: 'bg-violet-50'  },
  delay:       { icon: Clock,         color: 'text-amber-500',   bg: 'bg-amber-50'   },
  audio:       { icon: Mic,           color: 'text-emerald-500', bg: 'bg-emerald-50' },
  attachment:  { icon: Paperclip,     color: 'text-slate-500',   bg: 'bg-slate-50'   },
  dynamic_url: { icon: Link2,         color: 'text-indigo-500',  bg: 'bg-indigo-50'  },
};

function ContentPreview({ item }: { item: ContentItem }) {
  const mime = item.mimeType || '';
  const isImage = mime.startsWith('image/') || !!(item.url || '').match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i);
  const isAudio = item.type === 'audio' || mime.startsWith('audio/');
  const isVideo = mime.startsWith('video/') || !!(item.url || '').match(/\.(mp4|mov|webm)(\?|$)/i);

  if (item.type === 'text') {
    if (!item.text) return <p className="text-[10px] text-slate-400 italic">Sem texto</p>;
    const parts = item.text.split(/(\{[^}]+\})/g);
    return (
      <p className="text-[10px] text-slate-600 leading-relaxed break-words" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {parts.map((p, i) => /^\{[^}]+\}$/.test(p)
          ? <span key={i} className="inline-block bg-blue-100 text-blue-600 rounded px-1 py-px text-[9px] font-semibold mx-px align-middle">{p.slice(1,-1)}</span>
          : <span key={i}>{p}</span>
        )}
      </p>
    );
  }

  if (item.type === 'user_input') {
    const tUnit = item.timeoutUnit === 'HOURS' ? 'h' : item.timeoutUnit === 'DAYS' ? 'd' : 'min';
    const tVal = item.timeout ?? 5;
    return (
      <div>
        <p className="text-[10px] text-violet-500 italic">{item.placeholder || item.text || 'Aguarda resposta do usuário'}</p>
        <p className="text-[9px] text-amber-500 mt-0.5">⏱ timeout: {tVal}{tUnit}</p>
      </div>
    );
  }

  if (item.type === 'delay') {
    const u = item.unit === 'MINUTES' ? 'min' : item.unit === 'HOURS' ? 'h' : 's';
    return <p className="text-[10px] text-amber-600 font-medium">⏱ {item.delay ?? 1}{u}</p>;
  }

  if (isImage && item.url) {
    return (
      <div className="relative w-full rounded-lg overflow-hidden bg-slate-100" style={{ paddingTop: '56%' }}>
        <img src={item.url} alt={item.filename || 'imagem'} className="absolute inset-0 w-full h-full object-cover" />
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-2 py-1.5">
        <Mic size={13} className="text-emerald-500 flex-shrink-0" />
        <div className="flex gap-0.5 items-center flex-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-emerald-400 rounded-full w-0.5" style={{ height: `${6 + Math.sin(i * 1.3) * 4}px` }} />
          ))}
        </div>
        <p className="text-[9px] text-emerald-600 truncate max-w-[80px]">{item.filename || 'áudio'}</p>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-2 py-1.5">
        <Play size={13} className="text-slate-500 flex-shrink-0" />
        <p className="text-[10px] text-slate-600 truncate">{item.filename || 'vídeo'}</p>
      </div>
    );
  }

  if (item.url || item.filename) {
    return (
      <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1.5">
        <Paperclip size={12} className="text-slate-400 flex-shrink-0" />
        <p className="text-[10px] text-slate-500 truncate">{item.filename || 'arquivo'}</p>
      </div>
    );
  }

  return <p className="text-[10px] text-slate-400 italic">Sem arquivo</p>;
}

const ACTION_CONFIG: Record<string, {
  icon: typeof MessageSquare;
  label: string;
  iconColor: string;
  iconBg: string;
}> = {
  // Ações gerais
  SEND_MESSAGE:        { icon: MessageSquare, label: 'Mensagem',            iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  ADD_TAG:             { icon: Tag,           label: 'Adicionar Tag',       iconColor: 'text-blue-600',    iconBg: 'bg-blue-100'    },
  REMOVE_TAG:          { icon: Tag,           label: 'Remover Tag',         iconColor: 'text-red-600',     iconBg: 'bg-red-100'     },
  ASSIGN_AGENT:        { icon: User,          label: 'Atribuir',            iconColor: 'text-violet-600',  iconBg: 'bg-violet-100'  },
  MOVE_PIPELINE:       { icon: ArrowRight,    label: 'Mover Pipeline',      iconColor: 'text-indigo-600',  iconBg: 'bg-indigo-100'  },
  FILTER_LEADS:        { icon: Filter,        label: 'Filtrar Leads',       iconColor: 'text-slate-600',   iconBg: 'bg-slate-100'   },
  SEND_EMAIL:          { icon: Mail,          label: 'Enviar E-mail',       iconColor: 'text-sky-600',     iconBg: 'bg-sky-100'     },
  HTTP_REQUEST:        { icon: Globe,         label: 'Webhook HTTP',        iconColor: 'text-amber-600',   iconBg: 'bg-amber-100'   },
  // Negócio
  CREATE_DEAL:         { icon: Briefcase,     label: 'Criar Negócio',       iconColor: 'text-orange-600',  iconBg: 'bg-orange-100'  },
  MARK_DEAL_WON:       { icon: Trophy,        label: 'Marcar como Ganho',   iconColor: 'text-green-600',   iconBg: 'bg-green-100'   },
  MARK_DEAL_LOST:      { icon: TrendingDown,  label: 'Marcar como Perdido', iconColor: 'text-red-600',     iconBg: 'bg-red-100'     },
  MOVE_DEAL_STAGE:     { icon: TrendingUp,    label: 'Mover Etapa',         iconColor: 'text-amber-600',   iconBg: 'bg-amber-100'   },
  UPDATE_DEAL:         { icon: DollarSign,    label: 'Atualizar Negócio',   iconColor: 'text-orange-600',  iconBg: 'bg-orange-100'  },
  // Lead
  UPDATE_LEAD:         { icon: UserCheck,     label: 'Atualizar Lead',      iconColor: 'text-sky-600',     iconBg: 'bg-sky-100'     },
  ADD_TO_LIST:         { icon: List,          label: 'Adicionar à Lista',   iconColor: 'text-sky-600',     iconBg: 'bg-sky-100'     },
  REMOVE_FROM_LIST:    { icon: ListX,         label: 'Remover da Lista',    iconColor: 'text-red-600',     iconBg: 'bg-red-100'     },
  // Produto
  ADD_PRODUCT_TO_DEAL: { icon: ShoppingCart,  label: 'Adicionar Produto',   iconColor: 'text-purple-600',  iconBg: 'bg-purple-100'  },
  REMOVE_PRODUCT:      { icon: Package,       label: 'Remover Produto',     iconColor: 'text-slate-600',   iconBg: 'bg-slate-100'   },
};

function PreviewArea({ action, nodeData }: { action: string; nodeData: Record<string, unknown> }) {
  const tag          = nodeData.tag as string | undefined || nodeData.tagName as string | undefined;
  const agentName    = nodeData.agentName as string | undefined;
  const pipelineName = nodeData.pipelineName as string | undefined;
  const stageName    = nodeData.stageName as string | undefined;
  const url          = nodeData.url as string | undefined;
  const method       = (nodeData.method as string | undefined) || 'POST';

  if (action === 'SEND_MESSAGE') {
    const contents = Array.isArray(nodeData.contents)
      ? (nodeData.contents as ContentItem[])
      : Array.isArray(nodeData.items) ? (nodeData.items as ContentItem[]) : [];
    const visible = contents.filter(c => c.type !== 'delay').slice(0, 4);
    if (visible.length > 0) {
      return (
        <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
          {visible.map((item) => {
            const ic = CONTENT_ICON[item.type] || CONTENT_ICON.text;
            const ItemIcon = ic.icon;
            const typeLabel = item.type === 'text' ? 'Texto'
              : item.type === 'user_input' ? 'Entrada'
              : item.type === 'audio' ? 'Áudio'
              : item.type === 'attachment' ? 'Arquivo'
              : item.type;
            return (
              <div key={item.id} className="px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`w-4 h-4 ${ic.bg} rounded flex items-center justify-center flex-shrink-0`}>
                    <ItemIcon size={9} className={ic.color} />
                  </div>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">{typeLabel}</span>
                </div>
                <ContentPreview item={item} />
              </div>
            );
          })}
          {contents.filter(c => c.type !== 'delay').length > 4 && (
            <div className="px-3 py-1.5">
              <p className="text-[9px] text-slate-400">+{contents.filter(c => c.type !== 'delay').length - 4} mais elemento(s)</p>
            </div>
          )}
        </div>
      );
    }
    return <EmptyPreview />;
  }

  if (action === 'ADD_TAG' || action === 'REMOVE_TAG') {
    return tag ? (
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700">
        <span className="inline-block bg-blue-50 text-blue-600 text-[10px] font-medium rounded-full px-2 py-0.5">{tag}</span>
      </div>
    ) : <EmptyPreview />;
  }

  if (action === 'ASSIGN_AGENT') {
    return agentName ? (
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={9} className="text-violet-500" />
          </div>
          <p className="text-[10px] text-violet-600 font-medium truncate">{agentName}</p>
        </div>
      </div>
    ) : <EmptyPreview />;
  }

  if (action === 'MOVE_PIPELINE') {
    return pipelineName ? (
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-indigo-600 font-medium">{pipelineName}</span>
          {stageName && (
            <>
              <ArrowRight size={9} className="text-slate-400" />
              <span className="text-[10px] text-slate-500">{stageName}</span>
            </>
          )}
        </div>
      </div>
    ) : <EmptyPreview />;
  }

  if (action === 'HTTP_REQUEST') {
    return url ? (
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-1.5">
          <span className="bg-amber-100 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0">{method}</span>
          <p className="text-[10px] text-slate-500 truncate">{url}</p>
        </div>
      </div>
    ) : <EmptyPreview />;
  }

  return <EmptyPreview />;
}

function EmptyPreview() {
  return (
    <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700">
      <p className="text-[10px] text-slate-400 italic">Clique para configurar</p>
    </div>
  );
}

export default function ActionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  const action = (nodeData.action as string) || '';
  const [hovered, setHovered] = useState(false);

  const cfg = ACTION_CONFIG[action] || { icon: Play, label: (nodeData.label as string) || 'Ação', iconColor: 'text-slate-600', iconBg: 'bg-slate-100' };
  const Icon = cfg.icon;

  const contents = Array.isArray(nodeData.contents)
    ? (nodeData.contents as ContentItem[])
    : Array.isArray(nodeData.items) ? (nodeData.items as ContentItem[]) : [];
  const hasUserInput = action === 'SEND_MESSAGE' && contents.some(c => c.type === 'user_input');

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
          <p className="flex-1 min-w-0 text-xs font-semibold text-slate-700 dark:text-slate-200">{cfg.label}</p>
        </div>

        <PreviewArea action={action} nodeData={nodeData} />

        {hasUserInput ? (
          <div className="border-t border-slate-100 dark:border-slate-700">
            <div className="relative flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-700">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium flex-1 pr-4 leading-tight">
                Respondeu
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id="responded"
                className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
              />
              <NodeAddBelow nodeId={id} sourceHandle="responded" side="right" show={hovered} />
            </div>
            <div className="relative flex items-center gap-2 px-3 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium flex-1 pr-4 leading-tight">
                Sem resposta (timeout)
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id="timeout"
                className="!w-3 !h-3 !bg-red-500 !border-2 !border-white"
              />
              <NodeAddBelow nodeId={id} sourceHandle="timeout" side="right" show={hovered} />
            </div>
          </div>
        ) : (
          <Handle
            type="source"
            position={Position.Bottom}
            className="!w-3 !h-3 !bg-slate-300 !border-2 !border-white"
          />
        )}
      </div>
      <NodeAddBelow nodeId={id} show={hovered} />
    </div>
  );
}
