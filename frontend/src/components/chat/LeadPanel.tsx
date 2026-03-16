import React, { useEffect, useState, useRef } from 'react';
import {
  Phone, Mail, Building2, Globe, Plus, X,
  GitBranch, History, FileText, ChevronDown, ChevronRight,
  ExternalLink, MoreHorizontal, User2, Calendar,
  MapPin, DollarSign, Clock, Tag, Check, Search,
  List, Zap, AlertCircle, Loader2,
} from 'lucide-react';
import { Conversation, Lead, Tag as TagType, Deal } from '../../types';
import Avatar from '../shared/Avatar';
import api from '../../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LeadPanelProps {
  conversation: Conversation;
}

export default function LeadPanel({ conversation }: LeadPanelProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    perfil: true, notas: true, negocio: true, historico: true, endereco: false, listas: false,
  });
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState('');
  const [savingField, setSavingField] = useState(false);
  const [modal, setModal] = useState<'deal' | 'automation' | 'list' | null>(null);
  const tagRef = useRef<HTMLDivElement>(null);

  const loadLead = () => {
    api.get(`/api/leads/${conversation.leadId}`).then(({ data }) => {
      setLead(data);
      setNotes(data.notes || '');
    }).catch(() => {});
  };

  useEffect(() => {
    loadLead();
    api.get('/api/tags').then(({ data }) => setAllTags(data)).catch(() => {});
  }, [conversation.leadId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) setShowTagMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleSection = (key: string) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  const addTag = async (tagId: string) => {
    await api.post(`/api/leads/${conversation.leadId}/tags`, { tagId });
    const tag = allTags.find((t) => t.id === tagId);
    if (tag && lead) setLead({ ...lead, tags: [...lead.tags, { leadId: lead.id, tagId, tag }] });
    setShowTagMenu(false);
  };

  const removeTag = async (tagId: string) => {
    await api.delete(`/api/leads/${conversation.leadId}/tags/${tagId}`);
    if (lead) setLead({ ...lead, tags: lead.tags.filter((t) => t.tagId !== tagId) });
  };

  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setFieldValue(currentValue || '');
  };

  const saveField = async (field: string) => {
    if (!lead) return;
    setSavingField(true);
    try {
      const { data } = await api.put(`/api/leads/${lead.id}`, { [field]: fieldValue });
      setLead(data);
      setEditingField(null);
    } catch (err) { console.error(err); } finally { setSavingField(false); }
  };

  const saveNotes = async () => {
    if (!lead) return;
    setSavingNotes(true);
    try {
      await api.put(`/api/leads/${lead.id}`, { notes });
    } catch (err) { console.error(err); } finally { setSavingNotes(false); }
  };

  if (!lead) {
    return (
      <div className="w-72 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const availableTags = allTags.filter((t) => !lead.tags?.some((lt) => lt.tagId === t.id));

  return (
    <div className="w-72 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col overflow-y-auto flex-shrink-0">

      {/* Modals */}
      {modal === 'deal' && (
        <AddDealModal leadId={lead.id} onClose={() => setModal(null)} onSuccess={() => { setModal(null); loadLead(); }} />
      )}
      {modal === 'automation' && (
        <RunAutomationModal leadId={lead.id} onClose={() => setModal(null)} onSuccess={() => { setModal(null); loadLead(); }} />
      )}
      {modal === 'list' && (
        <AddToListModal leadId={lead.id} onClose={() => setModal(null)} onSuccess={() => { setModal(null); loadLead(); }} />
      )}

      {/* Top: name + tags */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{lead.name}</h3>
              <ExternalLink size={11} className="text-slate-400 flex-shrink-0" />
            </div>
            {/* Tags row */}
            <div className="flex items-center gap-1 mt-2 flex-wrap" ref={tagRef}>
              {lead.tags?.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full cursor-pointer group"
                  style={{ backgroundColor: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}44` }}
                  onClick={() => removeTag(tag.id)}
                  title="Clique para remover"
                >
                  {tag.name}
                  <X size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              ))}
              <div className="relative">
                <button
                  onClick={() => setShowTagMenu(!showTagMenu)}
                  className="w-5 h-5 border border-dashed border-slate-300 dark:border-slate-600 rounded-full flex items-center justify-center text-slate-400 hover:border-brand-500 hover:text-brand-500 transition-colors text-[10px] font-bold"
                >
                  +
                </button>
                {showTagMenu && (
                  <div className="absolute top-6 left-0 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1.5 w-44">
                    {availableTags.length === 0
                      ? <p className="text-xs text-slate-400 p-2 text-center">Nenhuma tag disponível</p>
                      : availableTags.map((tag) => (
                        <button key={tag.id} onClick={() => addTag(tag.id)}
                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
                        >
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                          <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{tag.name}</span>
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-700 flex flex-col gap-1.5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Ações</p>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setModal('deal')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
          >
            <DollarSign size={10} />
            Adicionar negócio
          </button>
          <button
            onClick={() => setModal('automation')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            <Zap size={10} />
            Executar automação
          </button>
          <button
            onClick={() => setModal('list')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <List size={10} />
            Adicionar lista
          </button>
        </div>
      </div>

      {/* Perfil section */}
      <SectionHeader label="Perfil" open={openSections.perfil} onToggle={() => toggleSection('perfil')} />
      {openSections.perfil && (
        <div className="px-4 pb-3 border-b border-slate-100 dark:border-slate-700">
          <table className="w-full">
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              <ProfileRow
                label="Nome" value={lead.name} field="name"
                editing={editingField === 'name'} editValue={fieldValue}
                onEdit={() => startEdit('name', lead.name)}
                onSave={() => saveField('name')}
                onCancel={() => setEditingField(null)}
                onChange={setFieldValue}
                saving={savingField}
              />
              <ProfileRow
                label="E-mail" value={lead.email} field="email"
                placeholder="Email do lead"
                editing={editingField === 'email'} editValue={fieldValue}
                onEdit={() => startEdit('email', lead.email || '')}
                onSave={() => saveField('email')}
                onCancel={() => setEditingField(null)}
                onChange={setFieldValue}
                saving={savingField}
              />
              <tr>
                <td className="py-1.5 pr-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap w-[90px]">Telefone</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-base">🇧🇷</span>
                    <span className="text-xs text-slate-700 dark:text-slate-300">{lead.phone || <span className="text-slate-300 dark:text-slate-600">—</span>}</span>
                  </div>
                </td>
              </tr>
              <ProfileRow
                label="Empresa" value={lead.company} field="company"
                placeholder="Informe a empresa do lead"
                editing={editingField === 'company'} editValue={fieldValue}
                onEdit={() => startEdit('company', lead.company || '')}
                onSave={() => saveField('company')}
                onCancel={() => setEditingField(null)}
                onChange={setFieldValue}
                saving={savingField}
              />
              <ProfileRow
                label="Site" value={lead.site} field="site"
                placeholder="Exemplo: www.meulead.com.br"
                editing={editingField === 'site'} editValue={fieldValue}
                onEdit={() => startEdit('site', lead.site || '')}
                onSave={() => saveField('site')}
                onCancel={() => setEditingField(null)}
                onChange={setFieldValue}
                saving={savingField}
              />
              <ProfileRow
                label="Documento" value={lead.document} field="document"
                placeholder="CPF ou CNPJ"
                editing={editingField === 'document'} editValue={fieldValue}
                onEdit={() => startEdit('document', lead.document || '')}
                onSave={() => saveField('document')}
                onCancel={() => setEditingField(null)}
                onChange={setFieldValue}
                saving={savingField}
              />
              <tr>
                <td className="py-1.5 pr-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap w-[90px]">Data de Nasc.</td>
                <td className="py-1.5">
                  {editingField === 'birthdate' ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        value={fieldValue}
                        onChange={(e) => setFieldValue(e.target.value)}
                        className="text-xs border border-brand-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 w-full"
                        onKeyDown={(e) => { if (e.key === 'Enter') saveField('birthdate'); if (e.key === 'Escape') setEditingField(null); }}
                        autoFocus
                      />
                      <button onClick={() => saveField('birthdate')} disabled={savingField} className="text-brand-600 hover:text-brand-700">
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <span
                      onClick={() => startEdit('birthdate', lead.birthdate ? lead.birthdate.slice(0, 10) : '')}
                      className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:text-brand-600 flex items-center gap-1"
                    >
                      {lead.birthdate
                        ? format(new Date(lead.birthdate), 'dd/MM/yyyy', { locale: ptBR })
                        : <span className="text-slate-300 dark:text-slate-600 flex items-center gap-1"><Calendar size={11} /> dd/MM/yyyy</span>
                      }
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Notas section */}
      <SectionHeader label="Notas" open={openSections.notas} onToggle={() => toggleSection('notas')} />
      {openSections.notas && (
        <div className="px-4 pb-3 border-b border-slate-100 dark:border-slate-700">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicionar nota..."
            className="w-full text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded-lg p-2.5 border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none transition-all min-h-[72px]"
            rows={3}
          />
          {notes !== (lead.notes || '') && (
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="mt-1.5 text-xs text-white font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
              style={{ backgroundColor: '#00A34D' }}
            >
              {savingNotes ? 'Salvando...' : 'Salvar nota'}
            </button>
          )}
        </div>
      )}

      {/* Endereço */}
      <AddressSection lead={lead} onSaved={loadLead} open={openSections.endereco} onToggle={() => toggleSection('endereco')} />

      {/* Negócios section */}
      <div>
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
          onClick={() => toggleSection('negocio')}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Negócio</span>
            {lead.deals && lead.deals.length > 0 && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
                {lead.deals.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-400 hover:text-brand-600"
              onClick={(e) => { e.stopPropagation(); setModal('deal'); }}
              title="Adicionar negócio"
            >
              <Plus size={12} />
            </button>
            <ChevronDown size={13} className={`text-slate-400 transition-transform ${openSections.negocio ? '' : '-rotate-90'}`} />
          </div>
        </div>
        {openSections.negocio && (
          <>
            {lead.deals && lead.deals.length > 0
              ? lead.deals.map((deal) => <DealCard key={deal.id} deal={deal} leadName={lead.name} />)
              : (
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">Nenhum negócio cadastrado</p>
                  <button
                    onClick={() => setModal('deal')}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-brand-600 dark:text-brand-400 border border-dashed border-brand-300 dark:border-brand-700 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                  >
                    <Plus size={11} />
                    Adicionar negócio
                  </button>
                </div>
              )
            }
          </>
        )}
      </div>

      {/* Listas section */}
      <div>
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
          onClick={() => toggleSection('listas')}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Listas</span>
            {lead.lists && lead.lists.length > 0 && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
                {lead.lists.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-400 hover:text-brand-600"
              onClick={(e) => { e.stopPropagation(); setModal('list'); }}
              title="Adicionar a lista"
            >
              <Plus size={12} />
            </button>
            <ChevronDown size={13} className={`text-slate-400 transition-transform ${openSections.listas ? '' : '-rotate-90'}`} />
          </div>
        </div>
        {openSections.listas && (
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
            {lead.lists && lead.lists.length > 0
              ? lead.lists.map(({ list }: any) => (
                <div key={list.id} className="flex items-center gap-2 py-1.5">
                  <List size={11} className="text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{list.name}</span>
                </div>
              ))
              : <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">Lead não está em nenhuma lista</p>
            }
          </div>
        )}
      </div>

      {/* Histórico section */}
      <SectionHeader
        label="Histórico"
        open={openSections.historico}
        onToggle={() => toggleSection('historico')}
        rightElement={
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
              {lead.history?.length || 0}
            </span>
          </div>
        }
      />
      {openSections.historico && (
        <div className="px-4 pb-4 space-y-0">
          {!lead.history || lead.history.length === 0
            ? <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">Nenhum histórico registrado</p>
            : lead.history.map((h, i) => (
              <HistoryItem key={h.id} item={h} isLast={i === lead.history!.length - 1} />
            ))
          }
        </div>
      )}
    </div>
  );
}

// ── AddDealModal ──

function AddDealModal({ leadId, onClose, onSuccess }: { leadId: string; onClose: () => void; onSuccess: () => void }) {
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [pipelineId, setPipelineId] = useState('');
  const [stageId, setStageId] = useState('');
  const [productId, setProductId] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/api/pipelines'),
      api.get('/api/products').catch(() => ({ data: [] })),
    ]).then(([p, pr]) => {
      setPipelines(p.data || []);
      setProducts(pr.data || []);
      if (p.data && p.data.length > 0) {
        setPipelineId(p.data[0].id);
        if (p.data[0].stages && p.data[0].stages.length > 0) {
          setStageId(p.data[0].stages[0].id);
        }
      }
    }).finally(() => setLoading(false));
  }, []);

  const selectedPipeline = pipelines.find((p) => p.id === pipelineId);

  const handleSubmit = async () => {
    if (!pipelineId || !stageId) { setError('Selecione um funil e etapa'); return; }
    setSaving(true);
    try {
      await api.post('/api/deals', {
        leadId,
        pipelineId,
        stageId,
        productId: productId || undefined,
        value: parseFloat(value) || 0,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao criar negócio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose} title="Adicionar negócio" icon={<DollarSign size={14} />}>
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-brand-500" /></div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">Funil *</label>
            <select
              value={pipelineId}
              onChange={(e) => {
                setPipelineId(e.target.value);
                const p = pipelines.find((p) => p.id === e.target.value);
                setStageId(p?.stages?.[0]?.id || '');
              }}
              className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Selecione o funil</option>
              {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {selectedPipeline && (
            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">Etapa *</label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Selecione a etapa</option>
                {(selectedPipeline.stages || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {products.length > 0 && (
            <div>
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">Produto</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Sem produto</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">Valor (R$)</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
              className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !pipelineId || !stageId}
              className="flex-1 text-xs font-medium px-3 py-2 rounded-lg text-white disabled:opacity-60 transition-colors"
              style={{ backgroundColor: '#00A34D' }}
            >
              {saving ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}
    </ModalOverlay>
  );
}

// ── RunAutomationModal ──

function RunAutomationModal({ leadId, onClose, onSuccess }: { leadId: string; onClose: () => void; onSuccess: () => void }) {
  const [automations, setAutomations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/automations').then(({ data }) => setAutomations(data || [])).finally(() => setLoading(false));
  }, []);

  const filtered = automations.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  const handleRun = async () => {
    if (!selected) { setError('Selecione uma automação'); return; }
    setSaving(true);
    try {
      await api.post(`/api/automations/${selected}/execute`, { leadId });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao executar automação');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose} title="Executar automação" icon={<Zap size={14} />}>
      <div className="relative mb-2">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar automação..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs pl-7 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          autoFocus
        />
      </div>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-brand-500" /></div>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
          {filtered.length === 0
            ? <p className="text-xs text-slate-400 text-center py-3">Nenhuma automação encontrada</p>
            : filtered.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelected(a.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  selected === a.id
                    ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700 border border-transparent'
                }`}
              >
                <Zap size={11} className={selected === a.id ? 'text-purple-600' : 'text-slate-400'} />
                <span className={`text-xs font-medium truncate ${selected === a.id ? 'text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-slate-300'}`}>{a.name}</span>
                {a.isActive && <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Ativo</span>}
              </button>
            ))
          }
        </div>
      )}
      {error && <p className="text-xs text-red-500 flex items-center gap-1 mb-2"><AlertCircle size={11} />{error}</p>}
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          Cancelar
        </button>
        <button
          onClick={handleRun}
          disabled={saving || !selected}
          className="flex-1 text-xs font-medium px-3 py-2 rounded-lg text-white disabled:opacity-60 transition-colors"
          style={{ backgroundColor: '#7c3aed' }}
        >
          {saving ? 'Executando...' : 'Executar'}
        </button>
      </div>
    </ModalOverlay>
  );
}

