import React, { useState, useEffect, useRef } from 'react';
import {
  X, Phone, Mail, Building2, Calendar, Edit3, Trash2, Save, ChevronDown,
  CheckCircle, XCircle, RefreshCw, Package, Tag, User2, History,
  Activity, GitBranch, FileText, Plus, Minus, MapPin, Globe, Clock,
  DollarSign, Hash, TrendingUp, ShoppingBag, MessageSquare, Check,
  Loader2, Search, AlertCircle,
} from 'lucide-react';
import { Deal, LostReason, Stage, Product } from '../../types';
import Avatar from '../shared/Avatar';
import TagPill from '../shared/TagPill';
import LeadTimeline from '../chat/LeadTimeline';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../../services/api';

interface DealModalProps {
  deal: Deal;
  stages: Stage[];
  onClose: () => void;
  onUpdate?: (dealId: string, payload: Partial<Deal>) => Promise<Deal>;
  onDelete?: (dealId: string) => void;
  onWon?: (dealId: string) => Promise<Deal>;
  onLost?: (dealId: string, lostReasonId?: string) => Promise<Deal>;
  onReopen?: (dealId: string) => Promise<Deal>;
}

const STATUS_CFG = {
  OPEN: { label: 'Em aberto', cls: 'bg-brand-100 text-brand-700' },
  WON:  { label: 'Ganho', cls: 'bg-emerald-100 text-emerald-700' },
  LOST: { label: 'Perdido', cls: 'bg-red-100 text-red-700' },
};

type RightTab = 'info' | 'historico' | 'atividades' | 'negocios';
type LeftTab = 'perfil' | 'endereco' | 'campos';
type InfoSubTab = 'produtos' | 'atividades';

function dealNumber(deal: Deal) {
  return '#' + String(Math.floor(new Date(deal.createdAt).getTime() / 1000) % 100000).padStart(5, '0');
}

interface EditableFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onSave: (val: string) => Promise<void>;
}

function EditableField({ label, value, placeholder, type = 'text', onSave }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value || ''); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = async () => {
    if (draft === (value || '')) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(draft); setEditing(false); }
    catch { /* keep editing open on error */ }
    finally { setSaving(false); }
  };

  return (
    <div>
      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1 mt-0.5">
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); } }}
            className="flex-1 text-xs border border-brand-300 rounded-md px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 min-w-0"
            placeholder={placeholder}
          />
          <button onClick={commit} disabled={saving} className="p-0.5 text-brand-600 hover:text-brand-700 flex-shrink-0">
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          </button>
          <button onClick={() => { setDraft(value || ''); setEditing(false); }} className="p-0.5 text-slate-400 hover:text-slate-600 flex-shrink-0">
            <X size={11} />
          </button>
        </div>
      ) : (
        <div
          className="flex items-center gap-1 group/ef cursor-pointer mt-0.5"
          onClick={() => setEditing(true)}
        >
          <p className={'text-xs flex-1 ' + (value ? 'text-slate-700 font-medium' : 'text-slate-300 italic')}>{value || placeholder || '—'}</p>
          <Edit3 size={10} className="text-slate-200 group-hover/ef:text-brand-400 flex-shrink-0 transition-colors" />
        </div>
      )}
    </div>
  );
}

