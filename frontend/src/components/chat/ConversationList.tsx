import React, { useState, useEffect, useRef } from 'react';
import {
  Search, SlidersHorizontal, MoreHorizontal, X, CheckSquare,
  ChevronDown, ChevronRight, Filter, Trash2, UserCheck,
  ArrowRight, Play, Check, Bell, Settings, MessageSquare, Clock, BellOff,
} from 'lucide-react';
import { differenceInMinutes, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Conversation, Department, Tag, User } from '../../types';
import ConversationItem from './ConversationItem';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (conv: Conversation) => void;
  loading?: boolean;
  onFetchWithFilters?: (filters: Record<string, string>) => void;
  // Bulk actions
  onBulkFinish?: (ids: string[]) => void;
  onBulkTransferAgent?: (ids: string[], userId: string) => void;
  onBulkTransferDept?: (ids: string[], deptId: string) => void;
}

interface ListFilters {
  departmentIds: string[];
  assigneeIds: string[];
  instanceIds: string[];
  tagIds: string[];
  windowStatus: string; // 'all' | 'open' | 'closed'
  order: string; // 'newest' | 'oldest' | 'unread'
}

const emptyFilters: ListFilters = {
  departmentIds: [], assigneeIds: [], instanceIds: [],
  tagIds: [], windowStatus: 'all', order: 'newest',
};


