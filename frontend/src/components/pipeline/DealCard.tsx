import React, { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  MessageCircle, Plus, Calendar, Activity, CheckCircle, XCircle,
  ArrowLeftRight, FileText, Trash2, ChevronRight, Clock, UserPlus,
  ChevronLeft, Check, X, Loader2,
} from 'lucide-react';
import { Deal, Stage } from '../../types';
import Avatar from '../shared/Avatar';
import TagPill from '../shared/TagPill';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';

type Panel = 'menu' | 'move' | 'activity';

interface ActivityType {
  id: string;
  name: string;
  icon?: string;
}

interface DealCardProps {
  deal: Deal;
  index: number;
  stages?: Stage[];
  onClick?: () => void;
  onWon?: () => void;
  onLost?: () => void;
  onDelete?: () => void;
  onAssignToMe?: () => void;
  onMoveToStage?: (stageId: string) => void;
  onOpenChat?: (leadId: string) => void;
}

export default function DealCard({
  deal, index, stages = [], onClick, onWon, onLost, onDelete, onAssignToMe, onMoveToStage, onOpenChat,
}: DealCardProps) {
  const lead = deal.lead;
  const { user } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [panel, setPanel] = useState<Panel>('menu');
  const menuRef = useRef<HTMLDivElement>(null);

  // Activity form state
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [actTypeId, setActTypeId] = useState('');
  const [actTitle, setActTitle] = useState('');
  const [actDueDate, setActDueDate] = useState('');
  const [actSaving, setActSaving] = useState(false);
  const [actDone, setActDone] = useState(false);
  const [actError, setActError] = useState('');

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id });

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showMenu]);

  const closeMenu = () => {
    setShowMenu(false);
    setPanel('menu');
    setActDone(false);
    setActError('');
    setActTitle('');
    setActDueDate('');
    setActTypeId('');
  };

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPanel('menu');
    setActDone(false);
    setActError('');
    setShowMenu((v) => !v);
  };

  const openActivity = async () => {
    setPanel('activity');
    if (activityTypes.length === 0) {
      try {
        const { data } = await api.get('/api/config/activity-types');
        setActivityTypes(data || []);
        if (data?.length > 0) setActTypeId(data[0].id);
      } catch {
        setActivityTypes([]);
      }
    }
  };

  const saveActivity = async () => {
    if (!actTitle.trim() || !actTypeId) return;
    setActSaving(true);
    setActError('');
    try {
      await api.post(`/api/deals/${deal.id}/activities`, {
        typeId: actTypeId,
        title: actTitle.trim(),
        dueDate: actDueDate || undefined,
      });
      setActDone(true);
    } catch {
      setActError('Erro ao salvar atividade.');
    } finally {
      setActSaving(false);
    }
  };

  const dealNum = '#' + String(index + 1).padStart(5, '0');
  const isAssignedToMe = deal.assignedUser?.id === user?.id;

  const isWon = deal.status === 'WON';
  const isLost = deal.status === 'LOST';

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 select-none relative ${
        isDragging ? 'opacity-40 shadow-xl scale-105 rotate-1' : ''
      } ${isWon ? 'border-emerald-300 bg-emerald-50/40' : isLost ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}
    >
      {/* Header: drag handle (only this area initiates drag) */}
      <div
        {...listeners}
        className="p-3 pb-2 flex items-start gap-2.5 cursor-grab active:cursor-grabbing"
        onClick={onClick}
      >
        <div className="flex-shrink-0 mt-0.5">
          <Avatar name={lead?.name || '?'} src={(lead as any)?.avatar} size="md" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-[13px] font-semibold text-slate-900 leading-tight">{lead?.name || '—'}</p>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isWon && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wide">Ganho</span>
              )}
              {isLost && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 uppercase tracking-wide">Perdido</span>
              )}
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">{dealNum}</span>
            </div>
          </div>
          {(deal.product || (deal.value || 0) > 0) && (() => {
            // deal.value is the authoritative total (set by addProduct/saveProductValues).
            // Fall back to product price if deal.value is still 0.
            const productPrice = deal.product ? (deal.product.defaultValue || 0) * (deal.quantity || 1) : 0;
            const total = (deal.value || 0) > 0 ? (deal.value || 0) : productPrice;
            return (
              <p className="text-[11px] text-brand-600 font-medium mt-0.5 truncate">
                {[
                  deal.product?.name,
                  total > 0 ? 'R$ ' + total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : null,
                ].filter(Boolean).join(' · ')}
              </p>
            );
          })()}
          {lead?.tags && lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {lead.tags.slice(0, 2).map(({ tag }: any) => (
                <TagPill key={tag.id} name={tag.name} color={tag.color} small />
              ))}
              {lead.tags.length > 2 && (
                <span className="text-[9px] text-slate-400 self-center">+{lead.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Assigned user */}
      <div
        className="px-3 pb-1.5 flex items-center gap-1.5 cursor-pointer group/assign"
        onClick={(e) => { e.stopPropagation(); onAssignToMe?.(); }}
      >
        <Avatar name={deal.assignedUser?.name || (user?.name || '?')} size="xs" />
        <span className="text-[11px] truncate flex-1">
          {deal.assignedUser ? (
            isAssignedToMe ? (
              <span className="text-brand-600 font-medium flex items-center gap-1 group-hover/assign:text-red-500 transition-colors">
                <UserPlus size={10} />
                {deal.assignedUser.name}
              </span>
            ) : (
              <span className="text-slate-500">{deal.assignedUser.name}</span>
            )
          ) : (
            <span className="text-brand-500 font-medium flex items-center gap-1 group-hover/assign:underline">
              <UserPlus size={10} />
              Atribuir a mim
            </span>
          )}
        </span>
      </div>


      {/* Date + Activity */}
      <div className="px-3 pb-2 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <Calendar size={10} className="text-slate-300 flex-shrink-0" />
          <span className="text-[11px] text-slate-400">
            {format(new Date(deal.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity size={10} className="text-slate-300 flex-shrink-0" />
          <span className="text-[11px] text-slate-400">Sem atividades</span>
        </div>
      </div>

      {/* Footer: chips + action buttons */}
      <div className="px-3 pb-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {lead?.tags?.slice(0, 1).map(({ tag }: any) => (
            <span
              key={tag.id}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
              style={{ backgroundColor: tag.color + '22', color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
          {deal.assignedUser && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
              isAssignedToMe ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {deal.assignedUser.name.split(' ')[0]}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 flex-shrink-0" ref={menuRef}>
          <button
            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (deal.leadId) onOpenChat?.(deal.leadId);
            }}
            title="Abrir conversa"
          >
            <MessageCircle size={13} />
          </button>
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            onClick={openMenu}
            title="Ações"
          >
            <Plus size={13} />
          </button>

          {/* Dropdown panel */}
          {showMenu && (
            <div
              className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[200] w-[250px] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── MAIN MENU ── */}
              {panel === 'menu' && (
                <div className="py-1.5">
                  <button
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                    onClick={() => openActivity()}
                  >
                    <Clock size={14} className="flex-shrink-0 mt-0.5 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800">Criar atividade</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Crie uma nova atividade para o negócio</p>
                    </div>
                    <ChevronRight size={12} className="flex-shrink-0 mt-1 text-slate-300" />
                  </button>

                  <button
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                    onClick={() => setPanel('move')}
                  >
                    <ArrowLeftRight size={14} className="flex-shrink-0 mt-0.5 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800">Mover negócio</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Mova o negócio de etapa</p>
                    </div>
                    <ChevronRight size={12} className="flex-shrink-0 mt-1 text-slate-300" />
                  </button>

                  <button
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                    onClick={() => { closeMenu(); onClick?.(); }}
                  >
                    <FileText size={14} className="flex-shrink-0 mt-0.5 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800">Adicionar campos adicionais</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Adicione campos adicionais ao negócio</p>
                    </div>
                    <ChevronRight size={12} className="flex-shrink-0 mt-1 text-slate-300" />
                  </button>

                  <div className="mx-3 my-1 border-t border-slate-100" />

                  <button
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-emerald-50 transition-colors text-left"
                    onClick={() => { closeMenu(); onWon?.(); }}
                  >
                    <CheckCircle size={14} className="flex-shrink-0 mt-0.5 text-emerald-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-emerald-700">Ganhar o negócio</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Altera o status para ganho</p>
                    </div>
                  </button>

                  <button
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors text-left"
                    onClick={() => { closeMenu(); onLost?.(); }}
                  >
                    <XCircle size={14} className="flex-shrink-0 mt-0.5 text-orange-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-orange-600">Perder o negócio</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Altera o status para perdido</p>
                    </div>
                  </button>

                  <div className="mx-3 my-1 border-t border-slate-100" />

                  <button
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors text-left"
                    onClick={() => {
                      closeMenu();
                      if (confirm('Excluir este negócio?')) onDelete?.();
                    }}
                  >
                    <Trash2 size={14} className="flex-shrink-0 mt-0.5 text-red-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-red-600">Excluir</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Excluir negócio da pipeline</p>
                    </div>
                  </button>
                </div>
              )}

              {/* ── MOVE STAGE PANEL ── */}
              {panel === 'move' && (
                <div className="py-1.5">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                    <button
                      onClick={() => setPanel('menu')}
                      className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <ChevronLeft size={13} className="text-slate-500" />
                    </button>
                    <span className="text-xs font-semibold text-slate-700">Mover para etapa</span>
                  </div>
                  <div className="max-h-52 overflow-y-auto py-1">
                    {stages.length === 0 && (
                      <p className="text-[11px] text-slate-400 px-4 py-3">Nenhuma etapa disponível</p>
                    )}
                    {stages.map((stage) => {
                      const isCurrent = stage.id === deal.stageId;
                      return (
                        <button
                          key={stage.id}
                          disabled={isCurrent}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                            isCurrent
                              ? 'opacity-50 cursor-default'
                              : 'hover:bg-slate-50'
                          }`}
                          onClick={() => {
                            if (!isCurrent) {
                              closeMenu();
                              onMoveToStage?.(stage.id);
                            }
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="text-xs text-slate-800 flex-1">{stage.name}</span>
                          {isCurrent && (
                            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Atual</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── CREATE ACTIVITY PANEL ── */}
              {panel === 'activity' && (
                <div className="py-1.5">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                    <button
                      onClick={() => setPanel('menu')}
                      className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <ChevronLeft size={13} className="text-slate-500" />
                    </button>
                    <span className="text-xs font-semibold text-slate-700">Criar atividade</span>
                  </div>

                  {actDone ? (
                    <div className="flex flex-col items-center gap-2 py-5 px-4">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Check size={16} className="text-emerald-600" />
                      </div>
                      <p className="text-xs font-medium text-slate-700">Atividade criada!</p>
                      <button
                        onClick={closeMenu}
                        className="text-[11px] text-brand-600 hover:underline mt-1"
                      >
                        Fechar
                      </button>
                    </div>
                  ) : (
                    <div className="px-4 py-3 space-y-3">
                      {/* Type */}
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo *</label>
                        {activityTypes.length === 0 ? (
                          <div className="flex items-center gap-2 py-1">
                            <Loader2 size={12} className="animate-spin text-slate-400" />
                            <span className="text-[11px] text-slate-400">Carregando...</span>
                          </div>
                        ) : (
                          <select
                            value={actTypeId}
                            onChange={(e) => setActTypeId(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-slate-800"
                          >
                            {activityTypes.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Title */}
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Título *</label>
                        <input
                          type="text"
                          value={actTitle}
                          onChange={(e) => setActTitle(e.target.value)}
                          placeholder="Ex: Ligar para cliente..."
                          className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 placeholder:text-slate-300"
                          autoFocus
                        />
                      </div>

                      {/* Due date */}
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Prazo</label>
                        <input
                          type="datetime-local"
                          value={actDueDate}
                          onChange={(e) => setActDueDate(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                        />
                      </div>

                      {actError && (
                        <p className="text-[10px] text-red-500">{actError}</p>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setPanel('menu')}
                          className="flex-1 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={saveActivity}
                          disabled={!actTitle.trim() || !actTypeId || actSaving}
                          className="flex-1 py-1.5 text-xs text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-1"
                        >
                          {actSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                          Salvar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