export default function DealModal({ deal: init, stages, onClose, onUpdate, onDelete, onWon, onLost, onReopen }: DealModalProps) {
  const [deal, setDeal] = useState(init);
  const [fullDeal, setFullDeal] = useState<Deal | null>(null);
  const [loadingFull, setLoadingFull] = useState(true);
  const [leadData, setLeadData] = useState<Record<string, any>>({});

  // UI state
  const [rightTab, setRightTab] = useState<RightTab>('info');
  const [leftTab, setLeftTab] = useState<LeftTab>('perfil');
  const [infoSubTab, setInfoSubTab] = useState<InfoSubTab>('produtos');

  // Edit state
  const [editingValue, setEditingValue] = useState(false);
  const [editValue, setEditValue] = useState(String(init.value || 0));
  const [editStageId, setEditStageId] = useState(init.stageId);
  const [saving, setSaving] = useState(false);
  const [actLoading, setActLoading] = useState(false);

  // Products state
  const [qty, setQty] = useState(init.quantity || 1);
  const [discount, setDiscount] = useState(init.discount || 0);
  const [surcharge, setSurcharge] = useState(init.surcharge || 0);
  const [freight, setFreight] = useState(init.freight || 0);
  const [savingValues, setSavingValues] = useState(false);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  // Inline new product form
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductValue, setNewProductValue] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);

  const productResults = allProducts.filter((p) =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Notes
  const [notes, setNotes] = useState(init.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lost modal
  const [lostReasons, setLostReasons] = useState<LostReason[]>([]);
  const [showLostModal, setShowLostModal] = useState(false);
  const [selectedLost, setSelectedLost] = useState('');

  const lead = fullDeal?.lead || deal.lead;
  const sc = STATUS_CFG[deal.status as keyof typeof STATUS_CFG] || STATUS_CFG.OPEN;

  useEffect(() => {
    api.get('/api/deals/' + init.id)
      .then(({ data }) => {
        setFullDeal(data);
        setQty(data.quantity || 1);
        setDiscount(data.discount || 0);
        setSurcharge(data.surcharge || 0);
        setFreight(data.freight || 0);
        setNotes(data.notes || '');
        // Initialize lead data for editing
        const l = data.lead || {};
        setLeadData({
          name: l.name || '',
          company: l.company || '',
          email: l.email || '',
          phone: l.phone || '',
          document: l.document || '',
          source: l.source || '',
          zip: (l.address as any)?.zip || '',
          street: (l.address as any)?.street || '',
          number: (l.address as any)?.number || '',
          city: (l.address as any)?.city || '',
          state: (l.address as any)?.state || '',
        });
      })
      .catch(() => {})
      .finally(() => setLoadingFull(false));
    api.get('/api/config/lost-reasons').then(({ data }) => setLostReasons(data)).catch(() => {});
  }, [init.id]);

  const saveLead = async (field: string, value: string) => {
    const isAddress = ['zip', 'street', 'number', 'city', 'state'].includes(field);
    let payload: Record<string, any>;
    if (isAddress) {
      const currentAddr = (lead?.address as Record<string, string>) || {};
      payload = { address: { ...currentAddr, [field]: value } };
    } else {
      payload = { [field]: value };
    }
    await api.put('/api/leads/' + (lead?.id || init.leadId), payload);
    setLeadData((prev) => ({ ...prev, [field]: value }));
    // Update fullDeal lead too
    if (fullDeal) {
      if (isAddress) {
        setFullDeal((prev) => prev ? {
          ...prev,
          lead: { ...prev.lead, address: { ...(prev.lead?.address as any || {}), [field]: value } }
        } : prev);
      } else {
        setFullDeal((prev) => prev ? { ...prev, lead: { ...prev.lead, [field]: value } } : prev);
      }
    }
  };

  // Auto-save notes
  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      setSavingNotes(true);
      try { await api.put('/api/deals/' + deal.id, { notes: val }); } catch {}
      finally { setSavingNotes(false); }
    }, 1000);
  };

  const saveValueEdit = async () => {
    if (!onUpdate) return;
    setSaving(true);
    try {
      const d = await onUpdate(deal.id, { value: parseFloat(editValue) || 0, stageId: editStageId } as Partial<Deal>);
      setDeal(d); setEditingValue(false);
    } catch {} finally { setSaving(false); }
  };

  const saveProductValues = async () => {
    setSavingValues(true);
    try {
      const basePrice = deal.product?.defaultValue || deal.value || 0;
      const newValue = basePrice * qty - discount + surcharge + freight;
      const { data } = await api.put('/api/deals/' + deal.id, { quantity: qty, discount, surcharge, freight, value: newValue });
      const product = data.product || deal.product;
      setDeal({ ...data, product });
      setEditValue(String(data.value || 0));
      if (fullDeal) setFullDeal({ ...fullDeal, ...data, product });
      // Sync Kanban board state
      onUpdate?.(deal.id, { value: data.value, quantity: qty, discount, surcharge, freight } as Partial<Deal>);
    } catch {} finally { setSavingValues(false); }
  };

  const openProductSearch = async () => {
    setShowProductSearch((v) => !v);
    if (allProducts.length === 0) {
      setLoadingProducts(true);
      try {
        const { data } = await api.get('/api/products');
        setAllProducts(Array.isArray(data) ? data : []);
      } catch { setAllProducts([]); }
      finally { setLoadingProducts(false); }
    }
  };

  const addProduct = async (product: Product) => {
    setAddingProduct(true);
    try {
      const existingDealValue = deal.value || 0;
      const productPrice = (product.defaultValue || 0) * qty - discount + surcharge + freight;
      const newValue = existingDealValue + productPrice;
      const { data } = await api.put('/api/deals/' + deal.id, {
        productId: product.id,
        quantity: qty,
        discount,
        surcharge,
        freight,
        value: newValue,
      });
      setDeal({ ...data, product });
      setEditValue(String(data.value || 0));
      if (fullDeal) setFullDeal({ ...fullDeal, ...data, product });
      onUpdate?.(deal.id, { value: data.value, productId: product.id, quantity: qty, discount, surcharge, freight } as Partial<Deal>);
      setShowProductSearch(false);
      setProductSearch('');
    } catch (err) {
      console.error('addProduct error:', err);
    } finally { setAddingProduct(false); }
  };

  const createAndAddProduct = async () => {
    if (!newProductName.trim()) return;
    setCreatingProduct(true);
    try {
      const { data: created } = await api.post('/api/products', {
        name: newProductName.trim(),
        defaultValue: parseFloat(newProductValue) || 0,
      });
      setAllProducts((prev) => [...prev, created]);
      await addProduct(created);
      setShowNewProduct(false);
      setNewProductName('');
      setNewProductValue('');
    } catch (err) { console.error(err); } finally { setCreatingProduct(false); }
  };

  const removeProduct = async () => {
    try {
      const { data } = await api.put('/api/deals/' + deal.id, { productId: null });
      setDeal({ ...deal, productId: undefined, product: undefined });
      if (fullDeal) setFullDeal({ ...fullDeal, ...data, product: undefined });
    } catch {}
  };

  const markWon = async () => {
    if (!onWon) return; setActLoading(true);
    try { setDeal(await onWon(deal.id)); } catch {} finally { setActLoading(false); }
  };

  const markLost = async () => {
    if (!onLost) return; setActLoading(true);
    try { setDeal(await onLost(deal.id, selectedLost || undefined)); setShowLostModal(false); } catch {} finally { setActLoading(false); }
  };

  const markReopen = async () => {
    if (!onReopen) return; setActLoading(true);
    try { setDeal(await onReopen(deal.id)); } catch {} finally { setActLoading(false); }
  };

  const handleDelete = () => {
    if (!onDelete || !confirm('Deletar este negocio?')) return;
    onDelete(deal.id); onClose();
  };

  // Metrics
  const allDeals = (fullDeal?.lead as any)?.deals || [];
  const wonDeals = allDeals.filter((d: any) => d.status === 'WON');
  const totalWon = wonDeals.reduce((s: number, d: any) => s + (d.value || 0), 0);
  const ticketMedio = wonDeals.length > 0 ? totalWon / wonDeals.length : 0;
  const lastDeal = wonDeals.length > 0 ? wonDeals[0] : null;
  const cicloDias = wonDeals.length > 1
    ? Math.round(differenceInDays(new Date(wonDeals[0].createdAt), new Date(wonDeals[wonDeals.length - 1].createdAt)) / (wonDeals.length - 1))
    : 0;

  const allStages = fullDeal?.pipeline?.stages || stages;
  const currentStageIdx = allStages.findIndex((s) => s.id === deal.stageId);

  const basePrice = (deal.product?.defaultValue || deal.value || 0);
  const productTotal = (basePrice * qty) - discount + surcharge + freight;

  const activities = fullDeal?.activities || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[960px] h-[90vh] flex overflow-hidden animate-fade-in-up">

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <X size={16} className="text-slate-500" />
        </button>

        {/* ===== LEFT PANEL ===== */}
        <div className="w-[275px] flex-shrink-0 border-r border-slate-100 flex flex-col overflow-hidden">

          {/* Lead Header */}
          <div className="px-5 pt-5 pb-3 text-center border-b border-slate-100">
            <div className="relative inline-block mb-3">
              <Avatar name={leadData.name || lead?.name || '?'} size="xl" />
            </div>
            {/* Editable name in header */}
            <div className="flex items-center justify-center gap-1 group/name mb-1.5">
              <h2 className="text-sm font-semibold text-slate-900">{leadData.name || lead?.name}</h2>
            </div>
            <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' + sc.cls}>{sc.label}</span>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">{dealNumber(deal)}</div>

            {/* Phone quick-access */}
            {(leadData.phone || lead?.phone) && (
              <a
                href={`tel:${(leadData.phone || lead?.phone || '').replace(/\D/g, '')}`}
                className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-brand-600 hover:text-brand-700 font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone size={11} />
                {leadData.phone || lead?.phone}
              </a>
            )}

            {/* Tags */}
            {lead?.tags && lead.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center mt-2">
                {lead.tags.map(({ tag }: any) => <TagPill key={tag.id} name={tag.name} color={tag.color} small />)}
              </div>
            )}

            {/* Assigned user */}
            {deal.assignedUser && (
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <Avatar name={deal.assignedUser.name} src={deal.assignedUser.avatar} size="xs" />
                <span className="text-xs text-slate-500 truncate max-w-[180px]">{deal.assignedUser.name}</span>
              </div>
            )}
          </div>

          {/* Metrics */}
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Métricas</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Ticket médio', value: ticketMedio > 0 ? 'R$ ' + ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'R$ 0,00' },
                { label: 'Total ganho', value: totalWon > 0 ? 'R$ ' + totalWon.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'R$ 0,00' },
                { label: 'Ciclo de compra', value: cicloDias > 0 ? cicloDias + ' dias' : '—' },
                { label: 'Última compra', value: lastDeal ? format(new Date(lastDeal.createdAt), 'dd/MM/yy') : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-2">
                  <p className="text-[9px] font-medium text-slate-400 mb-0.5">{label}</p>
                  <p className="text-xs font-semibold text-slate-700">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Notas</p>
              {savingNotes && <span className="text-[9px] text-slate-400">Salvando...</span>}
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Adicione notas sobre este negócio..."
              rows={3}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-slate-300 text-slate-800"
            />
          </div>

          {/* Left tabs */}
          <div className="flex border-b border-slate-100 px-1">
            {(['perfil', 'endereco', 'campos'] as const).map((t) => (
              <button key={t} onClick={() => setLeftTab(t)} className={'flex-1 py-2 text-[10px] font-medium border-b-2 transition-colors ' + (leftTab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-600')}>
                {t === 'perfil' ? 'Perfil' : t === 'endereco' ? 'Endereço' : 'Campos'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {leftTab === 'perfil' && (
              <div className="space-y-3">
                <EditableField label="Nome" value={leadData.name} placeholder="Nome do lead" onSave={(v) => saveLead('name', v)} />
                <EditableField label="Empresa" value={leadData.company} placeholder="Nome da empresa" onSave={(v) => saveLead('company', v)} />
                <EditableField label="E-mail" value={leadData.email} placeholder="email@exemplo.com" type="email" onSave={(v) => saveLead('email', v)} />
                <EditableField label="Telefone" value={leadData.phone} placeholder="+55 (11) 99999-9999" onSave={(v) => saveLead('phone', v)} />
                <EditableField label="Documento" value={leadData.document} placeholder="CPF ou CNPJ" onSave={(v) => saveLead('document', v)} />
                <EditableField label="Origem" value={leadData.source} placeholder="Como soube de nós?" onSave={(v) => saveLead('source', v)} />
              </div>
            )}
            {leftTab === 'endereco' && (
              <div className="space-y-3">
                <EditableField label="CEP" value={leadData.zip} placeholder="00000-000" onSave={(v) => saveLead('zip', v)} />
                <EditableField label="Rua" value={leadData.street} placeholder="Rua / Avenida" onSave={(v) => saveLead('street', v)} />
                <EditableField label="Número" value={leadData.number} placeholder="123" onSave={(v) => saveLead('number', v)} />
                <EditableField label="Cidade" value={leadData.city} placeholder="Cidade" onSave={(v) => saveLead('city', v)} />
                <EditableField label="Estado" value={leadData.state} placeholder="Estado" onSave={(v) => saveLead('state', v)} />
              </div>
            )}
            {leftTab === 'campos' && (
              <p className="text-xs text-slate-400 text-center py-4">Nenhum campo adicional configurado</p>
            )}
          </div>

          {/* Footer actions */}
          <div className="border-t border-slate-100 p-3 space-y-1.5">
            {deal.status === 'OPEN' ? (
              <div className="flex gap-1.5">
                <button onClick={() => setShowLostModal(true)} disabled={actLoading} className="flex-1 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 flex items-center justify-center gap-1 disabled:opacity-50 transition-colors">
                  <XCircle size={12} /> Perdido
                </button>
                <button onClick={markWon} disabled={actLoading} className="flex-1 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 flex items-center justify-center gap-1 disabled:opacity-50 transition-colors">
                  <CheckCircle size={12} /> {actLoading ? '...' : 'Ganho!'}
                </button>
              </div>
            ) : (
              <button onClick={markReopen} disabled={actLoading} className="w-full py-2 text-xs font-medium text-brand-600 bg-brand-50 rounded-xl hover:bg-brand-100 flex items-center justify-center gap-1 transition-colors">
                <RefreshCw size={12} /> {actLoading ? 'Reabrindo...' : 'Reabrir negócio'}
              </button>
            )}
            <button onClick={handleDelete} className="w-full py-1.5 text-[11px] text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-1">
              <Trash2 size={11} /> Excluir negócio
            </button>
          </div>
        </div>

        {/* ===== RIGHT PANEL ===== */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Right tabs */}
          <div className="flex items-center border-b border-slate-100 px-5 pr-12">
            {([
              ['historico', 'Histórico', History],
              ['atividades', 'Atividades', Activity],
              ['negocios', 'Negócios', GitBranch],
              ['info', 'Negócio', FileText],
            ] as [RightTab, string, any][]).map(([tab, label, Icon]) => (
              <button key={tab} onClick={() => setRightTab(tab)} className={'flex items-center gap-1.5 px-3 py-3.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ' + (rightTab === tab ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* ---- INFO DO NEGÓCIO ---- */}
            {rightTab === 'info' && (
              <div className="p-5 space-y-5">

                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide mb-1">Número</p>
                    <p className="text-xl font-bold text-blue-700">{dealNumber(deal)}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide mb-1">Valor Total</p>
                    {editingValue ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full text-sm font-bold border border-emerald-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800" min={0} />
                        <button onClick={saveValueEdit} disabled={saving} className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex-shrink-0"><Save size={12} /></button>
                        <button onClick={() => setEditingValue(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={12} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <p className="text-xl font-bold text-emerald-700">R$ {(deal.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        {deal.status === 'OPEN' && <button onClick={() => setEditingValue(true)} className="p-1 text-emerald-500 hover:text-emerald-700"><Edit3 size={11} /></button>}
                      </div>
                    )}
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                    <p className="text-[10px] font-semibold text-purple-500 uppercase tracking-wide mb-1">Criado em</p>
                    <p className="text-xl font-bold text-purple-700">{format(new Date(deal.createdAt), 'dd/MM/yyyy')}</p>
                  </div>
                </div>

                {/* Pipeline progress */}
                {allStages.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Pipeline</p>
                    <div className="overflow-x-auto pb-2">
                      <div className="flex items-center gap-0 min-w-max">
                        {allStages.map((s, idx) => {
                          const isPast = idx < currentStageIdx;
                          const isCurrent = idx === currentStageIdx;
                          return (
                            <div key={s.id} className="flex items-center">
                              <div className="flex flex-col items-center gap-1.5 px-2">
                                <div
                                  className={'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer ' + (isCurrent ? 'border-slate-900 bg-slate-900' : isPast ? 'border-emerald-500 bg-emerald-500' : 'border-slate-200 bg-white')}
                                  onClick={() => deal.status === 'OPEN' && setEditStageId(s.id)}
                                >
                                  {isPast ? <CheckCircle size={14} className="text-white" /> : isCurrent ? <div className="w-3 h-3 rounded-full bg-white" /> : <Clock size={12} className="text-slate-300" />}
                                </div>
                                <span className={'text-[9px] font-medium text-center max-w-[60px] leading-tight ' + (isCurrent ? 'text-slate-900 font-bold' : isPast ? 'text-emerald-600' : 'text-slate-400')}>
                                  {s.name.toUpperCase()}
                                </span>
                              </div>
                              {idx < allStages.length - 1 && (
                                <div className={'h-0.5 w-8 flex-shrink-0 ' + (idx < currentStageIdx ? 'bg-emerald-400' : 'bg-slate-200')} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {deal.status === 'OPEN' && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-slate-500 flex-shrink-0">Etapa:</span>
                        <select value={editStageId} onChange={(e) => setEditStageId(e.target.value)} className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800">
                          {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        {editStageId !== deal.stageId && (
                          <button onClick={saveValueEdit} disabled={saving} className="px-2.5 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 flex-shrink-0">
                            {saving ? '...' : 'Mover'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-tabs: Produtos | Atividades */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <div className="flex border-b border-slate-100 bg-slate-50">
                    {([
                      ['produtos', 'Produtos e Valores', Package],
                      ['atividades', 'Atividades', Activity],
                    ] as [InfoSubTab, string, any][]).map(([t, label, Icon]) => (
                      <button key={t} onClick={() => setInfoSubTab(t)} className={'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ' + (infoSubTab === t ? 'border-brand-600 text-brand-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700')}>
                        <Icon size={11} /> {label}
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {/* PRODUTOS */}
                    {infoSubTab === 'produtos' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package size={14} className="text-slate-500" />
                            <span className="text-sm font-semibold text-slate-700">Produtos e Valores</span>
                          </div>
                          {deal.status === 'OPEN' && (
                            <button
                              onClick={openProductSearch}
                              className="text-xs text-brand-600 font-medium hover:text-brand-700 flex items-center gap-1"
                            >
                              <Plus size={11} /> {deal.product ? 'Trocar produto' : 'Adicionar produto'}
                            </button>
                          )}
                        </div>

                        {/* Product search panel */}
                        {showProductSearch && (
                          <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
                            <div className="relative">
                              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                placeholder="Filtrar produto por nome..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                                autoFocus
                              />
                              {loadingProducts && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                            </div>
                            {loadingProducts ? (
                              <p className="text-[11px] text-slate-400 text-center py-2">Carregando produtos...</p>
                            ) : productResults.length > 0 ? (
                              <div className="max-h-44 overflow-y-auto space-y-1">
                                {productResults.map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => addProduct(p)}
                                    disabled={addingProduct}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all text-left"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs font-bold text-purple-600">{p.name.charAt(0)}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-800 truncate">{p.name}</p>
                                      {p.category && <p className="text-[10px] text-slate-400">SKU: {p.category}</p>}
                                    </div>
                                    <span className="text-xs font-bold text-emerald-600 flex-shrink-0">R$ {p.defaultValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 text-center py-2">
                                {allProducts.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum produto encontrado'}
                              </p>
                            )}
                            {/* Inline create new product */}
                            {showNewProduct ? (
                              <div className="border border-brand-200 rounded-lg p-3 space-y-2 bg-brand-50/40">
                                <p className="text-[11px] font-semibold text-slate-600">Novo produto</p>
                                <input
                                  type="text"
                                  value={newProductName}
                                  onChange={(e) => setNewProductName(e.target.value)}
                                  placeholder="Nome do produto *"
                                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                                  autoFocus
                                />
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                                  <input
                                    type="number"
                                    value={newProductValue}
                                    onChange={(e) => setNewProductValue(e.target.value)}
                                    placeholder="0,00"
                                    min={0} step={0.01}
                                    className="w-full text-xs border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => { setShowNewProduct(false); setNewProductName(''); setNewProductValue(''); }} className="flex-1 py-1.5 text-xs text-slate-600 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">Cancelar</button>
                                  <button onClick={createAndAddProduct} disabled={!newProductName.trim() || creatingProduct} className="flex-1 py-1.5 text-xs text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium flex items-center justify-center gap-1 transition-colors">
                                    {creatingProduct ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Criar e adicionar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setShowNewProduct(true)} className="text-[11px] text-brand-600 hover:text-brand-700 font-medium w-full text-center flex items-center justify-center gap-1">
                                <Plus size={11} /> Criar novo produto
                              </button>
                            )}
                            <button onClick={() => { setShowProductSearch(false); setProductSearch(''); setShowNewProduct(false); }} className="text-[11px] text-slate-400 hover:text-slate-600 w-full text-center">Cancelar</button>
                          </div>
                        )}

                        {/* Current product */}
                        {(deal.product || fullDeal?.product) ? (() => {
                          const p = deal.product || fullDeal?.product!;
                          return (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0 bg-purple-400">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                                {p.category && <p className="text-[11px] text-slate-400">SKU: {p.category}</p>}
                                <p className="text-[11px] text-slate-400">R$ {p.defaultValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / un.</p>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <p className="text-sm font-semibold text-slate-900">R$ {(p.defaultValue * qty).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                <div className="flex items-center gap-1.5 mt-1 justify-end">
                                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-5 h-5 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"><Minus size={10} /></button>
                                  <span className="text-xs font-medium text-slate-700 w-4 text-center">{qty}</span>
                                  <button onClick={() => setQty(qty + 1)} className="w-5 h-5 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"><Plus size={10} /></button>
                                </div>
                              </div>
                              {deal.status === 'OPEN' && (
                                <button onClick={removeProduct} className="p-1 text-slate-300 hover:text-red-400 transition-colors ml-1">
                                  <X size={13} />
                                </button>
                              )}
                            </div>
                          );
                        })() : !showProductSearch && (
                          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                            <Package size={20} className="text-slate-300 mx-auto mb-1.5" />
                            <p className="text-xs text-slate-400">Nenhum produto adicionado</p>
                          </div>
                        )}

                        {/* Discount/surcharge/freight */}
                        <div className="space-y-2">
                          {[
                            { label: 'Desconto (−)', state: discount, setter: setDiscount },
                            { label: 'Acréscimo (+)', state: surcharge, setter: setSurcharge },
                            { label: 'Frete (+)', state: freight, setter: setFreight },
                          ].map(({ label, state, setter }) => (
                            <div key={label} className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">{label}</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={state}
                                  onChange={(e) => setter(parseFloat(e.target.value) || 0)}
                                  min={0} step={0.01}
                                  className="w-24 text-xs text-right border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                                />
                                <span className="text-xs text-slate-500 w-20 text-right">R$ {state.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <span className="text-sm font-bold text-slate-900">Total</span>
                          <span className="text-sm font-bold text-slate-900">R$ {productTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>

                        {deal.status === 'OPEN' && (
                          <button onClick={saveProductValues} disabled={savingValues} className="w-full py-2 text-xs font-medium text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors">
                            <Save size={11} /> {savingValues ? 'Salvando...' : 'Salvar valores'}
                          </button>
                        )}

                        {deal.status === 'LOST' && deal.lostReason && (
                          <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                            <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide mb-0.5">Motivo da perda</p>
                            <p className="text-sm font-medium text-red-700">{deal.lostReason.name}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ATIVIDADES sub-tab */}
                    {infoSubTab === 'atividades' && (
                      <div>
                        {loadingFull ? (
                          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
                        ) : activities.length > 0 ? (
                          <div className="space-y-2">
                            {activities.map((a) => (
                              <ActivityItem key={a.id} activity={a} />
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 text-center py-8">Nenhuma atividade</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ---- HISTÓRICO ---- */}
            {rightTab === 'historico' && (
              <div className="p-5">
                {loadingFull ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
                ) : fullDeal?.lead?.history && fullDeal.lead.history.length > 0 ? (
                  <LeadTimeline history={fullDeal.lead.history} />
                ) : (
                  <p className="text-xs text-slate-400 text-center py-12">Nenhum histórico disponível</p>
                )}
              </div>
            )}

            {/* ---- ATIVIDADES ---- */}
            {rightTab === 'atividades' && (
              <div className="p-5">
                {loadingFull ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
                ) : activities.length > 0 ? (
                  <div className="space-y-2">
                    {activities.map((a) => (
                      <ActivityItem key={a.id} activity={a} large />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-12">Nenhuma atividade</p>
                )}
              </div>
            )}

            {/* ---- NEGÓCIOS ---- */}
            {rightTab === 'negocios' && (
              <div className="p-5">
                {loadingFull && <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>}
                {!loadingFull && allDeals.length > 0 ? (
                  <div className="space-y-2">
                    {allDeals.map((d: any) => (
                      <div key={d.id} className={'p-3 rounded-xl border ' + (d.id === deal.id ? 'border-brand-300 bg-brand-50' : 'border-slate-100 bg-slate-50')}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-700">{d.pipeline?.name || 'Pipeline'}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={'text-[10px] font-semibold px-1.5 py-0.5 rounded-full ' + (d.status === 'WON' ? 'bg-emerald-100 text-emerald-700' : d.status === 'LOST' ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-700')}>
                              {d.status === 'WON' ? 'Ganho' : d.status === 'LOST' ? 'Perdido' : 'Aberto'}
                            </span>
                            <span className="text-xs font-bold text-emerald-600">R$ {(d.value || 0).toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                        {d.stage && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: d.stage.color || '#64748b' }}>{d.stage.name}</span>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">{format(new Date(d.createdAt), "dd/MM/yyyy")}</p>
                      </div>
                    ))}
                  </div>
                ) : !loadingFull ? (
                  <p className="text-xs text-slate-400 text-center py-12">Nenhum outro negócio</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lost modal */}
      {showLostModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 animate-fade-in-up">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Motivo da perda</h3>
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {lostReasons.map((r) => (
                <button key={r.id} onClick={() => setSelectedLost(r.id)} className={'w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ' + (selectedLost === r.id ? 'border-red-400 bg-red-50 text-red-700 font-medium' : 'border-slate-200 text-slate-700 hover:border-red-200')}>
                  {r.name}
                </button>
              ))}
              {lostReasons.length === 0 && <p className="text-sm text-slate-400 text-center py-2">Nenhum motivo cadastrado</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowLostModal(false)} className="flex-1 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={markLost} disabled={actLoading} className="flex-1 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium">{actLoading ? 'Salvando...' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityItem({ activity: a, large }: { activity: any; large?: boolean }) {
  const iconColor = a.type?.color || '#6366f1';
  return (
    <div className={'flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100'}>
      <div
        className={'rounded-lg flex items-center justify-center flex-shrink-0 ' + (large ? 'w-9 h-9' : 'w-7 h-7')}
        style={{ backgroundColor: iconColor + '22' }}
      >
        <Activity size={large ? 14 : 12} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={'font-medium text-slate-900 ' + (large ? 'text-sm' : 'text-xs')}>{a.title}</p>
          {a.type?.name && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: iconColor + '22', color: iconColor }}
            >
              {a.type.name}
            </span>
          )}
        </div>
        {a.description && <p className={'text-slate-500 mt-0.5 ' + (large ? 'text-xs' : 'text-[10px]')}>{a.description}</p>}
        <div className="flex items-center gap-3 mt-1">
          <p className="text-[10px] text-slate-400">{format(new Date(a.createdAt), "dd/MM/yy 'às' HH:mm")}</p>
          {a.dueDate && (
            <p className="text-[10px] text-orange-500 flex items-center gap-0.5">
              <Clock size={9} /> Prazo: {format(new Date(a.dueDate), 'dd/MM/yy HH:mm')}
            </p>
          )}
          {a.assignedUser && (
            <p className="text-[10px] text-slate-400">{a.assignedUser.name}</p>
          )}
        </div>
      </div>
    </div>
  );
}