export default function ConversationList({
  conversations, activeId, onSelect, loading,
  onBulkFinish, onBulkTransferAgent, onBulkTransferDept,
}: ConversationListProps) {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const activeTab = 'all';
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ListFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<ListFilters>(emptyFilters);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Bulk select
  const [selectable, setSelectable] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  // Actions menu
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const bulkRef = useRef<HTMLDivElement>(null);

  // Bell / notifications
  const [showBell, setShowBell] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const bellRef = useRef<HTMLDivElement>(null);

  // Filter data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<Pick<User, 'id' | 'name'>[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [instances, setInstances] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (showFilters) {
      api.get('/api/departments').then(({ data }) => setDepartments(data)).catch(() => {});
      api.get('/api/users').then(({ data }) => setAgents(data)).catch(() => {});
      api.get('/api/tags').then(({ data }) => setTags(data)).catch(() => {});
      // Extract instances from conversations
      const seen = new Map<string, { id: string; name: string }>();
      conversations.forEach((c) => {
        if (c.channelInstance) seen.set(c.channelInstance.id, { id: c.channelInstance.id, name: c.channelInstance.name });
      });
      setInstances(Array.from(seen.values()));
    }
  }, [showFilters]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setShowActionsMenu(false);
      if (bulkRef.current && !bulkRef.current.contains(e.target as Node)) setShowBulkMenu(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyFilters = () => {
    setAppliedFilters(filters);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const hasActiveFilters = Object.values(appliedFilters).some((v) =>
    Array.isArray(v) ? v.length > 0 : v !== 'all' && v !== 'newest'
  );

  const filtered = conversations.filter((c) => {
    // Search: name, phone, or last message content
    if (search) {
      const q = search.toLowerCase();
      const matchesName = c.lead?.name?.toLowerCase().includes(q);
      const matchesPhone = c.lead?.phone?.includes(search);
      const matchesMsg = c.messages?.[0]?.content?.toLowerCase().includes(q);
      const matchesCompany = c.lead?.company?.toLowerCase().includes(q);
      if (!matchesName && !matchesPhone && !matchesMsg && !matchesCompany) return false;
    }

    // Hide resolved by default
    if (c.status === 'RESOLVED') return false;

    // Applied advanced filters
    if (appliedFilters.departmentIds.length > 0 && (!c.departmentId || !appliedFilters.departmentIds.includes(c.departmentId))) return false;
    if (appliedFilters.assigneeIds.length > 0 && (!c.assignedUserId || !appliedFilters.assigneeIds.includes(c.assignedUserId))) return false;
    if (appliedFilters.instanceIds.length > 0 && (!c.channelInstanceId || !appliedFilters.instanceIds.includes(c.channelInstanceId))) return false;
    if (appliedFilters.tagIds.length > 0 && !c.lead?.tags?.some(({ tag }) => appliedFilters.tagIds.includes(tag.id))) return false;

    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (appliedFilters.order === 'oldest') {
      return new Date(a.lastMessageAt).getTime() - new Date(b.lastMessageAt).getTime();
    }
    if (appliedFilters.order === 'unread') {
      const aUnread = a.messages?.filter((m) => m.direction === 'IN' && !m.isRead).length || 0;
      const bUnread = b.messages?.filter((m) => m.direction === 'IN' && !m.isRead).length || 0;
      if (bUnread !== aUnread) return bUnread - aUnread;
    }
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });

  const pendingCount = conversations.filter((c) => c.status === 'PENDING').length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(sorted.map((c) => c.id)));
  const clearSelection = () => { setSelectedIds(new Set()); setSelectable(false); };

  const toggleFilterSection = (s: string) => setExpandedSection((p) => p === s ? null : s);
  const toggleFilterArr = <K extends keyof ListFilters>(key: K, val: string) => {
    setFilters((prev) => {
      const arr = prev[key] as string[];
      return { ...prev, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  };

  return (
    <div className="flex h-full" style={{ width: 300 }}>
      {/* Main list panel */}
      <div className={`flex flex-col h-full border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all ${showFilters ? 'w-0 overflow-hidden' : 'w-full'}`}>

        {/* Header */}
        <div className="px-3 pt-3 pb-2 border-b border-slate-100 dark:border-slate-700 space-y-2 flex-shrink-0">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Atendimentos</span>
              {pendingCount > 0 && (
                <span className="ml-2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  {pendingCount} aguardando
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Bell */}
              <div ref={bellRef} className="relative">
                <button
                  onClick={() => { setShowBell(!showBell); if (!showBell) setReadIds(new Set(conversations.map((c) => c.id))); }}
                  className="relative p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Bell size={13} className="text-slate-500 dark:text-slate-400" />
                  {(() => {
                    const unread = conversations.filter((c) =>
                      !readIds.has(c.id) && (
                        c.status === 'PENDING' ||
                        (c.messages?.[0]?.direction === 'IN' && !c.messages[0].isRead)
                      )
                    ).length;
                    return unread > 0 ? (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    ) : null;
                  })()}
                </button>

                {showBell && (
                  <NotificationPanel
                    conversations={conversations}
                    onSelect={(c) => { onSelect(c); setShowBell(false); }}
                    onDismiss={() => setShowBell(false)}
                  />
                )}
              </div>
              <div ref={actionsRef} className="relative">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <MoreHorizontal size={13} className="text-slate-500 dark:text-slate-400" />
                </button>
                {showActionsMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-1 min-w-[180px] animate-fade-in-up">
                    <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ações</p>
                    <button
                      onClick={() => { setSelectable(true); setShowActionsMenu(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <CheckSquare size={12} className="text-slate-400" /> Habilitar seleção
                    </button>
                    <hr className="border-slate-100 dark:border-slate-700 my-1" />
                    <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ações em massa</p>
                    <button
                      onClick={() => { onBulkFinish?.(Array.from(selectedIds)); setShowActionsMenu(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Check size={12} className="text-slate-400" /> Finalizar conversas
                    </button>
                    <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                      <UserCheck size={12} className="text-slate-400" /> Transferir atendente
                    </button>
                    <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                      <ArrowRight size={12} className="text-slate-400" /> Transferir departamento
                    </button>
                    <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                      <Play size={12} className="text-slate-400" /> Executar automação
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search + filter */}
          <div className="relative flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquise seus contatos"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={10} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(true)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors flex-shrink-0 ${
                hasActiveFilters
                  ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-200 dark:border-brand-700 text-brand-700 dark:text-brand-300'
                  : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
              }`}
            >
              <Filter size={11} />
              Filtros
              {hasActiveFilters && (
                <span className="w-4 h-4 bg-brand-600 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                  {[appliedFilters.departmentIds, appliedFilters.assigneeIds, appliedFilters.instanceIds, appliedFilters.tagIds].filter((a) => a.length > 0).length + (appliedFilters.windowStatus !== 'all' ? 1 : 0) + (appliedFilters.order !== 'newest' ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* Bulk select bar */}
        {selectable && (
          <div className="flex items-center justify-between px-3 py-2 bg-brand-50 dark:bg-brand-900/20 border-b border-brand-100 dark:border-brand-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={selectAll} className="text-xs text-brand-700 dark:text-brand-400 font-medium hover:underline">
                Selecionar todos
              </button>
              <span className="text-xs text-slate-400">({selectedIds.size} selecionados)</span>
            </div>
            <div className="flex items-center gap-1" ref={bulkRef}>
              {selectedIds.size > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowBulkMenu(!showBulkMenu)}
                    className="text-xs bg-brand-600 text-white px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 hover:bg-brand-700"
                  >
                    Ações <ChevronDown size={10} />
                  </button>
                  {showBulkMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-1 min-w-[180px]">
                      <button
                        onClick={() => { onBulkFinish?.(Array.from(selectedIds)); clearSelection(); setShowBulkMenu(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <Check size={12} className="text-slate-400" /> Finalizar conversas
                      </button>
                      <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <UserCheck size={12} className="text-slate-400" /> Transferir atendente
                      </button>
                      <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <ArrowRight size={12} className="text-slate-400" /> Transferir departamento
                      </button>
                      <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <Play size={12} className="text-slate-400" /> Executar automação
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button onClick={clearSelection} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X size={13} className="text-slate-400" />
              </button>
            </div>
          </div>
        )}

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs px-4">
              Nenhuma conversa encontrada
            </div>
          ) : (
            sorted.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={activeId === conv.id}
                selectable={selectable}
                selected={selectedIds.has(conv.id)}
                onSelect={toggleSelect}
                onClick={() => onSelect(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* Filter Drawer */}
      {showFilters && (
        <div className="w-full flex flex-col h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
          {/* Drawer header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-slate-500" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Filtros</span>
            </div>
            <button onClick={() => setShowFilters(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              <X size={14} className="text-slate-400" />
            </button>
          </div>

          {/* Sections */}
          <div className="flex-1 overflow-y-auto">

            {/* Departamentos */}
            <FilterSection
              label="Departamentos"
              sublabel={filters.departmentIds.length > 0 ? `${filters.departmentIds.length} selecionado(s)` : 'Todos'}
              expanded={expandedSection === 'depts'}
              onToggle={() => toggleFilterSection('depts')}
            >
              {departments.length === 0
                ? <p className="text-xs text-slate-400 px-4 pb-3">Nenhum departamento</p>
                : departments.map((d) => (
                  <CheckItem key={d.id} label={d.name} color={d.color}
                    checked={filters.departmentIds.includes(d.id)}
                    onChange={() => toggleFilterArr('departmentIds', d.id)}
                  />
                ))
              }
            </FilterSection>

            {/* Atendentes */}
            <FilterSection
              label="Atendentes"
              sublabel={filters.assigneeIds.length > 0 ? `${filters.assigneeIds.length} selecionado(s)` : 'Todos'}
              expanded={expandedSection === 'agents'}
              onToggle={() => toggleFilterSection('agents')}
            >
              {agents.length === 0
                ? <p className="text-xs text-slate-400 px-4 pb-3">Nenhum atendente</p>
                : agents.map((a) => (
                  <CheckItem key={a.id} label={a.name}
                    checked={filters.assigneeIds.includes(a.id)}
                    onChange={() => toggleFilterArr('assigneeIds', a.id)}
                  />
                ))
              }
            </FilterSection>

            {/* Instâncias */}
            <FilterSection
              label="Instâncias"
              sublabel={filters.instanceIds.length > 0 ? `${filters.instanceIds.length} selecionada(s)` : 'Todos'}
              expanded={expandedSection === 'instances'}
              onToggle={() => toggleFilterSection('instances')}
            >
              {instances.length === 0
                ? <p className="text-xs text-slate-400 px-4 pb-3">Nenhuma instância</p>
                : instances.map((inst) => (
                  <CheckItem key={inst.id} label={inst.name}
                    checked={filters.instanceIds.includes(inst.id)}
                    onChange={() => toggleFilterArr('instanceIds', inst.id)}
                  />
                ))
              }
            </FilterSection>

            {/* Tags */}
            <FilterSection
              label="Tags"
              sublabel={filters.tagIds.length > 0 ? `${filters.tagIds.length} selecionada(s)` : 'Todos'}
              expanded={expandedSection === 'tags'}
              onToggle={() => toggleFilterSection('tags')}
            >
              {tags.length === 0
                ? <p className="text-xs text-slate-400 px-4 pb-3">Nenhuma tag</p>
                : tags.map((t) => (
                  <CheckItem key={t.id} label={t.name} color={t.color}
                    checked={filters.tagIds.includes(t.id)}
                    onChange={() => toggleFilterArr('tagIds', t.id)}
                  />
                ))
              }
            </FilterSection>

            {/* Janela em atendimento */}
            <FilterSection
              label="Janela em atendimento"
              sublabel={filters.windowStatus === 'all' ? 'Todos' : filters.windowStatus === 'open' ? 'Aberta' : 'Fechada'}
              expanded={expandedSection === 'window'}
              onToggle={() => toggleFilterSection('window')}
            >
              <div className="px-4 pb-3 space-y-1">
                {[['all', 'Todos'], ['open', 'Aberta'], ['closed', 'Fechada']].map(([val, label]) => (
                  <label key={val} className="flex items-center gap-2.5 py-1 cursor-pointer group">
                    <div
                      onClick={() => setFilters((p) => ({ ...p, windowStatus: val }))}
                      className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                        filters.windowStatus === val ? 'bg-brand-600 border-brand-600' : 'border-slate-300 group-hover:border-brand-400'
                      }`}
                    >
                      {filters.windowStatus === val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-xs text-slate-700 dark:text-slate-300">{label}</span>
                  </label>
                ))}
              </div>
            </FilterSection>

            {/* Ordem */}
            <FilterSection
              label="Ordem"
              sublabel={filters.order === 'newest' ? 'Mais recentes' : filters.order === 'oldest' ? 'Mais antigas' : 'Não lidas'}
              expanded={expandedSection === 'order'}
              onToggle={() => toggleFilterSection('order')}
            >
              <div className="px-4 pb-3 space-y-1">
                {[['newest', 'Mais recentes'], ['oldest', 'Mais antigas'], ['unread', 'Não lidas']].map(([val, label]) => (
                  <label key={val} className="flex items-center gap-2.5 py-1 cursor-pointer group">
                    <div
                      onClick={() => setFilters((p) => ({ ...p, order: val }))}
                      className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                        filters.order === val ? 'bg-brand-600 border-brand-600' : 'border-slate-300 group-hover:border-brand-400'
                      }`}
                    >
                      {filters.order === val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-xs text-slate-700 dark:text-slate-300">{label}</span>
                  </label>
                ))}
              </div>
            </FilterSection>

          </div>

          {/* Footer actions */}
          <div className="border-t border-slate-100 dark:border-slate-700 p-3 flex gap-2 flex-shrink-0">
            <button
              onClick={clearFilters}
              className="flex-1 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Limpar filtros
            </button>
            <button
              onClick={applyFilters}
              className="flex-1 py-2 text-xs font-medium text-white rounded-xl transition-colors"
              style={{ backgroundColor: '#00A34D' }}
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

// ── NotificationPanel ──

function NotificationPanel({ conversations, onSelect, onDismiss }: {
  conversations: Conversation[];
  onSelect: (c: Conversation) => void;
  onDismiss: () => void;
}) {
  const pending = conversations.filter((c) => c.status === 'PENDING');
  const withUnread = conversations.filter(
    (c) => c.status !== 'PENDING' && c.messages?.[0]?.direction === 'IN' && !c.messages[0].isRead
  );
  const total = pending.length + withUnread.length;

  return (
    <div className="absolute left-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-40 w-72 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Bell size={13} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Notificações</span>
          {total > 0 && (
            <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{total}</span>
          )}
        </div>
        <button onClick={onDismiss} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
          <X size={12} className="text-slate-400" />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {total === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
            <BellOff size={22} className="mb-2 opacity-40" />
            <p className="text-xs font-medium">Tudo em dia!</p>
            <p className="text-[11px] mt-0.5">Sem notificações pendentes</p>
          </div>
        )}

        {pending.length > 0 && (
          <>
            <div className="px-3 pt-2.5 pb-1">
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Clock size={9} /> Aguardando atendimento ({pending.length})
              </p>
            </div>
            {pending.map((c) => (
              <NotifItem
                key={c.id}
                name={c.lead?.name || 'Lead'}
                sub={c.lead?.phone || c.channelInstance?.name || ''}
                time={formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true, locale: ptBR })}
                preview={c.messages?.[0]?.content || 'Sem mensagem'}
                dot="bg-amber-400"
                onClick={() => onSelect(c)}
              />
            ))}
          </>
        )}

        {withUnread.length > 0 && (
          <>
            <div className="px-3 pt-2.5 pb-1">
              <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1">
                <MessageSquare size={9} /> Mensagens não lidas ({withUnread.length})
              </p>
            </div>
            {withUnread.map((c) => (
              <NotifItem
                key={c.id}
                name={c.lead?.name || 'Lead'}
                sub={c.lead?.phone || c.channelInstance?.name || ''}
                time={formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true, locale: ptBR })}
                preview={c.messages?.[0]?.content || 'Nova mensagem'}
                dot="bg-brand-500"
                onClick={() => onSelect(c)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function NotifItem({ name, sub, time, preview, dot, onClick }: {
  name: string; sub: string; time: string; preview: string; dot: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
    >
      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{name}</span>
          <span className="text-[10px] text-slate-400 flex-shrink-0 tabular-nums">{time}</span>
        </div>
        {sub && <p className="text-[10px] text-slate-400 truncate">{sub}</p>}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{preview}</p>
      </div>
    </button>
  );
}

// ── FilterSection ──

function FilterSection({ label, sublabel, expanded, onToggle, children }: {
  label: string; sublabel: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 dark:border-slate-700 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="text-left">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
          <p className="text-xs text-brand-600 dark:text-brand-400 mt-0.5">{sublabel}</p>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && children}
    </div>
  );
}

function CheckItem({ label, color, checked, onChange }: {
  label: string; color?: string; checked: boolean; onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2.5 px-4 py-1.5 cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-700/50">
      <div
        onClick={onChange}
        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
          checked ? 'bg-brand-600 border-brand-600' : 'border-slate-300 group-hover:border-brand-400'
        }`}
      >
        {checked && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      {color && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
      <span className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1">{label}</span>
    </label>
  );
}
