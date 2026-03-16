import { useState, useEffect, useRef } from 'react';
import { Plus, Play, GitBranch, Clock, Layers, MessageSquare, Tag, User } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

const QUICK_BLOCKS = [
  { type: 'action', label: 'Mensagem',  icon: MessageSquare, color: '#00A34D', data: { action: 'SEND_MESSAGE',  label: 'Enviar Mensagem' } },
  { type: 'action', label: 'Tag',       icon: Tag,           color: '#00A34D', data: { action: 'ADD_TAG',       label: 'Adicionar Tag' } },
  { type: 'action', label: 'Atribuir',  icon: User,          color: '#00A34D', data: { action: 'ASSIGN_AGENT',  label: 'Atribuir Atendente' } },
  { type: 'action', label: 'Ação',      icon: Play,          color: '#00A34D', data: { action: 'SEND_MESSAGE',  label: 'Ação' } },
  { type: 'condition', label: 'Condição', icon: GitBranch,   color: '#f59e0b', data: { condition: 'IF_THEN',   label: 'Condição' } },
  { type: 'delay',  label: 'Aguardar',  icon: Clock,         color: '#6b7280', data: { delay: 1, unit: 'HOURS', label: 'Aguardar 1 hora' } },
  { type: 'group',  label: 'Grupo',     icon: Layers,        color: '#8b5cf6', data: { label: 'Grupo' } },
];

interface NodeAddBelowProps {
  nodeId: string;
  sourceHandle?: string;
  /** 'bottom' = default (top-to-bottom flow), 'right' = for side handles (left-to-right flow) */
  side?: 'bottom' | 'right';
  /** percentage string for vertical offset when side='right', e.g. '32%' */
  topOffset?: string;
  /** controlled visibility — bypasses group-hover when provided */
  show?: boolean;
}

export default function NodeAddBelow({ nodeId, sourceHandle, side = 'bottom', topOffset, show }: NodeAddBelowProps) {
  const [open, setOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const { getNode, setNodes, setEdges } = useReactFlow();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as HTMLElement)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleAdd = (blockType: string, data: Record<string, unknown>) => {
    const node = getNode(nodeId);
    if (!node) return;

    const newId = `${blockType}-${Date.now()}`;

    // Place new node to the right (for condition side handles) or below
    const newPos = side === 'right'
      ? { x: node.position.x + 360, y: node.position.y + (sourceHandle === 'no' ? 120 : 0) }
      : { x: node.position.x, y: node.position.y + 160 };

    const newNode = {
      id: newId,
      type: blockType,
      position: newPos,
      data,
      ...(blockType === 'group' ? { style: { width: 320, height: 220 }, zIndex: -1 } : {}),
    };

    const edgeColor =
      sourceHandle === 'yes' ? '#3b82f6'
      : sourceHandle === 'no' ? '#ef4444'
      : '#94a3b8';

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [
      ...eds,
      {
        id: `e-${nodeId}-${newId}-${Date.now()}`,
        source: nodeId,
        target: newId,
        ...(sourceHandle ? { sourceHandle } : {}),
        animated: true,
        style: { stroke: edgeColor, strokeWidth: 2 },
      },
    ]);

    setOpen(false);
  };

  const isRight = side === 'right';

  const visClass = show !== undefined
    ? (show ? 'opacity-100' : 'opacity-0 pointer-events-none')
    : 'opacity-0 group-hover:opacity-100';

  return (
    <div
      className={`absolute flex items-center transition-opacity z-50 ${visClass}`}
      style={
        isRight
          ? { right: '-2.25rem', top: topOffset ?? '50%', transform: 'translateY(-50%)', flexDirection: 'row' }
          : { bottom: '-2.25rem', left: '50%', transform: 'translateX(-50%)', flexDirection: 'column' }
      }
    >
      {/* Stub line */}
      {isRight
        ? <div className="h-px w-3 bg-slate-300" />
        : <div className="w-px h-3 bg-slate-300" />
      }

      <button
        onMouseDown={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="w-6 h-6 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-500 rounded-full shadow-sm hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-all flex items-center justify-center flex-shrink-0"
      >
        <Plus size={12} className="text-slate-400" />
      </button>

      {open && (
        <div
          ref={popupRef}
          className="absolute bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 z-[200] animate-fade-in-up"
          style={
            isRight
              ? { left: '2.25rem', top: '50%', transform: 'translateY(-50%)', minWidth: 200 }
              : { top: '2.25rem', left: '50%', transform: 'translateX(-50%)', minWidth: 200 }
          }
          onMouseDown={(e) => e.stopPropagation()}
        >
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide px-1.5 pb-1.5">
            Adicionar bloco
          </p>
          <div className="grid grid-cols-4 gap-1">
            {QUICK_BLOCKS.map((block, i) => {
              const Icon = block.icon;
              return (
                <button
                  key={i}
                  onMouseDown={(e) => { e.stopPropagation(); handleAdd(block.type, block.data); }}
                  className="flex flex-col items-center gap-1 px-1.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  title={block.label}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: block.color + '22' }}
                  >
                    <Icon size={15} style={{ color: block.color }} />
                  </div>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium leading-tight text-center">
                    {block.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