// ── AddToListModal ──

function AddToListModal({ leadId, onClose, onSuccess }: { leadId: string; onClose: () => void; onSuccess: () => void }) {
  const [lists, setLists] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/config/lists').then(({ data }) => setLists(data || [])).finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!selected) { setError('Selecione uma lista'); return; }
    setSaving(true);
    try {
      await api.post(`/api/leads/${leadId}/lists`, { listId: selected });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao adicionar à lista');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose} title="Adicionar a lista" icon={<List size={14} />}>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-brand-500" /></div>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
          {lists.length === 0
            ? <p className="text-xs text-slate-400 text-center py-3">Nenhuma lista cadastrada</p>
            : lists.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelected(l.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  selected === l.id
                    ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-300 dark:border-brand-700'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700 border border-transparent'
                }`}
              >
                <List size={11} className={selected === l.id ? 'text-brand-600' : 'text-slate-400'} />
                <span className={`text-xs font-medium truncate ${selected === l.id ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'}`}>{l.name}</span>
              </button>
            ))
          }
        </div>
      )}
      {error && <p className="text-xs text-red-500 flex items-center gap-1 mb-2"><AlertCircle size={11} />{error}</p>}
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          Cancelar
        </button>
        <button
          onClick={handleAdd}
          disabled={saving || !selected}
          className="flex-1 text-xs font-medium px-3 py-2 rounded-lg text-white disabled:opacity-60 transition-colors"
          style={{ backgroundColor: '#00A34D' }}
        >
          {saving ? 'Adicionando...' : 'Adicionar'}
        </button>
      </div>
    </ModalOverlay>
  );
}

