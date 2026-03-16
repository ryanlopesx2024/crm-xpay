import React, { useEffect, useState, useCallback } from 'react';
import {
  Search, Plus, Phone, Mail, Building2,
  ChevronLeft, ChevronRight, MoreHorizontal, X,
  Globe, Calendar, GitBranch, History, Save, Edit3,
  FileText, User2, DollarSign, ChevronDown, Check, Trash2, MessageCircle
} from 'lucide-react';
import { useLeads } from '../hooks/useLeads';
import type { Conversation } from '../types';
import { Lead, Pipeline } from '../types';
import Avatar from '../components/shared/Avatar';
import TagPill from '../components/shared/TagPill';
import LeadTimeline from '../components/chat/LeadTimeline';
import ChatWindow from '../components/chat/ChatWindow';
import { useConversationStore } from '../stores/conversationStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../services/api';

interface NewLeadForm {
  name: string;
  phone: string;
  email: string;
  company: string;
  document: string;
  birthdate: string;
  site: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  source: string;
}

const BLANK_FORM: NewLeadForm = {
  name: '', phone: '', email: '', company: '', document: '',
  birthdate: '', site: '', address_street: '', address_city: '',
  address_state: '', address_zip: '', source: '',
};

const SOURCES = ['WhatsApp', 'Instagram', 'Facebook', 'Google Ads', 'Indicacao', 'Organico', 'Outro'];

