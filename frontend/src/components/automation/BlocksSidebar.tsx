import React from 'react';
import { Zap, GitBranch, Clock, MessageSquare, Tag, User, DollarSign, Globe, Layers, ArrowRight, Filter } from 'lucide-react';

interface Block {
  type: string;
  nodeType: string;
  label: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  data: Record<string, unknown>;
}

const blockCategories = [
  {
    name: 'Gatilhos',
    blocks: [
      { type: 'trigger', nodeType: 'trigger', label: 'Lead Criado',      description: 'Quando um lead é criado',     icon: Zap,           iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100', data: { type: 'LEAD_CREATED',     label: 'Lead Criado'         } },
      { type: 'trigger', nodeType: 'trigger', label: 'Tag Adicionada',   description: 'Quando uma tag é aplicada',   icon: Tag,           iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100', data: { type: 'TAG_ADDED',        label: 'Tag Adicionada'      } },
      { type: 'trigger', nodeType: 'trigger', label: 'Mensagem Recebida',description: 'Ao receber uma mensagem',     icon: MessageSquare, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100', data: { type: 'MESSAGE_RECEIVED', label: 'Mensagem Recebida'   } },
      { type: 'trigger', nodeType: 'trigger', label: 'Negócio Ganho',    description: 'Quando um deal é fechado',   icon: DollarSign,    iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100', data: { type: 'DEAL_WON',         label: 'Negócio Ganho'       } },
    ],
  },
  {
    name: 'Ações',
    blocks: [
      { type: 'action', nodeType: 'action', label: 'Enviar Mensagem',   description: 'Envia texto ou mídia',        icon: MessageSquare, iconColor: 'text-blue-600',    iconBg: 'bg-blue-100',    data: { action: 'SEND_MESSAGE',  label: 'Enviar Mensagem'     } },
      { type: 'action', nodeType: 'action', label: 'Adicionar Tag',     description: 'Aplica uma tag ao lead',      icon: Tag,           iconColor: 'text-violet-600',  iconBg: 'bg-violet-100',  data: { action: 'ADD_TAG',       label: 'Adicionar Tag'       } },
      { type: 'action', nodeType: 'action', label: 'Atribuir Atendente',description: 'Atribui a um agente',         icon: User,          iconColor: 'text-indigo-600',  iconBg: 'bg-indigo-100',  data: { action: 'ASSIGN_AGENT',  label: 'Atribuir Atendente'  } },
      { type: 'action', nodeType: 'action', label: 'Mover Pipeline',    description: 'Move o lead de etapa',        icon: ArrowRight,    iconColor: 'text-orange-600',  iconBg: 'bg-orange-100',  data: { action: 'MOVE_PIPELINE', label: 'Mover Pipeline'      } },
      { type: 'action', nodeType: 'action', label: 'Filtrar Leads',     description: 'Filtra com critérios',        icon: Filter,        iconColor: 'text-slate-600',   iconBg: 'bg-slate-100',   data: { action: 'FILTER_LEADS',  label: 'Filtrar Leads'       } },
      { type: 'action', nodeType: 'action', label: 'Webhook HTTP',      description: 'Chama uma URL externa',       icon: Globe,         iconColor: 'text-amber-600',   iconBg: 'bg-amber-100',   data: { action: 'HTTP_REQUEST',  label: 'Webhook HTTP'        } },
    ],
  },
  {
    name: 'Condições',
    blocks: [
      { type: 'condition', nodeType: 'condition', label: 'Se/Então',    description: 'Ramifica o fluxo',            icon: GitBranch,     iconColor: 'text-amber-600',   iconBg: 'bg-amber-100',   data: { condition: 'IF_THEN',    label: 'Se/Então'            } },
    ],
  },
  {
    name: 'Temporizadores',
    blocks: [
      { type: 'delay', nodeType: 'delay',     label: 'Aguardar Tempo',  description: 'Pausa antes de continuar',    icon: Clock,         iconColor: 'text-slate-600',   iconBg: 'bg-slate-100',   data: { delay: 1, unit: 'HOURS', label: 'Aguardar 1 hora'     } },
    ],
  },
  {
    name: 'Organização',
    blocks: [
      { type: 'group',   nodeType: 'group',   label: 'Grupo',           description: 'Agrupa blocos visualmente',   icon: Layers,        iconColor: 'text-purple-600',  iconBg: 'bg-purple-100',  data: { label: 'Grupo'                                        } },
    ],
  },
];

interface BlocksSidebarProps {
  onAddNode: (type: string, data: Record<string, unknown>) => void;
}

export default function BlocksSidebar({ onAddNode }: BlocksSidebarProps) {
  const onDragStart = (event: React.DragEvent, block: Block) => {
    event.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify({ nodeType: block.nodeType, data: block.data })
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-56 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Blocos</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Clique ou arraste para o canvas</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {blockCategories.map((cat) => (
          <div key={cat.name}>
            {/* Category header */}
            <div className="px-4 pt-4 pb-1.5">
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {cat.name}
              </p>
            </div>

            {/* Block items */}
            {cat.blocks.map((block) => {
              const Icon = block.icon;
              return (
                <button
                  key={block.label}
                  onClick={() => onAddNode(block.nodeType, block.data)}
                  draggable
                  onDragStart={(e) => onDragStart(e, block as Block)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-left cursor-grab active:cursor-grabbing border-b border-slate-100 dark:border-slate-700/50 last:border-b-0"
                >
                  <div className={`w-8 h-8 ${block.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon size={14} className={block.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{block.label}</p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{block.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
