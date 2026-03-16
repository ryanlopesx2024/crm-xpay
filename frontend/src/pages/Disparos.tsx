import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Play, Pause, Trash2, Eye, X, Users, Clock, Send, ChevronRight, ChevronLeft } from 'lucide-react';
import api from '../services/api';

interface Campaign {
  id: string;
  name: string;
  status: string;
  targetType: string;
  targetCount: number;
  message: string;
  delay: number;
  scheduledAt?: string;
  sentCount: number;
  errorCount: number;
  responseCount: number;
  createdAt: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  'Rascunho': { bg: 'bg-slate-100', text: 'text-slate-600' },
  'Agendada': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Em envio': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'Concluida': { bg: 'bg-green-100', text: 'text-green-700' },
  'Pausada': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'Cancelada': { bg: 'bg-red-100', text: 'text-red-700' },
};

export default function Disparos() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null);
  const [wizardStep, setWizardStep] = useState(1);

  // Form fields
  const [name, setName] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [targetCount, setTargetCount] = useState(50);
  const [message, setMessage] = useState('');
  const [delay, setDelay] = useState(10);
  const [scheduleType, setScheduleType] = useState<'now' | 'scheduled'>('now');
  const [scheduledAt, setScheduledAt] = useState('');

  const fetchData = async () => {
    try {
      const { data } = await api.get('/api/campaigns');
      setCampaigns(data);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    try {
      await api.post('/api/campaigns', {
        name,
        targetType,
        targetCount,
        message,
        delay,
        scheduledAt: scheduleType === 'scheduled' ? scheduledAt : undefined,
        status: scheduleType === 'scheduled' ? 'Agendada' : 'Rascunho',
      });
      resetForm();
      fetchData();
    } catch {
      // empty
    }
  };

  const handleStart = async (id: string) => {
    try {
      await api.post(`/api/campaigns/${id}/start`);
      fetchData();
    } catch {
      // empty
    }
  };

  const handlePause = async (id: string) => {
    try {
      await api.post(`/api/campaigns/${id}/pause`);
      fetchData();
    } catch {
      // empty
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta campanha?')) return;
    try {
      await api.delete(`/api/campaigns/${id}`);
      fetchData();
    } catch {
      // empty
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setWizardStep(1);
    setName('');
    setTargetType('all');
    setTargetCount(50);
    setMessage('');
    setDelay(10);
    setScheduleType('now');
    setScheduledAt('');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
              <Megaphone size={20} className="text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Disparos em Massa</h1>
              <p className="text-sm text-slate-500">Campanhas de WhatsApp para seus leads</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus size={16} />
            Nova Campanha
          </button>
        </div>

        {/* Campaign List */}
        {loading ? (
          <div className="text-center p-8 text-slate-400">Carregando...</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <Megaphone size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">Nenhuma campanha criada</p>
            <p className="text-xs text-slate-400 mt-1">Crie campanhas para enviar mensagens em massa</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Leads</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Progresso</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Data</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(campaign => {
                  const sc = statusColors[campaign.status] || statusColors['Rascunho'];
                  const progress = campaign.targetCount > 0 ? Math.round((campaign.sentCount / campaign.targetCount) * 100) : 0;
                  return (
                    <tr key={campaign.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{campaign.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${sc.bg} ${sc.text}`}>{campaign.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{campaign.targetCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{campaign.sentCount}/{campaign.targetCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{new Date(campaign.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewCampaign(campaign)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand-600" title="Ver detalhes">
                            <Eye size={14} />
                          </button>
                          {(campaign.status === 'Rascunho' || campaign.status === 'Pausada') && (
                            <button onClick={() => handleStart(campaign.id)} className="p-1.5 rounded-lg hover:bg-green-100 text-slate-400 hover:text-green-600" title="Iniciar">
                              <Play size={14} />
                            </button>
                          )}
                          {campaign.status === 'Em envio' && (
                            <button onClick={() => handlePause(campaign.id)} className="p-1.5 rounded-lg hover:bg-orange-100 text-slate-400 hover:text-orange-600" title="Pausar">
                              <Pause size={14} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(campaign.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500" title="Excluir">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Campaign Modal */}
      {viewCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{viewCampaign.name}</h2>
              <button onClick={() => setViewCampaign(null)} className="p-1 rounded-lg hover:bg-slate-100"><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{viewCampaign.sentCount}</p>
                  <p className="text-xs text-blue-600">Enviados</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-green-700">{viewCampaign.responseCount}</p>
                  <p className="text-xs text-green-600">Respostas</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-red-700">{viewCampaign.errorCount}</p>
                  <p className="text-xs text-red-600">Erros</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Mensagem</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 rounded-xl p-3">{viewCampaign.message || 'Sem mensagem definida'}</p>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Delay: {viewCampaign.delay}s</span>
                <span>Criada em {new Date(viewCampaign.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal (Wizard) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nova Campanha</h2>
              <button onClick={resetForm} className="p-1 rounded-lg hover:bg-slate-100"><X size={18} className="text-slate-400" /></button>
            </div>

            {/* Wizard Steps Indicator */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${wizardStep >= s ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{s}</div>
                  <span className={`text-xs ${wizardStep >= s ? 'text-brand-600 font-medium' : 'text-slate-400'}`}>
                    {s === 1 ? 'Audiencia' : s === 2 ? 'Mensagem' : 'Agendar'}
                  </span>
                </div>
              ))}
            </div>

            {/* Step 1 - Audiencia */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da campanha</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Ex: Lancamento Curso de Marketing"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Audiencia</label>
                  <select value={targetType} onChange={e => setTargetType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="all">Todos os leads</option>
                    <option value="tag">Por tag</option>
                    <option value="list">Lista especifica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantidade estimada de leads</label>
                  <input type="number" value={targetCount} onChange={e => setTargetCount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="bg-brand-50 rounded-xl p-3 flex items-center gap-2">
                  <Users size={16} className="text-brand-600" />
                  <span className="text-sm text-brand-700 font-medium">{targetCount} leads selecionados</span>
                </div>
              </div>
            )}

            {/* Step 2 - Mensagem */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mensagem</label>
                  <p className="text-xs text-slate-400 mb-1">Variaveis: {'{nome}'}, {'{produto}'}, {'{valor}'}</p>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    rows={4}
                    placeholder="Ola {nome}! Temos uma oferta especial do {produto} para voce..."
                  />
                </div>
                {message && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Preview</p>
                    <div className="bg-green-50 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300">
                      {message.replace('{nome}', 'Joao').replace('{produto}', 'Curso de Marketing').replace('{valor}', 'R$ 297')}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Delay entre mensagens (anti-ban)</label>
                  <select value={delay} onChange={e => setDelay(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value={5}>5 segundos</option>
                    <option value={10}>10 segundos</option>
                    <option value={30}>30 segundos</option>
                    <option value={60}>1 minuto</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 3 - Agendamento */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quando enviar?</label>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${scheduleType === 'now' ? 'border-brand-300 bg-brand-50' : 'border-slate-200'}`}>
                      <input type="radio" name="schedule" checked={scheduleType === 'now'} onChange={() => setScheduleType('now')} className="accent-brand-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Enviar agora</p>
                        <p className="text-xs text-slate-400">A campanha sera salva como rascunho para voce iniciar manualmente</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${scheduleType === 'scheduled' ? 'border-brand-300 bg-brand-50' : 'border-slate-200'}`}>
                      <input type="radio" name="schedule" checked={scheduleType === 'scheduled'} onChange={() => setScheduleType('scheduled')} className="accent-brand-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Agendar</p>
                        <p className="text-xs text-slate-400">Escolha data e hora para enviar automaticamente</p>
                      </div>
                    </label>
                  </div>
                </div>
                {scheduleType === 'scheduled' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data e Hora</label>
                    <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                )}
                <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-medium text-slate-500">Resumo da campanha</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{name || 'Sem nome'}</p>
                  <p className="text-xs text-slate-500">{targetCount} leads &middot; Delay: {delay}s</p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              {wizardStep > 1 ? (
                <button onClick={() => setWizardStep(wizardStep - 1)} className="flex items-center gap-1 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  <ChevronLeft size={16} /> Voltar
                </button>
              ) : <div />}
              {wizardStep < 3 ? (
                <button onClick={() => setWizardStep(wizardStep + 1)}
                  disabled={wizardStep === 1 && !name}
                  className="flex items-center gap-1 px-4 py-2 bg-brand-600 text-white text-sm rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50">
                  Proximo <ChevronRight size={16} />
                </button>
              ) : (
                <button onClick={handleCreate}
                  className="flex items-center gap-1 px-4 py-2 bg-brand-600 text-white text-sm rounded-xl hover:bg-brand-700 transition-colors">
                  <Send size={16} /> Criar Campanha
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
