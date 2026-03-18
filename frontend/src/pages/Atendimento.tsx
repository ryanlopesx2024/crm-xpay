import { useEffect, useState, useRef, useCallback } from 'react';
import { useConversation } from '../hooks/useConversation';
import { useConversationStore } from '../stores/conversationStore';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import LeadPanel from '../components/chat/LeadPanel';
import { MessageSquare, Search, X, Loader2, Phone, Send } from 'lucide-react';
import api from '../services/api';

// ── tipos locais ──────────────────────────────────────────────────────────────
interface LeadResult {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
}

interface ChannelOption {
  id: string;
  name: string;
  identifier: string;
  type: string;
  status: string;
}

// ── Modal nova conversa ───────────────────────────────────────────────────────
function NewConversationModal({
  onClose,
  onOpened,
}: {
  onClose: () => void;
  onOpened: (conv: import('../types').Conversation) => void;
}) {
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState<LeadResult[]>([]);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadResult | null>(null);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega canais conectados
  useEffect(() => {
    api.get('/api/channels').then(({ data }) => {
      const connected = (data as ChannelOption[]).filter(
        (c) => c.status === 'CONNECTED' && (c.type === 'WHATSAPP_EVOLUTION' || c.type.includes('CLOUD'))
      );
      setChannels(connected);
      if (connected.length === 1) setSelectedChannel(connected[0].id);
    }).catch(() => {});
  }, []);

  // Busca leads com debounce
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!search.trim()) { setLeads([]); return; }
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/api/leads?search=${encodeURIComponent(search)}&limit=8`);
        setLeads(data);
      } catch { setLeads([]); }
      finally { setSearching(false); }
    }, 300);
  }, [search]);

  const handleSend = async () => {
    if (!selectedLead) { setError('Selecione um lead'); return; }
    if (!selectedChannel) { setError('Selecione um canal'); return; }
    if (!message.trim()) { setError('Digite uma mensagem'); return; }
    if (!selectedLead.phone?.trim()) { setError('Lead não tem número de telefone cadastrado'); return; }

    setLoading(true);
    setError('');
    try {
      // Cria ou busca conversa
      const { data: conv } = await api.post('/api/conversations', {
        leadId: selectedLead.id,
        channelInstanceId: selectedChannel,
      });

      // Envia mensagem
      await api.post('/api/messages', {
        conversationId: conv.id,
        content: message.trim(),
        type: 'TEXT',
      });

      onOpened(conv);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erro ao iniciar conversa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Nova Conversa</h3>
            <p className="text-[11px] text-slate-400">Inicie um atendimento com um lead</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X size={15} className="text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Busca de lead */}
          {!selectedLead ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Buscar lead
              </label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Nome, telefone ou empresa..."
                  className="w-full pl-8 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {searching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
              </div>

              {/* Resultados */}
              {leads.length > 0 && (
                <div className="mt-2 border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
                  {leads.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => { setSelectedLead(lead); setSearch(''); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0 text-left"
                    >
                      <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                          {lead.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{lead.name}</p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          {lead.phone && <><Phone size={9} /> {lead.phone}</>}
                          {lead.company && <span className="ml-1 text-slate-300">· {lead.company}</span>}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {search && !searching && leads.length === 0 && (
                <p className="text-xs text-slate-400 mt-2 text-center py-3">Nenhum lead encontrado</p>
              )}
            </div>
          ) : (
            /* Lead selecionado */
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Lead</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-700 rounded-xl">
                <div className="w-8 h-8 bg-brand-200 dark:bg-brand-800 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                    {selectedLead.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{selectedLead.name}</p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Phone size={9} /> {selectedLead.phone || 'Sem telefone'}
                  </p>
                </div>
                <button onClick={() => setSelectedLead(null)} className="p-1 hover:bg-brand-100 dark:hover:bg-brand-800 rounded-lg">
                  <X size={13} className="text-slate-400" />
                </button>
              </div>
            </div>
          )}

          {/* Canal */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Canal</label>
            {channels.length === 0 ? (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                Nenhum canal conectado. Vá em Configurações → Conexões para conectar.
              </p>
            ) : (
              <div className="grid gap-2">
                {channels.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChannel(ch.id)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-colors ${
                      selectedChannel === ch.id
                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${selectedChannel === ch.id ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{ch.name}</p>
                      <p className="text-[10px] text-slate-400">{ch.identifier} · {ch.type === 'WHATSAPP_EVOLUTION' ? 'Evolution' : 'Cloud API'}</p>
                    </div>
                    {selectedChannel === ch.id && (
                      <span className="text-[10px] font-bold text-emerald-600">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mensagem */}
          {selectedLead && selectedChannel && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Primeira mensagem
              </label>
              <textarea
                autoFocus
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={`Olá ${selectedLead.name.split(' ')[0]}, tudo bem?`}
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">Enter para enviar · Shift+Enter para nova linha</p>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !selectedLead || !selectedChannel || !message.trim()}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Atendimento() {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [showNewConv, setShowNewConv] = useState(false);

  const {
    conversations,
    activeConversation,
    loading,
    fetchConversations,
    setActiveConversation,
  } = useConversation();

  const { updateConversation, addConversation } = useConversationStore();

  useEffect(() => {
    setActiveConversation(null);
    fetchConversations();
  }, []); // eslint-disable-line

  const handleFinish = (conversationId: string) => {
    updateConversation(conversationId, { status: 'RESOLVED' });
  };

  const handleBulkFinish = async (ids: string[]) => {
    for (const id of ids) {
      try {
        await api.put(`/api/conversations/${id}/finish`);
        updateConversation(id, { status: 'RESOLVED' });
      } catch { /* ignore */ }
    }
  };

  const handleNewConversationOpened = useCallback((conv: import('../types').Conversation) => {
    addConversation(conv);
    setActiveConversation(conv);
    setShowNewConv(false);
  }, [addConversation, setActiveConversation]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Conversation List */}
      <ConversationList
        conversations={conversations.filter(c => !hiddenIds.has(c.id))}
        activeId={activeConversation?.id}
        onSelect={setActiveConversation}
        loading={loading}
        onBulkFinish={handleBulkFinish}
        onNewConversation={() => setShowNewConv(true)}
      />

      {/* Chat Window */}
      {activeConversation ? (
        <div className="flex-1 overflow-hidden min-w-0">
          <ChatWindow
            conversation={activeConversation}
            onFinish={handleFinish}
            onUpdate={(id, updates) => updateConversation(id, updates)}
            onHide={(id) => {
              setHiddenIds(prev => new Set([...prev, id]));
              if (activeConversation?.id === id) setActiveConversation(null);
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={28} className="text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Selecione uma conversa</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              ou{' '}
              <button
                onClick={() => setShowNewConv(true)}
                className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                inicie uma nova
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Lead Panel */}
      {activeConversation && (
        <LeadPanel conversation={activeConversation} />
      )}

      {/* Modal nova conversa */}
      {showNewConv && (
        <NewConversationModal
          onClose={() => setShowNewConv(false)}
          onOpened={handleNewConversationOpened}
        />
      )}
    </div>
  );
}
