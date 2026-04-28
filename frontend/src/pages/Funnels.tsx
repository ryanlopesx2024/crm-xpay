import { useState, useEffect, useRef } from 'react';
import { GitMerge, Upload, Play, Trash2, ToggleLeft, ToggleRight, List, X, ChevronDown } from 'lucide-react';
import api from '../services/api';

interface Funnel {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
}

interface Channel {
  id: string;
  name: string;
  status: string;
}

interface Execution {
  id: string;
  leadId: string;
  currentBlockId: string;
  waitingInput: boolean;
  status: string;
  startedAt: string;
  completedAt?: string;
}

export default function Funnels() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [triggerFunnelId, setTriggerFunnelId] = useState<string | null>(null);
  const [execFunnelId, setExecFunnelId] = useState<string | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [triggerForm, setTriggerForm] = useState({ leadId: '', channelId: '' });
  const [leadSearch, setLeadSearch] = useState('');
  const [triggerLoading, setTriggerLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchFunnels = async () => {
    try {
      const { data } = await api.get('/api/funnels');
      setFunnels(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFunnels(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setJsonText(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!jsonText.trim()) return;
    setImporting(true);
    try {
      await api.post('/api/funnels/import', { jsonData: jsonText });
      setJsonText('');
      setShowImport(false);
      fetchFunnels();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao importar');
    } finally {
      setImporting(false);
    }
  };

  const handleToggle = async (id: string) => {
    await api.patch(`/api/funnels/${id}/toggle`);
    fetchFunnels();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este funil e todas as execuções?')) return;
    await api.delete(`/api/funnels/${id}`);
    fetchFunnels();
  };

  const openTrigger = async (funnelId: string) => {
    setTriggerFunnelId(funnelId);
    setTriggerForm({ leadId: '', channelId: '' });
    setLeadSearch('');
    const [leadsRes, channelsRes] = await Promise.all([
      api.get('/api/leads?limit=50'),
      api.get('/api/channels'),
    ]);
    setLeads(leadsRes.data?.leads || leadsRes.data || []);
    setChannels((channelsRes.data || []).filter((c: Channel) => c.status === 'CONNECTED'));
  };

  const handleTrigger = async () => {
    if (!triggerFunnelId || !triggerForm.leadId || !triggerForm.channelId) return;
    setTriggerLoading(true);
    try {
      await api.post(`/api/funnels/${triggerFunnelId}/trigger`, triggerForm);
      alert('Funil iniciado com sucesso!');
      setTriggerFunnelId(null);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao iniciar funil');
    } finally {
      setTriggerLoading(false);
    }
  };

  const openExecutions = async (funnelId: string) => {
    setExecFunnelId(funnelId);
    const { data } = await api.get(`/api/funnels/${funnelId}/executions`);
    setExecutions(data);
  };

  const filteredLeads = leads.filter(
    (l) =>
      !leadSearch ||
      l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
      (l.phone || '').includes(leadSearch),
  );

  const statusColor = (status: string) => {
    if (status === 'RUNNING') return 'text-blue-500';
    if (status === 'COMPLETED') return 'text-green-500';
    if (status === 'FAILED' || status === 'ABORTED') return 'text-red-500';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <GitMerge className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold dark:text-white">Funis de Vendas</h1>
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Upload className="w-4 h-4" />
          Importar JSON
        </button>
      </div>

      {/* Funnel list */}
      {funnels.length === 0 ? (
        <div className="text-center py-16 dark:text-gray-400">
          <GitMerge className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Nenhum funil importado</p>
          <p className="text-sm mt-1">Importe um JSON de automação para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {funnels.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
            >
              <div>
                <p className="font-semibold dark:text-white">{f.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Criado em {new Date(f.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    f.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {f.active ? 'Ativo' : 'Inativo'}
                </span>
                <button
                  onClick={() => openExecutions(f.id)}
                  title="Ver execuções"
                  className="p-2 text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openTrigger(f.id)}
                  title="Disparar funil"
                  className="p-2 text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggle(f.id)}
                  title={f.active ? 'Desativar' : 'Ativar'}
                  className="p-2 text-gray-500 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {f.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDelete(f.id)}
                  title="Excluir"
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
              <h2 className="font-bold text-lg dark:text-white">Importar Funil JSON</h2>
              <button onClick={() => setShowImport(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Selecionar arquivo .json
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors w-full justify-center"
                >
                  <Upload className="w-4 h-4" />
                  Clique para selecionar
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Ou cole o JSON aqui
                </label>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder='{"name":"Meu Funil","blocks":[...]}'
                  rows={8}
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono dark:bg-gray-900 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleImport}
                disabled={!jsonText.trim() || importing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                {importing ? 'Importando...' : 'Importar Funil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger modal */}
      {triggerFunnelId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
              <h2 className="font-bold text-lg dark:text-white">Disparar Funil</h2>
              <button onClick={() => setTriggerFunnelId(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Lead
                </label>
                <input
                  type="text"
                  placeholder="Buscar por nome ou telefone..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                />
                <select
                  value={triggerForm.leadId}
                  onChange={(e) => setTriggerForm((f) => ({ ...f, leadId: e.target.value }))}
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecionar lead...</option>
                  {filteredLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.phone ? `(${l.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Canal WhatsApp (conectado)
                </label>
                <select
                  value={triggerForm.channelId}
                  onChange={(e) => setTriggerForm((f) => ({ ...f, channelId: e.target.value }))}
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecionar canal...</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {channels.length === 0 && (
                  <p className="text-xs text-red-400 mt-1">Nenhum canal conectado. Configure em Configurações → Canais.</p>
                )}
              </div>
              <button
                onClick={handleTrigger}
                disabled={!triggerForm.leadId || !triggerForm.channelId || triggerLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                {triggerLoading ? 'Iniciando...' : 'Iniciar Funil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Executions modal */}
      {execFunnelId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b dark:border-gray-700 flex-shrink-0">
              <h2 className="font-bold text-lg dark:text-white">Execuções do Funil</h2>
              <button onClick={() => setExecFunnelId(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {executions.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Nenhuma execução encontrada</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b dark:border-gray-700">
                      <th className="pb-2">Lead ID</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Aguardando</th>
                      <th className="pb-2">Início</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {executions.map((ex) => (
                      <tr key={ex.id}>
                        <td className="py-2 dark:text-gray-300 font-mono text-xs">{ex.leadId.slice(0, 8)}…</td>
                        <td className={`py-2 font-medium ${statusColor(ex.status)}`}>{ex.status}</td>
                        <td className="py-2 dark:text-gray-300">{ex.waitingInput ? '⏳ Sim' : '—'}</td>
                        <td className="py-2 text-gray-400">{new Date(ex.startedAt).toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
