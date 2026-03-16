import React, { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MoreHorizontal, Plus, ArrowLeftRight, Trash2, ChevronLeft, Loader2 } from 'lucide-react';
import { Stage, Deal } from '../../types';
import DealCard from './DealCard';

interface KanbanColumnProps {
  stage: Stage;
  stages?: Stage[];
  deals: Deal[];
  onDealClick?: (deal: Deal) => void;
  onNewDeal?: () => void;
  onWonDeal?: (dealId: string) => void;
  onLostDeal?: (dealId: string) => void;
  onDeleteDeal?: (dealId: string) => void;
  onAssignToMe?: (dealId: string) => void;
  onDeleteStage?: (stageId: string) => void;
  onDeleteAllDeals?: (stageId: string) => void;
  onMoveToStage?: (dealId: string, stageId: string) => void;
  onOpenChat?: (leadId: string) => void;
}

type StageMenuPanel = 'main' | 'move';

export default function KanbanColumn({
  stage, stages = [], deals, onDealClick, onNewDeal,
  onWonDeal, onLostDeal, onDeleteDeal, onAssignToMe,
  onDeleteStage, onDeleteAllDeals, onMoveToStage, onOpenChat,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const [showStageMenu, setShowStageMenu] = useState(false);
  const [menuPanel, setMenuPanel] = useState<StageMenuPanel>('main');
  const [movingAll, setMovingAll] = useState(false);
  const stageMenuRef = useRef<HTMLDivElement>(null);

  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (stageMenuRef.current && !stageMenuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }
    if (showStageMenu) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showStageMenu]);

  const closeMenu = () => {
    setShowStageMenu(false);
    setMenuPanel('main');
  };

  const moveAllToStage = async (targetStageId: string) => {
    if (!onMoveToStage || deals.length === 0) { closeMenu(); return; }
    setMovingAll(true);
    for (const deal of deals) {
      await onMoveToStage(deal.id, targetStageId);
    }
    setMovingAll(false);
    closeMenu();
  };

  const otherStages = stages.filter((s) => s.id !== stage.id);

  return (
    <div className="flex flex-col w-72 flex-shrink-0 h-full">
      {/* Column Header */}
      <div className="bg-white rounded-t-xl border border-slate-200 border-b-0 shadow-sm">
        {/* Stage name row */}
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: stage.color }}
          />
          <span className="flex-1 text-xs font-bold text-slate-700 uppercase tracking-wide truncate">
            {stage.name}
          </span>
          <div className="relative" ref={stageMenuRef}>
            <button
              className="p-1 hover:bg-slate-100 rounded-md transition-colors"
              onClick={() => { setShowStageMenu((v) => !v); setMenuPanel('main'); }}
            >
              <MoreHorizontal size={13} className="text-slate-400" />
            </button>

            {/* Stage context menu */}
            {showStageMenu && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 w-[230px] overflow-hidden">

                {/* ── MAIN PANEL ── */}
                {menuPanel === 'main' && (
                  <div className="py-1.5">
                    <button
                      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                      onClick={() => setMenuPanel('move')}
                    >
                      <ArrowLeftRight size={14} className="flex-shrink-0 mt-0.5 text-slate-400" />
                      <div>
                        <p className="text-xs font-medium text-slate-800">Mover negócios</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Mova todos os negócios para outra etapa</p>
                      </div>
                    </button>
                    <button
                      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                      onClick={() => { closeMenu(); onDeleteStage?.(stage.id); }}
                    >
                      <Trash2 size={14} className="flex-shrink-0 mt-0.5 text-slate-400" />
                      <div>
                        <p className="text-xs font-medium text-slate-800">Excluir etapa</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Excluir esta etapa da pipeline</p>
                      </div>
                    </button>
                    <div className="mx-3 my-1 border-t border-slate-100" />
                    <button
                      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors text-left"
                      onClick={() => { closeMenu(); onDeleteAllDeals?.(stage.id); }}
                    >
                      <Trash2 size={14} className="flex-shrink-0 mt-0.5 text-red-500" />
                      <div>
                        <p className="text-xs font-medium text-red-600">Excluir negócios</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Excluir todos os negócios da etapa</p>
                      </div>
                    </button>
                  </div>
                )}

                {/* ── MOVE PANEL ── */}
                {menuPanel === 'move' && (
                  <div>
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                      <button
                        onClick={() => setMenuPanel('main')}
                        className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        <ChevronLeft size={13} className="text-slate-500" />
                      </button>
                      <span className="text-xs font-semibold text-slate-700">Mover {deals.length} negócio{deals.length !== 1 ? 's' : ''} para</span>
                    </div>
                    {movingAll ? (
                      <div className="flex items-center justify-center gap-2 py-5">
                        <Loader2 size={14} className="animate-spin text-brand-500" />
                        <span className="text-xs text-slate-500">Movendo...</span>
                      </div>
                    ) : otherStages.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-4 px-3">Nenhuma outra etapa disponível</p>
                    ) : (
                      <div className="py-1 max-h-52 overflow-y-auto">
                        {otherStages.map((s) => (
                          <button
                            key={s.id}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                            onClick={() => moveAllToStage(s.id)}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: s.color }}
                            />
                            <span className="text-xs text-slate-800">{s.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Value + count row */}
        <div className="px-3 pb-2.5 flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-slate-800">
            {totalValue > 0
              ? 'R$ ' + totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
              : 'R$ 0,00'}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {deals.length} {deals.length === 1 ? 'Negócio' : 'Negócios'}
          </span>
        </div>
      </div>

      {/* Drop area */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto overflow-x-visible px-2 py-2 space-y-2 border border-slate-200 border-t-0 min-h-24 transition-colors ${
          isOver
            ? 'bg-brand-50 border-brand-300'
            : 'bg-slate-50/50'
        }`}
      >
        <SortableContext
          items={deals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal, idx) => (
            <DealCard
              key={deal.id}
              deal={deal}
              index={idx}
              stages={stages}
              onClick={() => onDealClick?.(deal)}
              onWon={() => onWonDeal?.(deal.id)}
              onLost={() => onLostDeal?.(deal.id)}
              onDelete={() => onDeleteDeal?.(deal.id)}
              onAssignToMe={() => onAssignToMe?.(deal.id)}
              onMoveToStage={(stageId) => onMoveToStage?.(deal.id, stageId)}
              onOpenChat={onOpenChat}
            />
          ))}
        </SortableContext>
      </div>

      {/* Footer add button */}
      <button
        onClick={onNewDeal}
        className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors rounded-b-xl border-x border-b border-slate-200 bg-white"
      >
        <Plus size={12} />
        Novo negócio
      </button>
    </div>
  );
}