export default function Leads() {
  const { leads, total, loading, fetchLeads, createLead, updateLead, addTag, removeTag } = useLeads();
  const { updateConversation } = useConversationStore();
  const [chatConversation, setChatConversation] = useState<Conversation | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [fullLead, setFullLead] = useState<Lead | null>(null);
  const [loadingLead, setLoadingLead] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Lead> & { address_street?: string; address_city?: string; address_state?: string; address_zip?: string }>({});
  const [creating, setCreating] = useState(false);
  const [newLead, setNewLead] = useState<NewLeadForm>(BLANK_FORM);
  const [createTab, setCreateTab] = useState<'basic'|'address'|'extra'>('basic');
  const [allTags, setAllTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingDeal, setCreatingDeal] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [dealForm, setDealForm] = useState({ pipelineId: '', stageId: '', value: '' });
  const [savingDeal, setSavingDeal] = useState(false);
  const limit = 20;

  useEffect(() => {
    fetchLeads({ page: String(page), limit: String(limit), ...(search ? { search } : {}) });
  }, [page, search, fetchLeads]);

  useEffect(() => {
    api.get('/api/tags').then(({ data }) => setAllTags(data)).catch(() => {});
    api.get('/api/pipelines').then(({ data }) => setPipelines(data)).catch(() => {});
  }, []);

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };
  const totalPages = Math.ceil(total / limit);

  const openLeadDetail = async (lead: Lead) => {
    setSelectedLead(lead);
    setLoadingLead(true);
    setEditMode(false);
    setCreatingDeal(false);
    setShowTagMenu(false);
    try {
      const { data } = await api.get('/api/leads/' + lead.id);
      setFullLead(data);
    } catch {
      setFullLead(lead);
    } finally {
      setLoadingLead(false);
    }
  };

  const closeDetail = () => {
    setSelectedLead(null);
    setFullLead(null);
    setEditMode(false);
    setCreatingDeal(false);
    setShowTagMenu(false);
  };

  const startEdit = () => {
    if (!fullLead) return;
    const addr = fullLead.address as Record<string, string> | null;
    setEditData({
      name: fullLead.name,
      email: fullLead.email || '',
      phone: fullLead.phone || '',
      company: fullLead.company || '',
      site: fullLead.site || '',
      document: fullLead.document || '',
      birthdate: fullLead.birthdate ? fullLead.birthdate.split('T')[0] : '',
      address_street: addr?.street || '',
      address_city: addr?.city || '',
      address_state: addr?.state || '',
      address_zip: addr?.zip || '',
    });
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!fullLead) return;
    setSaving(true);
    try {
      const address = {
        street: editData.address_street || '',
        city: editData.address_city || '',
        state: editData.address_state || '',
        zip: editData.address_zip || '',
      };
      const payload = {
        name: editData.name,
        email: editData.email,
        phone: editData.phone,
        company: editData.company,
        site: editData.site,
        document: editData.document,
        birthdate: editData.birthdate || undefined,
        address,
      };
      const updated = await updateLead(fullLead.id, payload as Partial<Lead>);
      setFullLead({ ...fullLead, ...updated });
      setEditMode(false);
      fetchLeads({ page: String(page), limit: String(limit), ...(search ? { search } : {}) });
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const handleAddTag = async (tagId: string) => {
    if (!fullLead) return;
    await addTag(fullLead.id, tagId);
    const tag = allTags.find((t) => t.id === tagId);
    if (tag) setFullLead({ ...fullLead, tags: [...fullLead.tags, { leadId: fullLead.id, tagId, tag: { ...tag, companyId: '', createdAt: '' } }] });
    setShowTagMenu(false);
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!fullLead) return;
    await removeTag(fullLead.id, tagId);
    setFullLead({ ...fullLead, tags: fullLead.tags.filter((t) => t.tagId !== tagId) });
  };

  const handleCreateLead = async () => {
    if (!newLead.name.trim()) return;
    setSaving(true);
    try {
      const address = (newLead.address_street || newLead.address_city || newLead.address_state || newLead.address_zip)
        ? { street: newLead.address_street, city: newLead.address_city, state: newLead.address_state, zip: newLead.address_zip }
        : undefined;
      const created = await createLead({
        name: newLead.name,
        phone: newLead.phone || undefined,
        email: newLead.email || undefined,
        company: newLead.company || undefined,
        document: newLead.document || undefined,
        birthdate: newLead.birthdate || undefined,
        site: newLead.site || undefined,
        address,
      } as Partial<Lead>);
      setCreating(false);
      setNewLead(BLANK_FORM);
      setCreateTab('basic');
      fetchLeads({ page: String(page), limit: String(limit), ...(search ? { search } : {}) });
      if (created?._existed) {
        const { data } = await api.get('/api/leads/' + created.id);
        setFullLead(data);
      }
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const handleCreateDeal = async () => {
    if (!fullLead || !dealForm.pipelineId || !dealForm.stageId) return;
    setSavingDeal(true);
    try {
      await api.post('/api/deals', {
        leadId: fullLead.id,
        pipelineId: dealForm.pipelineId,
        stageId: dealForm.stageId,
        value: parseFloat(dealForm.value) || 0,
      });
      const { data } = await api.get('/api/leads/' + fullLead.id);
      setFullLead(data);
      setCreatingDeal(false);
      setDealForm({ pipelineId: '', stageId: '', value: '' });
    } catch (err) { console.error(err); } finally { setSavingDeal(false); }
  };

  const handleOpenChat = useCallback(async (leadId: string) => {
    try {
      const { data } = await api.get(`/api/conversations?leadId=${encodeURIComponent(leadId)}`);
      const conv = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (conv) {
        setChatConversation(conv);
      } else {
        // No conversation yet — create one
        const { data: newConv } = await api.post('/api/conversations', { leadId });
        setChatConversation(newConv);
      }
    } catch (err) {
      console.error('Erro ao abrir conversa:', err);
    }
  }, []);

  const selectedPipeline = pipelines.find((p) => p.id === dealForm.pipelineId);

  const set = (field: keyof NewLeadForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setNewLead((prev) => ({ ...prev, [field]: e.target.value }));

  const fieldCls = 'w-full text-sm border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500';
  const labelCls = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">Leads</h1>
          <span className="text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-medium px-2 py-0.5 rounded-full">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar por nome, email ou telefone..." value={search} onChange={(e) => handleSearch(e.target.value)} className="pl-8 pr-8 py-2 text-sm bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-brand-500 w-64 transition-all" />
            {search && <button onClick={() => handleSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={12} /></button>}
          </div>
          <button onClick={() => setCreating(true)} style={{ backgroundColor: '#00A34D' }} className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-all font-medium shadow-sm">
            <Plus size={13} /> Novo lead
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-6 py-3">Lead</th>
              <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-4 py-3">Contato</th>
              <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-4 py-3">Empresa</th>
              <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-4 py-3">Tags</th>
              <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-4 py-3">Negocios</th>
              <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-4 py-3">Criado</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center">
                      <User2 size={24} className="text-slate-400" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Nenhum lead encontrado</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs">{search ? 'Tente buscar por outro termo' : 'Clique em "Novo lead" para comecar'}</p>
                    {!search && (
                      <button onClick={() => setCreating(true)} style={{ backgroundColor: '#00A34D' }} className="mt-2 flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-colors font-medium">
                        <Plus size={13} /> Novo lead
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              leads.map((lead, idx) => (
                <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => openLeadDetail(lead)}>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={lead.name} size="sm" />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{lead.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {lead.phone && <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"><Phone size={10} className="text-slate-400" />{lead.phone}</div>}
                      {lead.email && <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-500 truncate max-w-[160px]"><Mail size={10} className="text-slate-400 flex-shrink-0" /><span className="truncate">{lead.email}</span></div>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {lead.company ? <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"><Building2 size={10} className="text-slate-400" />{lead.company}</div> : <span className="text-xs text-slate-300 dark:text-slate-600">--</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {lead.tags?.slice(0, 2).map(({ tag }) => <TagPill key={tag.id} name={tag.name} color={tag.color} small />)}
                      {(lead.tags?.length || 0) > 2 && <span className="text-[10px] text-slate-400">+{(lead.tags?.length || 0) - 2}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{lead._count?.deals || 0}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {format(new Date(lead.createdAt), 'dd/MM/yy', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenChat(lead.id); }}
                        className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        title="Abrir conversa"
                      >
                        <MessageCircle size={14} className="text-emerald-500" />
                      </button>
                      <button onClick={(e) => e.stopPropagation()} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors">
                        <MoreHorizontal size={14} className="text-slate-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400">Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-40 transition-colors"><ChevronLeft size={16} className="text-slate-600 dark:text-slate-400" /></button>
            <span className="text-xs text-slate-600 dark:text-slate-400 px-2">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-40 transition-colors"><ChevronRight size={16} className="text-slate-600 dark:text-slate-400" /></button>
          </div>
        </div>
      )}

      {/* ===== CREATE LEAD MODAL ===== */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-[520px] max-h-[90vh] flex flex-col animate-fade-in-up">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Novo Lead</h3>
              <button onClick={() => { setCreating(false); setNewLead(BLANK_FORM); setCreateTab('basic'); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X size={15} className="text-slate-500" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-700 px-6">
              {([['basic', 'Dados basicos'], ['address', 'Endereco'], ['extra', 'Extra']] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setCreateTab(tab)} className={'px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ' + (createTab === tab ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300')}>
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {createTab === 'basic' && (
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Nome *</label>
                    <input type="text" value={newLead.name} onChange={set('name')} placeholder="Nome completo" className={fieldCls} autoFocus />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>WhatsApp</label>
                      <input type="tel" value={newLead.phone} onChange={set('phone')} placeholder="(11) 99999-9999" className={fieldCls} />
                    </div>
                    <div>
                      <label className={labelCls}>E-mail</label>
                      <input type="email" value={newLead.email} onChange={set('email')} placeholder="email@exemplo.com" className={fieldCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Empresa</label>
                      <input type="text" value={newLead.company} onChange={set('company')} placeholder="Nome da empresa" className={fieldCls} />
                    </div>
                    <div>
                      <label className={labelCls}>CPF / CNPJ</label>
                      <input type="text" value={newLead.document} onChange={set('document')} placeholder="000.000.000-00" className={fieldCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Data de nascimento</label>
                      <input type="date" value={newLead.birthdate} onChange={set('birthdate')} className={fieldCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Origem</label>
                      <select value={newLead.source} onChange={set('source')} className={fieldCls}>
                        <option value="">Selecione...</option>
                        {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Site</label>
                    <input type="url" value={newLead.site} onChange={set('site')} placeholder="https://exemplo.com" className={fieldCls} />
                  </div>
                </div>
              )}
              {createTab === 'address' && (
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>CEP</label>
                    <input type="text" value={newLead.address_zip} onChange={set('address_zip')} placeholder="00000-000" className={fieldCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Rua / Logradouro</label>
                    <input type="text" value={newLead.address_street} onChange={set('address_street')} placeholder="Rua, numero, complemento" className={fieldCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Cidade</label>
                      <input type="text" value={newLead.address_city} onChange={set('address_city')} placeholder="Cidade" className={fieldCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Estado</label>
                      <input type="text" value={newLead.address_state} onChange={set('address_state')} placeholder="SP" maxLength={2} className={fieldCls} />
                    </div>
                  </div>
                </div>
              )}
              {createTab === 'extra' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 dark:text-slate-500">Campos personalizados podem ser configurados em Configuracoes.</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
              <button onClick={() => { setCreating(false); setNewLead(BLANK_FORM); setCreateTab('basic'); }} className="flex-1 py-2.5 text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancelar</button>
              <button onClick={handleCreateLead} disabled={!newLead.name.trim() || saving} style={!newLead.name.trim() || saving ? {} : { backgroundColor: '#00A34D' }} className="flex-1 py-2.5 text-sm text-white rounded-xl disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-1.5">
                {saving ? 'Criando...' : <><Plus size={13} /> Criar lead</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CHAT PANEL - floating popup ===== */}
      {chatConversation && (
        <div className="fixed bottom-4 right-4 z-[60] w-[420px] h-[560px] flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <ChatWindow
            conversation={chatConversation}
            onFinish={(id) => updateConversation(id, { status: 'RESOLVED' })}
            onUpdate={(id, updates) => updateConversation(id, updates)}
            onHide={() => setChatConversation(null)}
          />
        </div>
      )}

      {/* ===== LEAD DETAIL PANEL ===== */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={closeDetail} />
          <div className="relative w-[480px] h-full bg-white dark:bg-slate-800 shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <Avatar name={selectedLead.name} size="lg" />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{fullLead?.name || selectedLead.name}</h2>
                <p className="text-xs text-slate-400">{fullLead?.phone || selectedLead.phone || fullLead?.email || selectedLead.email || 'Sem contato'}</p>
              </div>
              <div className="flex items-center gap-1">
                {!editMode && fullLead && (
                  <button onClick={startEdit} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Editar">
                    <Edit3 size={14} className="text-slate-500" />
                  </button>
                )}
                <button onClick={closeDetail} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X size={16} className="text-slate-500" />
                </button>
              </div>
            </div>

            {loadingLead ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : fullLead ? (
              <div className="flex-1 overflow-y-auto">

                {/* Tags */}
                <div className="px-5 pt-4 pb-3 border-b border-slate-50 dark:border-slate-700">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {fullLead.tags?.map(({ tag }) => (
                      <TagPill key={tag.id} name={tag.name} color={tag.color} onRemove={() => handleRemoveTag(tag.id)} />
                    ))}
                    <div className="relative">
                      <button onClick={() => setShowTagMenu(!showTagMenu)} className="w-6 h-6 border border-dashed border-slate-300 dark:border-slate-600 rounded-full flex items-center justify-center text-slate-400 hover:border-brand-500 hover:text-brand-500 transition-colors">
                        <Plus size={12} />
                      </button>
                      {showTagMenu && (
                        <div className="absolute top-8 left-0 z-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 w-44">
                          {allTags.filter((t) => !fullLead.tags?.some((lt) => lt.tagId === t.id)).map((tag) => (
                            <button key={tag.id} onClick={() => handleAddTag(tag.id)} className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-left">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                              <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{tag.name}</span>
                            </button>
                          ))}
                          {allTags.filter((t) => !fullLead.tags?.some((lt) => lt.tagId === t.id)).length === 0 && (
                            <p className="text-xs text-slate-400 p-2">Todas as tags ja adicionadas</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-6">
                  {/* Lead Data */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Dados do Lead</h3>
                      {editMode ? (
                        <div className="flex gap-2">
                          <button onClick={() => setEditMode(false)} className="text-xs text-slate-500 hover:text-slate-700 font-medium">Cancelar</button>
                          <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1 text-xs text-brand-600 font-medium hover:text-brand-700 disabled:opacity-50">
                            <Save size={11} /> {saving ? 'Salvando...' : 'Salvar'}
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {editMode ? (
                      <div className="space-y-3 bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
                        {[
                          { label: 'Nome', field: 'name', type: 'text' },
                          { label: 'WhatsApp', field: 'phone', type: 'tel' },
                          { label: 'E-mail', field: 'email', type: 'email' },
                          { label: 'Empresa', field: 'company', type: 'text' },
                          { label: 'CPF / CNPJ', field: 'document', type: 'text' },
                          { label: 'Data nasc.', field: 'birthdate', type: 'date' },
                          { label: 'Site', field: 'site', type: 'url' },
                          { label: 'CEP', field: 'address_zip', type: 'text' },
                          { label: 'Rua / Logradouro', field: 'address_street', type: 'text' },
                          { label: 'Cidade', field: 'address_city', type: 'text' },
                          { label: 'Estado', field: 'address_state', type: 'text' },
                        ].map(({ label, field, type }) => (
                          <div key={field}>
                            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">{label}</label>
                            <input
                              type={type}
                              value={String((editData as Record<string, unknown>)[field] || '')}
                              onChange={(e) => setEditData({ ...editData, [field]: e.target.value })}
                              className="w-full text-sm border border-slate-200 dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {fullLead.phone && (
                          <div className="flex items-center gap-3">
                            <Phone size={14} className="text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{fullLead.phone}</span>
                            <a href={'https://wa.me/' + fullLead.phone.replace(/[^0-9]/g, '')} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 font-medium hover:text-emerald-700 flex-shrink-0">WA</a>
                          </div>
                        )}
                        {fullLead.email && <div className="flex items-center gap-3"><Mail size={14} className="text-slate-400 flex-shrink-0" /><span className="text-sm text-slate-700 dark:text-slate-300 truncate">{fullLead.email}</span></div>}
                        {fullLead.company && <div className="flex items-center gap-3"><Building2 size={14} className="text-slate-400 flex-shrink-0" /><span className="text-sm text-slate-700 dark:text-slate-300">{fullLead.company}</span></div>}
                        {fullLead.document && <div className="flex items-center gap-3"><FileText size={14} className="text-slate-400 flex-shrink-0" /><span className="text-sm text-slate-700 dark:text-slate-300">{fullLead.document}</span></div>}
                        {fullLead.birthdate && <div className="flex items-center gap-3"><Calendar size={14} className="text-slate-400 flex-shrink-0" /><span className="text-sm text-slate-700 dark:text-slate-300">{format(new Date(fullLead.birthdate), 'dd/MM/yyyy')}</span></div>}
                        {fullLead.site && <div className="flex items-center gap-3"><Globe size={14} className="text-slate-400 flex-shrink-0" /><a href={fullLead.site} target="_blank" rel="noreferrer" className="text-sm text-brand-500 truncate hover:underline">{fullLead.site}</a></div>}
                        {(fullLead.address as Record<string,string>)?.city && (
                          <div className="flex items-center gap-3">
                            <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span className="text-sm text-slate-700 dark:text-slate-300">{(fullLead.address as Record<string,string>).city}{(fullLead.address as Record<string,string>).state ? ', ' + (fullLead.address as Record<string,string>).state : ''}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-700">
                          <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-500 dark:text-slate-400">Lead desde {format(new Date(fullLead.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Deals section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                        <GitBranch size={12} /> Negocios {fullLead.deals && fullLead.deals.length > 0 ? '(' + fullLead.deals.length + ')' : ''}
                      </h3>
                      <button onClick={() => setCreatingDeal(!creatingDeal)} className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 flex items-center gap-1">
                        <Plus size={11} /> Novo negocio
                      </button>
                    </div>

                    {creatingDeal && (
                      <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-4 mb-3 space-y-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Pipeline</label>
                          <select value={dealForm.pipelineId} onChange={(e) => setDealForm({ ...dealForm, pipelineId: e.target.value, stageId: '' })} className="w-full text-sm border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500">
                            <option value="">Selecione a pipeline...</option>
                            {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        {selectedPipeline && (
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Etapa</label>
                            <select value={dealForm.stageId} onChange={(e) => setDealForm({ ...dealForm, stageId: e.target.value })} className="w-full text-sm border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500">
                              <option value="">Selecione a etapa...</option>
                              {selectedPipeline.stages?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Valor (R$)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                            <input type="number" value={dealForm.value} onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })} placeholder="0,00" min={0} step={0.01} className="w-full text-sm border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setCreatingDeal(false)} className="flex-1 py-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                          <button onClick={handleCreateDeal} disabled={!dealForm.pipelineId || !dealForm.stageId || savingDeal} className="flex-1 py-2 text-xs text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-1">
                            <Check size={11} /> {savingDeal ? 'Criando...' : 'Criar negocio'}
                          </button>
                        </div>
                      </div>
                    )}

                    {fullLead.deals && fullLead.deals.length > 0 ? (
                      <div className="space-y-2">
                        {fullLead.deals.map((deal) => (
                          <div key={deal.id} className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 border border-slate-100 dark:border-slate-600">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{deal.pipeline?.name}</span>
                              <div className="flex items-center gap-1.5">
                                <span className={'text-[10px] font-semibold px-1.5 py-0.5 rounded-full ' + (deal.status === 'WON' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : deal.status === 'LOST' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400')}>{deal.status === 'WON' ? 'Ganho' : deal.status === 'LOST' ? 'Perdido' : 'Aberto'}</span>
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">R$ {(deal.value || 0).toLocaleString('pt-BR')}</span>
                              </div>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: deal.stage?.color || '#64748b' }}>{deal.stage?.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : !creatingDeal ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">Nenhum negocio</p>
                    ) : null}
                  </div>

                  {/* History */}
                  {fullLead.history && fullLead.history.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <History size={12} /> Historico
                      </h3>
                      <LeadTimeline history={fullLead.history} />
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Footer with quick actions */}
            {fullLead && !editMode && (
              <div className="border-t border-slate-100 dark:border-slate-700 p-4 flex gap-2">
                <button
                  onClick={() => handleOpenChat(fullLead.id)}
                  className="flex-1 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageCircle size={13} /> Conversar
                </button>
                <button onClick={startEdit} className="flex-1 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 rounded-xl hover:bg-brand-100 dark:hover:bg-brand-900/30 flex items-center justify-center gap-1.5 transition-colors">
                  <Edit3 size={13} /> Editar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
