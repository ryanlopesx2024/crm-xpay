import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Plus, Search, ChevronDown, Power, GripVertical, Trash2, Zap,
  AlertTriangle, History, CheckCircle2, XCircle, Loader2, ChevronRight, RefreshCw,
  Upload, X,
} from 'lucide-react';

// ── Funnel JSON → CRM flow converter ─────────────────────────────────────────

// Maps funnel step to ContentItem format expected by ConfigPanel
function stepToContentItem(m: any, idx: number): Record<string, any> {
  const id = m.stepId || String(idx);
  if (m.name === 'delay-message') {
    return { id, type: 'delay', delay: m.options?.seconds || 1, unit: 'SECONDS' };
  }
  if (m.name === 'send-text-message') {
    return { id, type: 'text', text: m.options?.text || '' };
  }
  if (m.name === 'text-input-message') {
    return { id, type: 'user_input', text: m.options?.text || '', placeholder: m.options?.text || '', variable: m.options?.parameter || '' };
  }
  if (m.name === 'send-file-message') {
    const mime: string = m.options?.mimeType || '';
    if (mime.startsWith('audio/')) return { id, type: 'audio', url: m.options?.url || '', text: m.options?.filename || '' };
    // image, video, document all → attachment
    return { id, type: 'attachment', url: m.options?.url || '', text: m.options?.filename || '' };
  }
  return { id, type: 'text', text: '' };
}

function funnelJsonToFlow(funnelJson: any): { nodes: any[]; edges: any[] } {
  const blocks: any[] = funnelJson.blocks || [];
  const nodes: any[] = [];
  const edges: any[] = [];

  for (const block of blocks) {
    const x = block.presentation?.x ?? 0;
    const y = block.presentation?.y ?? 0;

    let nodeType = 'action';
    let data: Record<string, any> = {};

    switch (block.type) {
      case 'trigger':
        nodeType = 'trigger';
        data = { type: 'MESSAGE_RECEIVED', label: 'Gatilho - Funil' };
        break;

      case 'chat': {
        const msgs: any[] = block.options?.messages || [];
        const firstText = msgs.find((m: any) => m.name === 'send-text-message');
        const label = firstText?.options?.text
          ? firstText.options.text.slice(0, 40) + (firstText.options.text.length > 40 ? '…' : '')
          : 'Enviar Mensagem';
        const contents = msgs.map((m: any, i: number) => stepToContentItem(m, i));
        data = { action: 'SEND_MESSAGE', label, contents, items: contents };
        break;
      }

      case 'action': {
        const actions: any[] = block.options?.actions || [];
        const tagAct = actions.find((a: any) => a.name === 'add-tag-action');
        const moveAct = actions.find((a: any) => a.name === 'move-business-action');
        const agentAct = actions.find((a: any) => a.name === 'add-attendant-on-business-action');
        if (tagAct) {
          data = { action: 'ADD_TAG', label: 'Adicionar Tag' };
        } else if (moveAct) {
          data = { action: 'MOVE_PIPELINE', label: 'Mover Etapa' };
        } else if (agentAct) {
          data = { action: 'ASSIGN_AGENT', label: 'Atribuir Atendente' };
        } else {
          data = { action: 'SEND_MESSAGE', label: 'Ação CRM', contents: [], items: [] };
        }
        break;
      }

      case 'delay': {
        const hours = block.options?.delay?.options?.hours || 0;
        const minutes = block.options?.delay?.options?.minutes || 0;
        nodeType = 'delay';
        data = {
          delay: hours || minutes || 1,
          unit: hours ? 'HOURS' : 'MINUTES',
          label: `Aguardar ${hours ? `${hours}h` : `${minutes}min`}`,
        };
        break;
      }

      case 'api': {
        const apiDef = block.options?.apis?.[0];
        data = {
          action: 'HTTP_REQUEST',
          label: 'Webhook HTTP',
          url: apiDef?.options?.url || '',
          method: apiDef?.options?.method || 'POST',
        };
        break;
      }

      case 'randomizer':
      case 'condition':
        nodeType = 'condition';
        data = { condition: 'IF_THEN', label: block.type === 'randomizer' ? 'Randomizador' : 'Condição' };
        break;

      default:
        continue;
    }

    nodes.push({ id: block.id, type: nodeType, position: { x, y }, data });

    // edges from nextBlockId
    const nextId: string = block.options?.nextBlockId;
    if (nextId) {
      edges.push({ id: `e-${block.id}-${nextId}`, source: block.id, target: nextId, type: 'smoothstep' });
    }

    // randomizer edges
    if (block.type === 'randomizer') {
      for (const r of (block.options?.randomizers || [])) {
        if (r.nextBlockId) {
          edges.push({ id: `e-${block.id}-${r.id}`, source: block.id, target: r.nextBlockId, label: `${r.name} ${r.perc}%`, type: 'smoothstep' });
        }
      }
    }

    // condition edges
    if (block.type === 'condition') {
      if (block.options?.trueNextBlockId) {
        edges.push({ id: `e-${block.id}-true`, source: block.id, target: block.options.trueNextBlockId, sourceHandle: 'yes', label: 'Sim', type: 'smoothstep' });
      }
      if (block.options?.falseNextBlockId) {
        edges.push({ id: `e-${block.id}-false`, source: block.id, target: block.options.falseNextBlockId, sourceHandle: 'no', label: 'Não', type: 'smoothstep' });
      }
    }
  }

  return { nodes, edges };
}
import { useAutomation } from '../hooks/useAutomation';
import { Automation } from '../types';
import AutomationCanvas from '../components/automation/AutomationCanvas';
import api from '../services/api';

