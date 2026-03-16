import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Search, ChevronDown, Power, GripVertical, Zap } from 'lucide-react';
import { useAutomation } from '../hooks/useAutomation';
import { Automation } from '../types';
import AutomationCanvas from '../components/automation/AutomationCanvas';

export default function Automacoes() {
  const {
    automations,
    loading,
    fetchAutomations,
    createAutomation,
    updateAutomation,
    toggleAutomation,
    deleteAutomation,
  } = useAutomation();

  const [selected, setSelected] = useState<Automation | null>(null);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => { fetchAutomations(); }, [fetchAutomations]);

  // Group by suffix after last " - " (e.g. "Codigo Enviado - Erectron" → group "Erectron")
  const grouped = useMemo(() => {
    const filtered = automations.filter((a) =>
      a.name.toLowerCase().includes(search.toLowerCase())
    );
    const map = new Map<string, Automation[]>();
    for (const a of filtered) {
      const parts = a.name.split(' - ');
      const group = parts.length > 1 ? parts[parts.length - 1].trim() : 'Geral';
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(a);
    }
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
  }, [automations, search]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const created = await createAutomation(newName.trim());
    setNewName('');
    setCreating(false);
    setSelected(created);
  };

  const handleSaveFlow = async (flow: { nodes: unknown[]; edges: unknown[] }) => {
    if (!selected) return;
    const updated = await updateAutomation(selected.id, { flow: flow as Automation['flow'] });
    setSelected(updated);
  };

  const handleToggle = async () => {
    if (!selected) return;
    const updated = await toggleAutomation(selected.id);
    setSelected(updated);
  };

  const handleDelete = async () => {
    if (!selected || !confirm('Deletar esta automação?')) return;
    await deleteAutomation(selected.id);
    setSelected(null);
  };

  const toggleGroup = (name: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left sidebar ── */}
      <div className="w-56 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        {/* Title */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Automações</h2>
        </div>

        {/* Search */}
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder=""
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Add button */}
        <div className="px-3 pb-3">
          <button
            onClick={() => setCreating(true)}
            style={{ backgroundColor: '#00A34D' }}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-white rounded-lg font-medium hover:opacity-90 transition-all"
          >
            <Plus size={12} />
            Adicionar automação
          </button>
        </div>

        {/* Grouped list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1 px-2 pt-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-7 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <p className="text-xs text-slate-400 text-center px-4 py-6">Nenhuma automação</p>
          ) : (
            grouped.map(({ name: groupName, items }) => (
              <div key={groupName}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span>{groupName}</span>
                  <ChevronDown
                    size={11}
                    className={`transition-transform text-slate-400 ${collapsedGroups.has(groupName) ? '-rotate-90' : ''}`}
                  />
                </button>

                {/* Items */}
                {!collapsedGroups.has(groupName) &&
                  items.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors group ${
                        selected?.id === a.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-l-2 border-transparent'
                      }`}
                    >
                      <Power
                        size={11}
                        className={a.isActive ? 'text-brand-500 flex-shrink-0' : 'text-slate-300 dark:text-slate-600 flex-shrink-0'}
                      />
                      <span
                        className={`flex-1 text-[11px] truncate leading-tight ${
                          selected?.id === a.id
                            ? 'text-blue-700 dark:text-blue-400 font-medium'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {a.name.replace(new RegExp(` - ${groupName}$`), '').trim() || a.name}
                      </span>
                      <GripVertical
                        size={11}
                        className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 flex-shrink-0"
                      />
                    </button>
                  ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Main canvas area ── */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-900">
        {selected ? (
          <AutomationCanvas
            automation={selected}
            onSave={handleSaveFlow}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <Zap size={26} className="text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
              Selecione uma automação
            </p>
            <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
              ou crie uma nova na barra lateral
            </p>
          </div>
        )}
      </div>

      {/* ── Create modal ── */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-96 animate-fade-in-up">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Nova automação
            </h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Nome da automação"
              className="w-full text-sm border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setCreating(false); setNewName(''); }}
                className="flex-1 py-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                style={newName.trim() ? { backgroundColor: '#00A34D' } : {}}
                className="flex-1 py-2 text-sm text-white rounded-xl disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed hover:opacity-90 transition-all"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
