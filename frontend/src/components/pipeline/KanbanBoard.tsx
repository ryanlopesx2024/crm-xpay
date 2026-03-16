import React, { useState, useMemo } from 'react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  Search, SlidersHorizontal, Plus, X, Check, ChevronRight,
  Tag, Package, User2, Activity, Calendar, TrendingUp,
  MapPin, AlertCircle, Filter, DollarSign, Clock,
} from 'lucide-react';
import { Pipeline, Deal, Stage } from '../../types';
import KanbanColumn from './KanbanColumn';
import DealCard from './DealCard';
import DealModal from './DealModal';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';
import { format } from 'date-fns';

interface KanbanBoardProps {
  pipeline: Pipeline;
  deals: Deal[];
  onMoveDeal: (dealId: string, stageId: string) => void;
  onCreateDeal?: (payload: Partial<Deal>) => Promise<Deal>;
  onUpdateDeal?: (dealId: string, payload: Partial<Deal>) => Promise<Deal>;
  onDeleteDeal?: (dealId: string) => void;
  onWonDeal?: (dealId: string) => Promise<Deal>;
  onLostDeal?: (dealId: string, lostReasonId?: string) => Promise<Deal>;
  onReopenDeal?: (dealId: string) => Promise<Deal>;
  onCreateStage?: (pipelineId: string, name: string, color: string) => Promise<Stage>;
  onDeleteStage?: (pipelineId: string, stageId: string) => void;
  onOpenChat?: (leadId: string) => void;
}

const STAGE_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

interface Filters {
  status: string[];
  tagIds: string[];
  productIds: string[];
  assigneeIds: string[];
  origins: string[];
  lostReasonIds: string[];
  minValue: string;
  maxValue: string;
  dateFrom: string;
  dateTo: string;
}

const emptyFilters: Filters = {
  status: [], tagIds: [], productIds: [], assigneeIds: [],
  origins: [], lostReasonIds: [], minValue: '', maxValue: '',
  dateFrom: '', dateTo: '',
};

function countFilters(f: Filters) {
  return f.status.length + f.tagIds.length + f.productIds.length + f.assigneeIds.length +
    f.origins.length + f.lostReasonIds.length +
    (f.minValue ? 1 : 0) + (f.maxValue ? 1 : 0) +
    (f.dateFrom ? 1 : 0) + (f.dateTo ? 1 : 0);
}