// ── History Panel ─────────────────────────────────────────────────────────────
function HistoryPanel({ automationId, onClose }: { automationId?: string; onClose: () => void }) {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const url = automationId
        ? `/api/automations/executions?automationId=${automationId}&limit=100`
        : '/api/automations/executions?limit=100';
      const { data } = await api.get(url);
      setExecutions(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [automationId]); // eslint-disable-line

  const statusIcon = (status: string) => {
    if (status === 'COMPLETED') return <CheckCircle2 size={14} className="text-emerald-500" />;
    if (status === 'FAILED') return <XCircle size={14} className="text-red-500" />;
    return <Loader2 size={14} className="text-amber-500 animate-spin" />;
  };

  const statusBg = (status: string) => {
    if (status === 'COMPLETED') return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400';
    if (status === 'FAILED') return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
    return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400';
  };

  return (
    <div className="absolute inset-0 bg-white dark:bg-slate-900 z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <History size={18} className="text-slate-500" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Histórico de Execuções</h3>
          {executions.length > 0 && (
            <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full">
              {executions.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            Fechar
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <History size={36} className="mb-3 text-slate-200 dark:text-slate-700" />
            <p className="text-sm font-medium">Nenhuma execução ainda</p>
            <p className="text-xs mt-1">As execuções aparecerão aqui quando as automações forem disparadas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {executions.map((exec) => (
              <div key={exec.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                {/* Row */}
                <button
                  onClick={() => setExpanded(expanded === exec.id ? null : exec.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                >
                  {statusIcon(exec.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {exec.automation?.name || 'Automação'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      Lead: {exec.lead?.name || exec.leadId} {exec.lead?.phone ? `· ${exec.lead.phone}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBg(exec.status)}`}>
                      {exec.status === 'COMPLETED' ? 'Concluído' : exec.status === 'FAILED' ? 'Falhou' : 'Executando'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(exec.startedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <ChevronRight size={12} className={`text-slate-300 transition-transform ${expanded === exec.id ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {/* Expanded log */}
                {expanded === exec.id && (
                  <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Log de execução</p>
                    {Array.isArray(exec.log) && exec.log.length > 0 ? (
                      <div className="space-y-1.5">
                        {exec.log.map((entry: any, i: number) => (
                          <div key={i} className={`flex items-start gap-2 text-[11px] rounded-lg px-2.5 py-1.5 ${
                            entry.error
                              ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                              : entry.action === 'STARTED'
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700'
                          }`}>
                            <span className="flex-shrink-0 font-mono text-slate-400">#{i}</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold">{entry.action || entry.type || 'step'}</span>
                              {entry.to && <span className="ml-1 text-slate-400">→ {entry.to}</span>}
                              {entry.tag && <span className="ml-1 text-slate-400">tag: {entry.tag}</span>}
                              {entry.result && <span className="ml-1 text-slate-400">({entry.result})</span>}
                              {entry.error && <span className="ml-1 font-mono block truncate">{entry.error}</span>}
                              {entry.skipped && <span className="ml-1 text-slate-300">(ignorado)</span>}
                            </div>
                            <span className="flex-shrink-0 text-slate-300 text-[9px]">
                              {entry.ts ? new Date(entry.ts).toLocaleTimeString('pt-BR') : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">Sem log disponível</p>
                    )}
                    {exec.completedAt && (
                      <p className="text-[9px] text-slate-400 mt-2">
                        Concluído em {new Date(exec.completedAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Automacoes() {
  const { automations, loading, fetchAutomations, createAutomation, updateAutomation, toggleAutomation, deleteAutomation } = useAutomation();

  const [selected, setSelected] = useState<Automation | null>(null);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<Automation | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAutomations();
    const interval = setInterval(fetchAutomations, 30000);
    return () => clearInterval(interval);
  }, [fetchAutomations]);

  const grouped = useMemo(() => {
    const filtered = automations.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
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
    setNewName(''); setCreating(false); setSelected(created);
  };

  const handleSaveFlow = async (flow: { nodes: unknown[]; edges: unknown[] }) => {
    if (!selected) return;
    const triggerNode = flow.nodes.find((n: any) => n.type === 'trigger') as any;
    const trigger = triggerNode?.data?.type
      ? { type: triggerNode.data.type, tagName: triggerNode.data.tagName || undefined }
      : selected.trigger;
    const updated = await updateAutomation(selected.id, { flow: flow as Automation['flow'], trigger } as any);
    setSelected(updated);
  };

  const handleToggle = async (automation: Automation, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = await toggleAutomation(automation.id);
    if (selected?.id === automation.id) setSelected(updated);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    await deleteAutomation(confirmDelete.id);
    if (selected?.id === confirmDelete.id) setSelected(null);
    setConfirmDelete(null);
  };

  const handleImportJson = async () => {
    if (!importJson.trim()) return;
    setImportLoading(true);
    try {
      const parsed = JSON.parse(importJson);
      const flow = funnelJsonToFlow(parsed);
      const created = await createAutomation(parsed.name || 'Funil importado');
      const updated = await updateAutomation(created.id, {
        flow: flow as Automation['flow'],
        trigger: { type: 'MESSAGE_RECEIVED' } as any,
      } as any);
      setImportJson('');
      setShowImport(false);
      setSelected(updated);
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.message || 'JSON inválido');
    } finally {
      setImportLoading(false);
    }
  };

  const toggleGroup = (name: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Sidebar ── */}
      <div className="w-56 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Automações</h2>
          <button
            onClick={() => { setShowHistory(true); setSelected(null); }}
            title="Histórico de execuções"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <History size={14} />
          </button>
        </div>

        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..."
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-slate-200" />
          </div>
        </div>

        <div className="px-3 pb-3 flex flex-col gap-1.5">
          <button onClick={() => setCreating(true)} style={{ backgroundColor: '#00A34D' }}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-white rounded-lg font-medium hover:opacity-90 transition-all">
            <Plus size={12} /> Adicionar automação
          </button>
          <button onClick={() => setShowImport(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg font-medium transition-all border border-blue-200 dark:border-blue-800">
            <Upload size={12} /> Importar JSON
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1 px-2 pt-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-7 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <p className="text-xs text-slate-400 text-center px-4 py-6">Nenhuma automação</p>
          ) : grouped.map(({ name: groupName, items }) => (
            <div key={groupName}>
              <button onClick={() => toggleGroup(groupName)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <span>{groupName}</span>
                <ChevronDown size={11} className={`transition-transform text-slate-400 ${collapsedGroups.has(groupName) ? '-rotate-90' : ''}`} />
              </button>

              {!collapsedGroups.has(groupName) && items.map((a) => (
                <div key={a.id} onClick={() => { setSelected(a); setShowHistory(false); }}
                  className={`w-full flex items-center gap-1.5 px-3 py-2 text-left transition-colors group cursor-pointer ${
                    selected?.id === a.id && !showHistory
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-l-2 border-transparent'
                  }`}
                >
                  <button onClick={(e) => handleToggle(a, e)} title={a.isActive ? 'Desativar' : 'Ativar'}
                    className={`flex-shrink-0 p-0.5 rounded transition-colors ${a.isActive ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'}`}>
                    <Power size={11} />
                  </button>
                  <span className={`flex-1 text-[11px] truncate leading-tight ${
                    selected?.id === a.id && !showHistory ? 'text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {a.name.replace(new RegExp(` - ${groupName}$`), '').trim() || a.name}
                  </span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0">
                    <GripVertical size={10} className="text-slate-300 dark:text-slate-600" />
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(a); }} title="Deletar"
                      className="p-0.5 rounded text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-900 relative">
        {showHistory ? (
          <HistoryPanel
            automationId={selected?.id}
            onClose={() => setShowHistory(false)}
          />
        ) : selected ? (
          <AutomationCanvas
            automation={automations.find(a => a.id === selected.id) || selected}
            onSave={handleSaveFlow}
            onToggle={() => handleToggle(selected)}
            onDelete={() => setConfirmDelete(selected)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <Zap size={26} className="text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Selecione uma automação</p>
            <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">ou crie uma nova na barra lateral</p>
            <button onClick={() => setShowHistory(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-sm transition-all">
              <History size={13} /> Ver histórico de execuções
            </button>
          </div>
        )}
      </div>

      {/* ── Import JSON modal ── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Upload size={16} className="text-blue-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Importar Funil JSON</h3>
              </div>
              <button onClick={() => { setShowImport(false); setImportJson(''); }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                ref={importFileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => setImportJson(ev.target?.result as string);
                  reader.readAsText(file);
                }}
              />
              <button
                onClick={() => importFileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl py-4 text-sm text-slate-400 hover:text-blue-500 transition-colors"
              >
                <Upload size={16} />
                {importJson ? '✓ Arquivo carregado — ou cole abaixo' : 'Clique para selecionar arquivo .json'}
              </button>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='Cole o JSON do funil aqui...'
                rows={10}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-xs font-mono dark:bg-slate-900 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowImport(false); setImportJson(''); }}
                  className="flex-1 py-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportJson}
                  disabled={!importJson.trim() || importLoading}
                  className="flex-1 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {importLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {importLoading ? 'Importando...' : 'Importar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create modal ── */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-96">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Nova automação</h3>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()} placeholder="Nome da automação"
              className="w-full text-sm border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
              autoFocus />
            <div className="flex gap-2">
              <button onClick={() => { setCreating(false); setNewName(''); }}
                className="flex-1 py-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={!newName.trim()}
                style={newName.trim() ? { backgroundColor: '#00A34D' } : {}}
                className="flex-1 py-2 text-sm text-white rounded-xl disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed hover:opacity-90 transition-all">
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-96">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Deletar automação</h3>
                <p className="text-xs text-slate-500 mt-0.5">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
              Tem certeza que deseja deletar <strong>"{confirmDelete.name}"</strong>?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button onClick={handleDeleteConfirm}
                className="flex-1 py-2 text-sm text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