// ── AddressSection ──

function AddressSection({ lead, onSaved, open, onToggle }: { lead: Lead; onSaved: () => void; open: boolean; onToggle: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const addr = (lead.address && typeof lead.address === 'object' ? lead.address : {}) as Record<string, string>;
  const [form, setForm] = useState({
    street: addr.street || '',
    neighborhood: addr.neighborhood || '',
    city: addr.city || '',
    state: addr.state || '',
    zipCode: addr.zipCode || '',
    country: addr.country || '',
  });

  useEffect(() => {
    const a = (lead.address && typeof lead.address === 'object' ? lead.address : {}) as Record<string, string>;
    setForm({
      street: a.street || '', neighborhood: a.neighborhood || '',
      city: a.city || '', state: a.state || '',
      zipCode: a.zipCode || '', country: a.country || '',
    });
  }, [lead.address]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/api/leads/${lead.id}`, { address: form });
      setEditing(false);
      onSaved();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const hasAddress = addr.street || addr.city;

  return (
    <>
      <div
        onClick={onToggle}
        className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Endereço</span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { if (!open) onToggle(); setEditing(true); }}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-400 hover:text-brand-600 transition-colors"
            title="Editar endereço"
          >
            <MapPin size={11} />
          </button>
          <ChevronDown size={13} className={`text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} onClick={onToggle} />
        </div>
      </div>
      {open && (
        <div className="px-4 pb-3 border-b border-slate-100 dark:border-slate-700">
          {editing ? (
            <div className="space-y-2">
              {[
                { key: 'street', label: 'Rua / Av.' },
                { key: 'neighborhood', label: 'Bairro' },
                { key: 'city', label: 'Cidade' },
                { key: 'state', label: 'Estado' },
                { key: 'zipCode', label: 'CEP' },
                { key: 'country', label: 'País' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[10px] text-slate-400 mb-0.5 block">{label}</label>
                  <input
                    type="text"
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(false)} className="flex-1 text-xs text-slate-500 border border-slate-200 dark:border-slate-600 rounded-lg py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 text-xs text-white rounded-lg py-1.5 disabled:opacity-60 transition-colors"
                  style={{ backgroundColor: '#00A34D' }}
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {hasAddress ? (
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                  {addr.street && <p>{addr.street}</p>}
                  {addr.neighborhood && <p>{addr.neighborhood}</p>}
                  {(addr.city || addr.state) && <p>{[addr.city, addr.state].filter(Boolean).join(', ')}</p>}
                  {addr.zipCode && <p>CEP: {addr.zipCode}</p>}
                  {addr.country && <p>{addr.country}</p>}
                </div>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-brand-400 hover:text-brand-600 transition-colors"
                >
                  <MapPin size={11} />
                  Adicionar endereço
                </button>
              )}
              {hasAddress && (
                <button onClick={() => setEditing(true)} className="mt-2 text-[11px] text-brand-600 dark:text-brand-400 hover:underline">
                  Editar endereço
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── ModalOverlay ──

function ModalOverlay({ children, title, icon, onClose }: { children: React.ReactNode; title: string; icon?: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xs p-4 border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-50 dark:bg-brand-900/20 rounded-lg flex items-center justify-center text-brand-600 dark:text-brand-400">
              {icon}
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <X size={14} className="text-slate-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Sub-components ──

function SectionHeader({ label, open, onToggle, rightElement }: {
  label: string; open: boolean; onToggle: () => void; rightElement?: React.ReactNode;
}) {
  return (
    <div
      onClick={onToggle}
      className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {rightElement}
        <ChevronDown size={13} className={`text-slate-400 transition-transform ${open ? '' : '-rotate-90'} ml-1`} onClick={onToggle} />
      </div>
    </div>
  );
}

function ProfileRow({ label, value, field, placeholder, editing, editValue, onEdit, onSave, onCancel, onChange, saving }: {
  label: string; value?: string; field: string; placeholder?: string;
  editing: boolean; editValue: string;
  onEdit: () => void; onSave: () => void; onCancel: () => void;
  onChange: (v: string) => void; saving: boolean;
}) {
  return (
    <tr>
      <td className="py-1.5 pr-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap w-[90px] align-top pt-2">{label}</td>
      <td className="py-1.5">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={editValue}
              onChange={(e) => onChange(e.target.value)}
              className="text-xs border border-brand-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-200 dark:bg-slate-700 dark:border-brand-700 w-full"
              onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
              autoFocus
            />
            <button onClick={onSave} disabled={saving} className="text-brand-600 hover:text-brand-700 flex-shrink-0">
              <Check size={12} />
            </button>
          </div>
        ) : (
          <span
            onClick={onEdit}
            className="text-xs cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors block"
            title="Clique para editar"
          >
            {value || <span className="text-slate-300 dark:text-slate-600">{placeholder || '—'}</span>}
          </span>
        )}
      </td>
    </tr>
  );
}

function DealCard({ deal, leadName }: { deal: Deal; leadName?: string }) {
  return (
    <div className="px-4 pb-3 border-b border-slate-100 dark:border-slate-700">
      <div className="bg-white dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600 overflow-hidden">
        <div className="p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Avatar name={leadName || '?'} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{leadName}</p>
              {deal.product && (
                <p className="text-[10px] text-brand-600 dark:text-brand-400 font-medium truncate">{deal.product.name}</p>
              )}
            </div>
            <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400 flex-shrink-0">
              #{deal.id?.slice(-5).toUpperCase()}
            </span>
          </div>
          {deal.assignedUser && (
            <div className="flex items-center gap-1.5">
              <Avatar name={deal.assignedUser.name} size="xs" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{deal.assignedUser.name}</span>
            </div>
          )}
          {deal.value > 0 && (
            <div className="flex items-center gap-1">
              <DollarSign size={11} className="text-slate-400" />
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                R$ {deal.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar size={11} className="text-slate-400" />
            <span className="text-[11px] text-slate-500">
              {format(new Date(deal.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>
          {deal.pipeline && (
            <div className="flex items-center gap-1">
              <GitBranch size={11} className="text-slate-400" />
              <span className="text-[11px] text-slate-500">{deal.pipeline.name}</span>
              {deal.stage && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-1" style={{ backgroundColor: (deal.stage.color || '#6366f1') + '22', color: deal.stage.color || '#6366f1' }}>
                  {deal.stage.name}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const HISTORY_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  TAG_ADDED: { icon: <Tag size={10} />, color: '#6366f1' },
  LIST_ADDED: { icon: <List size={10} />, color: '#3b82f6' },
  AUTOMATION_TRIGGERED: { icon: <Zap size={10} />, color: '#8b5cf6' },
  DEAL_CREATED: { icon: <DollarSign size={10} />, color: '#10b981' },
  DEAL_STAGE_CHANGED: { icon: <ChevronRight size={10} />, color: '#3b82f6' },
  CONVERSATION_STARTED: { icon: <FileText size={10} />, color: '#f59e0b' },
  CONVERSATION_RESOLVED: { icon: <Check size={10} />, color: '#10b981' },
  CONVERSATION_ASSIGNED: { icon: <User2 size={10} />, color: '#6366f1' },
  LEAD_CREATED: { icon: <Plus size={10} />, color: '#10b981' },
};

function HistoryItem({ item, isLast }: { item: any; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = HISTORY_ICONS[item.type] || { icon: <FileText size={10} />, color: '#94a3b8' };

  return (
    <div className="flex gap-2.5 pt-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0"
          style={{ backgroundColor: cfg.color }}
        >
          {cfg.icon}
        </div>
        {!isLast && <div className="w-px flex-1 bg-slate-100 dark:bg-slate-700 mt-1 min-h-[16px]" />}
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <button onClick={() => setExpanded(!expanded)} className="text-left w-full">
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{item.description}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </p>
        </button>
        {expanded && item.metadata && Object.keys(item.metadata).length > 0 && (
          <div className="mt-1 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-700 rounded-lg p-1.5">
            {Object.entries(item.metadata).map(([k, v]) => (
              <p key={k}><span className="font-medium">{k}:</span> {String(v)}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