export default function KanbanBoard({
  pipeline, deals, onMoveDeal, onCreateDeal, onUpdateDeal, onDeleteDeal,
  onWonDeal, onLostDeal, onReopenDeal, onCreateStage, onDeleteStage, onOpenChat,
}: KanbanBoardProps) {
  const { user } = useAuthStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Deal creation
  const [creatingForStage, setCreatingForStage] = useState<string | null>(null);
  const [newDealData, setNewDealData] = useState({ leadSearch: '', leadId: '', value: 0 });
  const [leadResults, setLeadResults] = useState<{ id: string; name: string; phone?: string }[]>([]);

  // Stage creation
  const [creatingStage, setCreatingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#6366f1');
  const [savingStage, setSavingStage] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const activeDeal = deals.find((d) => d.id === activeId);
  const stages = pipeline.stages || [];

  // Derive unique filter options from current deals
  const filterOptions = useMemo(() => {
    const tags = new Map<string, { id: string; name: string; color: string }>();
    const products = new Map<string, { id: string; name: string }>();
    const assignees = new Map<string, { id: string; name: string }>();
    const origins = new Set<string>();
    const lostReasons = new Map<string, { id: string; name: string }>();

    deals.forEach((d) => {
      d.lead?.tags?.forEach(({ tag }: any) => { if (tag?.id) tags.set(tag.id, tag); });
      if (d.product?.id) products.set(d.product.id, d.product);
      if (d.assignedUser?.id) assignees.set(d.assignedUser.id, d.assignedUser);
      if ((d.lead as any)?.source) origins.add((d.lead as any).source);
      if (d.lostReason?.id) lostReasons.set(d.lostReason.id, d.lostReason);
    });

    return {
      tags: Array.from(tags.values()),
      products: Array.from(products.values()),
      assignees: Array.from(assignees.values()),
      origins: Array.from(origins),
      lostReasons: Array.from(lostReasons.values()),
    };
  }, [deals]);

  const filteredDeals = useMemo(() => deals.filter((d) => {
    if (search && !d.lead?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.status.length > 0 && !filters.status.includes(d.status)) return false;
    if (filters.tagIds.length > 0 && !d.lead?.tags?.some(({ tag }: any) => filters.tagIds.includes(tag?.id))) return false;
    if (filters.productIds.length > 0 && (!d.product || !filters.productIds.includes(d.product.id))) return false;
    if (filters.assigneeIds.length > 0 && (!d.assignedUser || !filters.assigneeIds.includes(d.assignedUser.id))) return false;
    if (filters.origins.length > 0 && !filters.origins.includes((d.lead as any)?.source)) return false;
    if (filters.lostReasonIds.length > 0 && (!d.lostReason || !filters.lostReasonIds.includes(d.lostReason.id))) return false;
    if (filters.minValue && (d.value || 0) < parseFloat(filters.minValue)) return false;
    if (filters.maxValue && (d.value || 0) > parseFloat(filters.maxValue)) return false;
    if (filters.dateFrom && new Date(d.createdAt) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(d.createdAt) > new Date(filters.dateTo + 'T23:59:59')) return false;
    return true;
  }), [deals, search, filters]);

  const activeFiltersCount = countFilters(filters);

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const deal = deals.find((d) => d.id === active.id);
    if (deal && deal.stageId !== over.id) onMoveDeal(active.id as string, over.id as string);
  };

  const handleNewDeal = (stageId: string) => {
    setCreatingForStage(stageId);
    setNewDealData({ leadSearch: '', leadId: '', value: 0 });
    setLeadResults([]);
  };

  const searchLeads = async (val: string) => {
    setNewDealData((prev) => ({ ...prev, leadSearch: val, leadId: '' }));
    if (val.length < 2) { setLeadResults([]); return; }
    try {
      const { data } = await api.get('/api/leads?search=' + encodeURIComponent(val) + '&limit=5');
      setLeadResults(data.leads || []);
    } catch { setLeadResults([]); }
  };

  const handleCreateDeal = async () => {
    if (!newDealData.leadId || !creatingForStage || !onCreateDeal) return;
    try {
      await onCreateDeal({ leadId: newDealData.leadId, pipelineId: pipeline.id, stageId: creatingForStage, value: newDealData.value } as Partial<Deal>);
      setCreatingForStage(null);
    } catch (err) { console.error(err); }
  };

  const handleCreateStage = async () => {
    if (!newStageName.trim() || !onCreateStage) return;
    setSavingStage(true);
    try {
      await onCreateStage(pipeline.id, newStageName.trim(), newStageColor);
      setCreatingStage(false); setNewStageName('');
    } catch (err) { console.error(err); } finally { setSavingStage(false); }
  };

  const toggleFilter = <K extends keyof Filters>(key: K, value: string) => {
    setFilters((prev) => {
      const arr = prev[key] as string[];
      return { ...prev, [key]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
    });
  };

  const setFilterField = (key: keyof Filters, value: string) => setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () => { setFilters(emptyFilters); setExpandedSection(null); };

  const toggleSection = (s: string) => setExpandedSection((prev) => prev === s ? null : s);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-900 min-w-0 truncate flex-1">{pipeline.name}</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 pr-3 py-1.5 text-xs bg-slate-100 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-brand-500 w-40 transition-all text-slate-800"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={10} />
              </button>
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            {filteredDeals.length}/{deals.length}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={'relative p-2 rounded-lg transition-colors ' + (showFilters || activeFiltersCount > 0 ? 'bg-brand-100 text-brand-600' : 'hover:bg-slate-100 text-slate-500')}
          >
            <SlidersHorizontal size={14} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 text-white text-[9px] rounded-full flex items-center justify-center font-bold">{activeFiltersCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Board + Filter Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 p-4 h-full min-w-max">
              {stages.map((stage: Stage) => {
                const stageDeals = filteredDeals.filter((d) => d.stageId === stage.id);
                return (
                  <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    stages={stages}
                    deals={stageDeals}
                    onDealClick={setSelectedDeal}
                    onNewDeal={() => handleNewDeal(stage.id)}
                    onWonDeal={(id) => onWonDeal?.(id)}
                    onLostDeal={(id) => onLostDeal?.(id)}
                    onDeleteDeal={(id) => onDeleteDeal?.(id)}
                    onAssignToMe={(id) => {
                      if (!onUpdateDeal) return;
                      const d = deals.find((x) => x.id === id);
                      const alreadyMine = d?.assignedUser?.id === user?.id;
                      onUpdateDeal(id, { assignedUserId: alreadyMine ? null : user?.id } as any);
                    }}
                    onMoveToStage={(dealId, stageId) => onMoveDeal(dealId, stageId)}
                    onDeleteStage={(stageId) => {
                      if (confirm('Excluir esta etapa? Os negócios serão removidos.')) {
                        onDeleteStage?.(pipeline.id, stageId);
                      }
                    }}
                    onDeleteAllDeals={(stageId) => {
                      const sd = deals.filter((d) => d.stageId === stageId);
                      if (confirm(`Excluir ${sd.length} negócio(s) desta etapa?`)) {
                        sd.forEach((d) => onDeleteDeal?.(d.id));
                      }
                    }}
                    onOpenChat={onOpenChat}
                  />
                );
              })}

              {onCreateStage && (
                <div className="flex flex-col w-72 flex-shrink-0">
                  {creatingStage ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                      <p className="text-xs font-semibold text-slate-700">Nova Etapa</p>
                      <input
                        type="text" value={newStageName}
                        onChange={(e) => setNewStageName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateStage()}
                        placeholder="Nome da etapa..."
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                        autoFocus
                      />
                      <div>
                        <p className="text-xs text-slate-500 mb-1.5">Cor</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {STAGE_COLORS.map((c) => (
                            <button key={c} onClick={() => setNewStageColor(c)}
                              className={'w-6 h-6 rounded-full transition-transform ' + (newStageColor === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110')}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setCreatingStage(false)} className="flex-1 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
                        <button onClick={handleCreateStage} disabled={!newStageName.trim() || savingStage} className="flex-1 py-1.5 text-xs text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium flex items-center justify-center gap-1">
                          <Check size={11} /> {savingStage ? 'Criando...' : 'Criar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setCreatingStage(true)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-brand-300 hover:text-brand-500 transition-colors text-sm font-medium"
                    >
                      <Plus size={14} /> Nova etapa
                    </button>
                  )}
                </div>
              )}
            </div>

            <DragOverlay>
              {activeDeal && (
                <div className="opacity-90 rotate-2 scale-105 w-72">
                  <DealCard deal={activeDeal} index={0} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Filter Drawer */}
        {showFilters && (
          <div className="w-[270px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden shadow-lg">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter size={13} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Filtros</span>
                {activeFiltersCount > 0 && (
                  <span className="text-[10px] font-bold bg-brand-600 text-white px-1.5 py-0.5 rounded-full">{activeFiltersCount}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {activeFiltersCount > 0 && (
                  <button onClick={clearFilters} className="text-[11px] text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                    Limpar
                  </button>
                )}
                <button onClick={() => setShowFilters(false)} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
                  <X size={13} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Filter sections */}
            <div className="flex-1 overflow-y-auto">

              {/* Status */}
              <FilterSection
                id="status" label="Status" icon={Activity}
                active={filters.status.length > 0} count={filters.status.length}
                expanded={expandedSection === 'status'} onToggle={() => toggleSection('status')}
              >
                <div className="flex flex-col gap-1 px-4 pb-3">
                  {[['OPEN','Em aberto','#6366f1'],['WON','Ganho','#10b981'],['LOST','Perdido','#ef4444']].map(([val, label, color]) => (
                    <CheckItem key={val} label={label} color={color}
                      checked={filters.status.includes(val)}
                      onChange={() => toggleFilter('status', val)}
                    />
                  ))}
                </div>
              </FilterSection>

              {/* Tags */}
              <FilterSection
                id="tags" label="Tags" icon={Tag}
                active={filters.tagIds.length > 0} count={filters.tagIds.length}
                expanded={expandedSection === 'tags'} onToggle={() => toggleSection('tags')}
              >
                <div className="flex flex-col gap-1 px-4 pb-3">
                  {filterOptions.tags.length === 0
                    ? <p className="text-[11px] text-slate-400 py-1">Nenhuma tag nos negócios</p>
                    : filterOptions.tags.map((t) => (
                      <CheckItem key={t.id} label={t.name} color={t.color}
                        checked={filters.tagIds.includes(t.id)}
                        onChange={() => toggleFilter('tagIds', t.id)}
                      />
                    ))
                  }
                </div>
              </FilterSection>

              {/* Produtos */}
              <FilterSection
                id="products" label="Produtos" icon={Package}
                active={filters.productIds.length > 0} count={filters.productIds.length}
                expanded={expandedSection === 'products'} onToggle={() => toggleSection('products')}
              >
                <div className="flex flex-col gap-1 px-4 pb-3">
                  {filterOptions.products.length === 0
                    ? <p className="text-[11px] text-slate-400 py-1">Nenhum produto nos negócios</p>
                    : filterOptions.products.map((p) => (
                      <CheckItem key={p.id} label={p.name}
                        checked={filters.productIds.includes(p.id)}
                        onChange={() => toggleFilter('productIds', p.id)}
                      />
                    ))
                  }
                </div>
              </FilterSection>

              {/* Atendente */}
              <FilterSection
                id="assignees" label="Atendente" icon={User2}
                active={filters.assigneeIds.length > 0} count={filters.assigneeIds.length}
                expanded={expandedSection === 'assignees'} onToggle={() => toggleSection('assignees')}
              >
                <div className="flex flex-col gap-1 px-4 pb-3">
                  {filterOptions.assignees.length === 0
                    ? <p className="text-[11px] text-slate-400 py-1">Nenhum atendente atribuído</p>
                    : filterOptions.assignees.map((a) => (
                      <CheckItem key={a.id} label={a.name}
                        checked={filters.assigneeIds.includes(a.id)}
                        onChange={() => toggleFilter('assigneeIds', a.id)}
                      />
                    ))
                  }
                </div>
              </FilterSection>

              {/* Valor */}
              <FilterSection
                id="value" label="Intervalo de valor" icon={DollarSign}
                active={!!(filters.minValue || filters.maxValue)}
                count={(filters.minValue ? 1 : 0) + (filters.maxValue ? 1 : 0)}
                expanded={expandedSection === 'value'} onToggle={() => toggleSection('value')}
              >
                <div className="px-4 pb-3 space-y-2">
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Valor mínimo (R$)</label>
                    <input type="number" value={filters.minValue} onChange={(e) => setFilterField('minValue', e.target.value)}
                      placeholder="0,00" min={0} step={0.01}
                      className="mt-1 w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Valor máximo (R$)</label>
                    <input type="number" value={filters.maxValue} onChange={(e) => setFilterField('maxValue', e.target.value)}
                      placeholder="0,00" min={0} step={0.01}
                      className="mt-1 w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                    />
                  </div>
                </div>
              </FilterSection>

              {/* Data de criação */}
              <FilterSection
                id="date" label="Data de criação" icon={Calendar}
                active={!!(filters.dateFrom || filters.dateTo)}
                count={(filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0)}
                expanded={expandedSection === 'date'} onToggle={() => toggleSection('date')}
              >
                <div className="px-4 pb-3 space-y-2">
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">De</label>
                    <input type="date" value={filters.dateFrom} onChange={(e) => setFilterField('dateFrom', e.target.value)}
                      className="mt-1 w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Até</label>
                    <input type="date" value={filters.dateTo} onChange={(e) => setFilterField('dateTo', e.target.value)}
                      className="mt-1 w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                    />
                  </div>
                </div>
              </FilterSection>

              {/* Origem */}
              <FilterSection
                id="origins" label="Origem" icon={MapPin}
                active={filters.origins.length > 0} count={filters.origins.length}
                expanded={expandedSection === 'origins'} onToggle={() => toggleSection('origins')}
              >
                <div className="flex flex-col gap-1 px-4 pb-3">
                  {filterOptions.origins.length === 0
                    ? <p className="text-[11px] text-slate-400 py-1">Nenhuma origem registrada</p>
                    : filterOptions.origins.map((o) => (
                      <CheckItem key={o} label={o}
                        checked={filters.origins.includes(o)}
                        onChange={() => toggleFilter('origins', o)}
                      />
                    ))
                  }
                </div>
              </FilterSection>

              {/* Motivo de perda */}
              <FilterSection
                id="lostReasons" label="Motivo de perda" icon={AlertCircle}
                active={filters.lostReasonIds.length > 0} count={filters.lostReasonIds.length}
                expanded={expandedSection === 'lostReasons'} onToggle={() => toggleSection('lostReasons')}
              >
                <div className="flex flex-col gap-1 px-4 pb-3">
                  {filterOptions.lostReasons.length === 0
                    ? <p className="text-[11px] text-slate-400 py-1">Nenhum motivo de perda</p>
                    : filterOptions.lostReasons.map((r) => (
                      <CheckItem key={r.id} label={r.name}
                        checked={filters.lostReasonIds.includes(r.id)}
                        onChange={() => toggleFilter('lostReasonIds', r.id)}
                      />
                    ))
                  }
                </div>
              </FilterSection>

            </div>

            {/* Footer: result count */}
            <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                <span className="font-bold text-slate-700">{filteredDeals.length}</span> negócio{filteredDeals.length !== 1 ? 's' : ''} encontrado{filteredDeals.length !== 1 ? 's' : ''}
              </span>
              {activeFiltersCount > 0 && (
                <button onClick={clearFilters} className="text-[11px] text-brand-600 font-medium hover:underline">
                  Limpar tudo
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Deal Modal */}
      {selectedDeal && (
        <DealModal
          deal={selectedDeal}
          stages={stages}
          onClose={() => setSelectedDeal(null)}
          onUpdate={onUpdateDeal}
          onDelete={onDeleteDeal}
          onWon={onWonDeal}
          onLost={onLostDeal}
          onReopen={onReopenDeal}
        />
      )}

      {/* Create Deal Modal */}
      {creatingForStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[420px] animate-fade-in-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-slate-900">Novo Negócio</h3>
              <button onClick={() => setCreatingForStage(null)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={14} className="text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Lead *</label>
                <div className="relative">
                  <input type="text" value={newDealData.leadSearch} onChange={(e) => searchLeads(e.target.value)}
                    placeholder="Buscar lead pelo nome..."
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                    autoFocus
                  />
                  {newDealData.leadId && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500"><Check size={14} /></span>}
                  {leadResults.length > 0 && !newDealData.leadId && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto">
                      {leadResults.map((lead) => (
                        <button key={lead.id}
                          onClick={() => { setNewDealData((prev) => ({ ...prev, leadId: lead.id, leadSearch: lead.name })); setLeadResults([]); }}
                          className="flex items-center gap-2 w-full px-3 py-2 hover:bg-slate-50 text-left"
                        >
                          <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-brand-600">{lead.name[0]}</span>
                          </div>
                          <div>
                            <p className="text-sm text-slate-900">{lead.name}</p>
                            {lead.phone && <p className="text-xs text-slate-400">{lead.phone}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {leadResults.length === 0 && newDealData.leadSearch.length >= 2 && !newDealData.leadId && (
                  <p className="text-xs text-slate-400 mt-1">Nenhum lead encontrado.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Valor (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">R$</span>
                  <input type="number" value={newDealData.value}
                    onChange={(e) => setNewDealData((prev) => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                    className="w-full text-sm border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                    min={0} step={0.01} placeholder="0,00"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setCreatingForStage(null)} className="flex-1 py-2.5 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={handleCreateDeal} disabled={!newDealData.leadId} className="flex-1 py-2.5 text-sm text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors font-medium shadow-sm">
                Criar negócio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function FilterSection({
  id, label, icon: Icon, active, count, expanded, onToggle, children,
}: {
  id: string; label: string; icon: any; active: boolean; count: number;
  expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${active ? 'bg-brand-100' : 'bg-slate-100'}`}>
          <Icon size={12} className={active ? 'text-brand-600' : 'text-slate-400'} />
        </div>
        <span className={`flex-1 text-xs font-medium ${active ? 'text-slate-900' : 'text-slate-600'}`}>{label}</span>
        {count > 0 && (
          <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full mr-1">{count}</span>
        )}
        <div className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>
          <ChevronRight size={13} className="text-slate-300" />
        </div>
      </button>
      {expanded && children}
    </div>
  );
}

function CheckItem({ label, color, checked, onChange }: {
  label: string; color?: string; checked: boolean; onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2.5 py-1 cursor-pointer group">
      <div
        onClick={onChange}
        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all cursor-pointer ${
          checked ? 'bg-brand-600 border-brand-600' : 'border-slate-300 group-hover:border-brand-400'
        }`}
      >
        {checked && <Check size={9} className="text-white" />}
      </div>
      {color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
      <span className="text-xs text-slate-700 truncate">{label}</span>
    </label>
  );
}
