import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, Plus, Search, RefreshCw, Package, CheckCircle, AlertTriangle,
  Clock, X, ChevronRight, MapPin, Calendar, Copy, Check, Globe,
  Zap, ExternalLink, RotateCcw, Trash2, Edit3, ArrowRight, Info,
  PackageCheck, PackageX, PackageSearch,
} from 'lucide-react';
import api from '../services/api';

// ── types ─────────────────────────────────────────────────────────────────────
type CarrierCode = 'CORREIOS' | 'JADLOG' | 'LOGGI' | 'TOTAL_EXPRESS' | 'MELHOR_ENVIO' | 'CUSTOM';
type ShipmentStatus = 'POSTED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'EXCEPTION' | 'RETURNED' | 'CANCELLED';

interface ShipmentEvent {
  description: string;
  location: string;
  eventDate: string;
}

interface Shipment {
  id: string;
  leadName: string;
  product: string;
  trackingCode: string;
  carrier: CarrierCode;
  status: ShipmentStatus;
  events: ShipmentEvent[];
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  notes: string | null;
  externalOrderId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  posted: number;
  inTransit: number;
  outForDelivery: number;
  delivered: number;
  exception: number;
  deliveredToday: number;
}

// ── constants ─────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<ShipmentStatus, { label: string; color: string; bg: string; darkBg: string; icon: React.ElementType; dot: string }> = {
  POSTED:           { label: 'Postado',          color: 'text-blue-700',    bg: 'bg-blue-100',   darkBg: 'dark:bg-blue-900/30',   icon: Package,       dot: 'bg-blue-500'    },
  IN_TRANSIT:       { label: 'Em Trânsito',       color: 'text-amber-700',   bg: 'bg-amber-100',  darkBg: 'dark:bg-amber-900/30',  icon: Truck,         dot: 'bg-amber-500'   },
  OUT_FOR_DELIVERY: { label: 'Saiu p/ Entrega',   color: 'text-orange-700',  bg: 'bg-orange-100', darkBg: 'dark:bg-orange-900/30', icon: ArrowRight,    dot: 'bg-orange-500'  },
  DELIVERED:        { label: 'Entregue',           color: 'text-emerald-700', bg: 'bg-emerald-100',darkBg: 'dark:bg-emerald-900/30',icon: CheckCircle,   dot: 'bg-emerald-500' },
  EXCEPTION:        { label: 'Problema',           color: 'text-red-700',     bg: 'bg-red-100',    darkBg: 'dark:bg-red-900/30',    icon: AlertTriangle, dot: 'bg-red-500'     },
  RETURNED:         { label: 'Devolvido',          color: 'text-purple-700',  bg: 'bg-purple-100', darkBg: 'dark:bg-purple-900/30', icon: RotateCcw,     dot: 'bg-purple-500'  },
  CANCELLED:        { label: 'Cancelado',          color: 'text-slate-600',   bg: 'bg-slate-100',  darkBg: 'dark:bg-slate-700',     icon: X,             dot: 'bg-slate-400'   },
};

const CARRIER_CFG: Record<CarrierCode, { label: string; color: string; bg: string; textBg: string; trackUrl: string }> = {
  CORREIOS:      { label: 'Correios',      color: 'text-yellow-700', bg: 'bg-yellow-50',  textBg: 'bg-yellow-100', trackUrl: 'https://rastreamento.correios.com.br/app/index.php?objeto=' },
  JADLOG:        { label: 'Jadlog',        color: 'text-green-700',  bg: 'bg-green-50',   textBg: 'bg-green-100',  trackUrl: 'https://www.jadlog.com.br/siteInstitucional/tracking.jad?cte=' },
  LOGGI:         { label: 'Loggi',         color: 'text-violet-700', bg: 'bg-violet-50',  textBg: 'bg-violet-100', trackUrl: 'https://www.loggi.com/rastreador/?q=' },
  TOTAL_EXPRESS: { label: 'Total Express', color: 'text-orange-700', bg: 'bg-orange-50',  textBg: 'bg-orange-100', trackUrl: 'https://rastreamento.totalexpress.com.br/' },
  MELHOR_ENVIO:  { label: 'Melhor Envio',  color: 'text-sky-700',    bg: 'bg-sky-50',     textBg: 'bg-sky-100',    trackUrl: 'https://melhorenvio.com.br/rastreamento/' },
  CUSTOM:        { label: 'Personalizado', color: 'text-slate-700',  bg: 'bg-slate-50',   textBg: 'bg-slate-100',  trackUrl: '' },
};

const CARRIERS = Object.entries(CARRIER_CFG) as [CarrierCode, typeof CARRIER_CFG[CarrierCode]][];

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ShipmentStatus }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.POSTED;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.darkBg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── CarrierBadge ──────────────────────────────────────────────────────────────
function CarrierBadge({ carrier }: { carrier: CarrierCode }) {
  const cfg = CARRIER_CFG[carrier] || CARRIER_CFG.CUSTOM;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${cfg.textBg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────
function Timeline({ events, status }: { events: ShipmentEvent[]; status: ShipmentStatus }) {
  if (!events.length) return <p className="text-xs text-slate-400 text-center py-6">Nenhum evento registrado ainda</p>;

  // Steps for visual progress
  const steps: ShipmentStatus[] = ['POSTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  const stepIdx = steps.indexOf(status);
  const isException = status === 'EXCEPTION' || status === 'RETURNED' || status === 'CANCELLED';

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      {!isException && (
        <div className="flex items-center gap-0 mb-6">
          {steps.map((s, i) => {
            const cfg = STATUS_CFG[s];
            const done = i <= stepIdx;
            const active = i === stepIdx;
            return (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    done ? `${cfg.bg} ${cfg.color} border-current` : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                  } ${active ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                    <cfg.icon size={14} className={done ? cfg.color : 'text-slate-300 dark:text-slate-600'} />
                  </div>
                  <span className={`text-[9px] font-medium whitespace-nowrap ${done ? cfg.color : 'text-slate-400'}`}>{cfg.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${i < stepIdx ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Events list */}
      <div className="relative space-y-0">
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
        {events.map((ev, i) => (
          <div key={i} className="flex gap-3 pb-4 last:pb-0">
            <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              i === 0 ? `${STATUS_CFG[status]?.bg || 'bg-slate-100'} ring-2 ring-white dark:ring-slate-800` : 'bg-slate-100 dark:bg-slate-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${i === 0 ? STATUS_CFG[status]?.dot || 'bg-slate-400' : 'bg-slate-300 dark:bg-slate-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${i === 0 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                {ev.description}
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                {ev.location && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    <MapPin size={9} /> {ev.location}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Clock size={9} /> {fmtDateTime(ev.eventDate)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({
  shipment, onClose, onRefresh, onEdit, onDelete,
}: {
  shipment: Shipment;
  onClose: () => void;
  onRefresh: (id: string) => void;
  onEdit: (s: Shipment) => void;
  onDelete: (id: string) => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const cc = CARRIER_CFG[shipment.carrier] || CARRIER_CFG.CUSTOM;

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh(shipment.id);
    setRefreshing(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(shipment.trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CarrierBadge carrier={shipment.carrier} />
            <StatusBadge status={shipment.status} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-2">{shipment.leadName || 'Sem nome'}</h3>
          {shipment.product && <p className="text-xs text-slate-500 dark:text-slate-400">{shipment.product}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>

      {/* Tracking code */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/40 border-b border-slate-200 dark:border-slate-700">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Código de Rastreio</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200 tracking-widest">{shipment.trackingCode}</span>
          <button onClick={copyCode} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-600 transition-colors">
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </button>
          {cc.trackUrl && (
            <a href={`${cc.trackUrl}${shipment.trackingCode}`} target="_blank" rel="noopener noreferrer"
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-brand-600 transition-colors" title="Ver no site da transportadora">
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-700">
        {shipment.estimatedDelivery && shipment.status !== 'DELIVERED' && (
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Previsão</p>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Calendar size={11} className="text-slate-400" /> {fmtDate(shipment.estimatedDelivery)}
            </p>
          </div>
        )}
        {shipment.deliveredAt && (
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Entregue em</p>
            <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle size={11} /> {fmtDate(shipment.deliveredAt)}
            </p>
          </div>
        )}
        {shipment.externalOrderId && (
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Pedido externo</p>
            <p className="text-xs font-mono text-slate-700 dark:text-slate-300">#{shipment.externalOrderId}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Cadastrado</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{fmtDate(shipment.createdAt)}</p>
        </div>
      </div>

      {/* Notes */}
      {shipment.notes && (
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Observações</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{shipment.notes}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 font-semibold">Histórico de Rastreio</p>
        <Timeline events={shipment.events} status={shipment.status} />
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
        <button
          onClick={handleRefresh}
          disabled={refreshing || shipment.status === 'DELIVERED' || shipment.status === 'CANCELLED'}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
        <button
          onClick={() => onEdit(shipment)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Edit3 size={12} /> Editar
        </button>
        <button
          onClick={() => onDelete(shipment.id)}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 border border-red-100 rounded-xl hover:bg-red-50 transition-colors"
        >
          <Trash2 size={12} /> Excluir
        </button>
      </div>
    </div>
  );
}

// ── Form Modal ────────────────────────────────────────────────────────────────
const EMPTY_FORM = { leadName: '', product: '', trackingCode: '', carrier: 'CORREIOS' as CarrierCode, notes: '' };

function FormModal({
  initial, onSave, onClose,
}: {
  initial?: Partial<typeof EMPTY_FORM> & { id?: string };
  onSave: (data: typeof EMPTY_FORM, id?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.id;

  const handleSave = async () => {
    if (!form.trackingCode.trim() || !form.leadName.trim()) return;
    setSaving(true);
    await onSave(form, initial?.id);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center">
              <Package size={15} className="text-indigo-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{isEdit ? 'Editar Rastreio' : 'Novo Rastreio'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Carrier select — shown as cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Transportadora</label>
            <div className="grid grid-cols-3 gap-2">
              {CARRIERS.map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, carrier: key }))}
                  className={`px-3 py-2 rounded-xl text-[11px] font-semibold border-2 transition-all ${
                    form.carrier === key
                      ? `${cfg.bg} ${cfg.color} border-current`
                      : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-300'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Código de Rastreio *</label>
            <input
              value={form.trackingCode}
              onChange={e => setForm(f => ({ ...f, trackingCode: e.target.value.toUpperCase() }))}
              placeholder={form.carrier === 'CORREIOS' ? 'Ex: AA123456789BR' : 'Código da transportadora'}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-300 placeholder:font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Nome do Cliente *</label>
            <input
              value={form.leadName}
              onChange={e => setForm(f => ({ ...f, leadName: e.target.value }))}
              placeholder="Ex: João Silva"
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Produto</label>
            <input
              value={form.product}
              onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
              placeholder="Ex: Tênis Nike Air Max"
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Observações</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Informações adicionais sobre o pedido..."
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.trackingCode.trim() || !form.leadName.trim()}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving && <RefreshCw size={12} className="animate-spin" />}
            {isEdit ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Webhook tab ───────────────────────────────────────────────────────────────
function WebhookTab() {
  const [copied, setCopied] = useState<string | null>(null);
  const backendUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
  const webhookUrl = `${backendUrl}/webhooks/tracking`;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const payload = JSON.stringify({
    apiKey: 'SUA_API_KEY',
    orderId: '12345',
    customerName: 'João Silva',
    product: 'Tênis Nike Air Max',
    trackingCode: 'AA123456789BR',
    carrier: 'CORREIOS',
    notes: 'Pedido urgente',
  }, null, 2);

  const shopifyScript = `// Shopify — webhook de pedido enviado
fetch('${webhookUrl}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    apiKey: process.env.XPAY_API_KEY,
    orderId: order.id,
    customerName: order.customer.name,
    product: order.line_items[0].title,
    trackingCode: fulfillment.tracking_number,
    carrier: 'CORREIOS',
  })
});`;

  const wooScript = `// WooCommerce — functions.php
add_action('woocommerce_order_status_changed', function($order_id, $old, $new) {
  if ($new !== 'completed') return;
  $order = wc_get_order($order_id);
  $tracking = get_post_meta($order_id, '_tracking_number', true);
  wp_remote_post('${webhookUrl}', [
    'body' => json_encode([
      'apiKey'       => '${'{'}YOUR_API_KEY{'}'}',
      'orderId'      => $order_id,
      'customerName' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
      'product'      => $order->get_items()[0]->get_name(),
      'trackingCode' => $tracking,
      'carrier'      => 'CORREIOS',
    ]),
    'headers' => ['Content-Type' => 'application/json'],
  ]);
}, 10, 3);`;

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <div className="relative">
      <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs overflow-x-auto font-mono leading-relaxed">{code}</pre>
      <button
        onClick={() => copy(code, id)}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
      >
        {copied === id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      </button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* URL */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
          <Globe size={15} className="text-indigo-500" /> URL do Webhook
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Use esta URL para enviar pedidos de qualquer plataforma externa automaticamente.
        </p>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-xl px-4 py-3">
          <code className="flex-1 text-sm font-mono text-indigo-600 dark:text-indigo-400">{webhookUrl}</code>
          <button onClick={() => copy(webhookUrl, 'url')} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 transition-colors">
            {copied === 'url' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </button>
        </div>
        <div className="mt-3 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <Info size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Autenticação via <strong>x-api-key</strong> no header ou campo <strong>apiKey</strong> no body. Gere sua chave em <strong>Configurações → Chaves API</strong>.
          </p>
        </div>
      </div>

      {/* Payload */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">Formato do Body (JSON)</h3>
        <CodeBlock code={payload} id="payload" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { field: 'apiKey', type: 'string', req: true, desc: 'Sua chave de API' },
            { field: 'orderId', type: 'string', req: false, desc: 'ID do pedido (evita duplicatas)' },
            { field: 'customerName', type: 'string', req: false, desc: 'Nome do destinatário' },
            { field: 'product', type: 'string', req: false, desc: 'Nome do produto' },
            { field: 'trackingCode', type: 'string', req: true, desc: 'Código de rastreio' },
            { field: 'carrier', type: 'enum', req: false, desc: 'CORREIOS | JADLOG | LOGGI | TOTAL_EXPRESS | MELHOR_ENVIO' },
          ].map(f => (
            <div key={f.field} className="flex gap-2 text-xs">
              <code className="text-indigo-600 dark:text-indigo-400 font-mono flex-shrink-0">{f.field}</code>
              {f.req && <span className="text-red-500 text-[9px] font-bold flex-shrink-0">REQ</span>}
              <span className="text-slate-500 dark:text-slate-400">— {f.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Zap size={14} className="text-amber-500" /> Exemplos de Integração
        </h3>
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Shopify / Node.js</p>
            <CodeBlock code={shopifyScript} id="shopify" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">WooCommerce / PHP</p>
            <CodeBlock code={wooScript} id="woo" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Integrations tab ──────────────────────────────────────────────────────────
function IntegracoesTab() {
  const carriers = [
    {
      key: 'CORREIOS', name: 'Correios', color: 'text-yellow-700', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800',
      desc: 'Integração direta com a API pública dos Correios. Rastreio em tempo real para objetos nacionais e internacionais.',
      formats: ['AA000000000BR', 'SB000000000BR', 'RA000000000BR'],
      status: 'live',
    },
    {
      key: 'JADLOG', name: 'Jadlog', color: 'text-green-700', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800',
      desc: 'Uma das maiores transportadoras do Brasil. Ideal para e-commerces com alto volume.',
      formats: ['CTE: 14 dígitos'],
      status: 'simulated',
    },
    {
      key: 'LOGGI', name: 'Loggi', color: 'text-violet-700', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800',
      desc: 'Entregas expressas em capitais e grandes centros urbanos com rastreio em tempo real.',
      formats: ['LOGGI-XXXXXX'],
      status: 'simulated',
    },
    {
      key: 'TOTAL_EXPRESS', name: 'Total Express', color: 'text-orange-700', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800',
      desc: 'Cobertura nacional com foco em grande volume e regiões de difícil acesso.',
      formats: ['Código numérico'],
      status: 'simulated',
    },
    {
      key: 'MELHOR_ENVIO', name: 'Melhor Envio', color: 'text-sky-700', bg: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-sky-200 dark:border-sky-800',
      desc: 'Marketplace de frete que agrega diversas transportadoras em uma única plataforma.',
      formats: ['ME000000000'],
      status: 'simulated',
    },
    {
      key: 'CUSTOM', name: 'Personalizado', color: 'text-slate-700', bg: 'bg-slate-50 dark:bg-slate-700/40', border: 'border-slate-200 dark:border-slate-600',
      desc: 'Cadastre manualmente pedidos de qualquer transportadora. Atualize o status via webhook.',
      formats: ['Qualquer formato'],
      status: 'live',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 max-w-3xl">
      {carriers.map(c => (
        <div key={c.key} className={`rounded-2xl border p-5 ${c.bg} ${c.border}`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className={`text-sm font-bold ${c.color}`}>{c.name}</h4>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${c.status === 'live' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {c.status === 'live' ? '● Ativo' : '◐ Simulado'}
              </span>
            </div>
            <PackageSearch size={18} className={`${c.color} opacity-60`} />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{c.desc}</p>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Formato do código</p>
            <div className="flex flex-wrap gap-1">
              {c.formats.map(f => (
                <code key={f} className="text-[10px] bg-white/70 dark:bg-slate-800/50 rounded px-1.5 py-0.5 text-slate-600 dark:text-slate-300">{f}</code>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, gradient, glow, loading }: {
  label: string; value: number; icon: React.ElementType;
  gradient: string; glow: string; loading: boolean;
}) {
  return (
    <div className={`relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 overflow-hidden hover:shadow-lg ${glow} transition-all duration-300`}>
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-[0.08]`} />
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} shadow-sm mb-3`}>
        <Icon size={17} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none mb-1">
        {loading ? <span className="inline-block w-12 h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /> : value}
      </p>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
type Tab = 'pedidos' | 'webhook' | 'integracoes';

export default function Rastreio() {
  const [tab, setTab] = useState<Tab>('pedidos');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('');
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editShipment, setEditShipment] = useState<Shipment | null>(null);
  const [bulkRefreshing, setBulkRefreshing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [sh, st] = await Promise.all([
        api.get('/api/tracking'),
        api.get('/api/tracking/stats'),
      ]);
      setShipments(sh.data);
      setStats(st.data);
    } catch { /* ignore */ } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async (form: typeof EMPTY_FORM, id?: string) => {
    if (id) {
      await api.put(`/api/tracking/${id}`, form);
    } else {
      await api.post('/api/tracking', form);
    }
    setShowForm(false);
    setEditShipment(null);
    fetchAll();
  };

  const handleRefresh = async (id: string) => {
    api.post(`/api/tracking/${id}/refresh`);
    const updated = await api.get('/api/tracking');
    setShipments(updated.data);
    const refreshed = updated.data.find((s: Shipment) => s.id === id);
    if (refreshed) setSelected(refreshed);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return; }
    await api.delete(`/api/tracking/${id}`);
    setDeleteConfirm(null);
    setSelected(null);
    fetchAll();
  };

  const handleBulkRefresh = async () => {
    setBulkRefreshing(true);
    await api.post('/api/tracking/bulk-refresh');
    await fetchAll();
    setBulkRefreshing(false);
  };

  const filtered = shipments.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.trackingCode.toLowerCase().includes(q) || s.leadName.toLowerCase().includes(q) || s.product.toLowerCase().includes(q);
    const matchStatus = !statusFilter || s.status === statusFilter;
    const matchCarrier = !carrierFilter || s.carrier === carrierFilter;
    return matchSearch && matchStatus && matchCarrier;
  });

  const kpis = [
    { label: 'Total',          value: stats?.total          ?? 0, icon: Package,       gradient: 'from-indigo-500 to-violet-600', glow: 'shadow-indigo-100 dark:shadow-indigo-900/20' },
    { label: 'Em Trânsito',    value: stats?.inTransit      ?? 0, icon: Truck,         gradient: 'from-amber-400 to-orange-500',  glow: 'shadow-amber-100 dark:shadow-amber-900/20'  },
    { label: 'Saiu p/ Entrega',value: stats?.outForDelivery ?? 0, icon: ArrowRight,    gradient: 'from-orange-500 to-red-500',    glow: 'shadow-orange-100 dark:shadow-orange-900/20'},
    { label: 'Entregues',      value: stats?.delivered      ?? 0, icon: PackageCheck,  gradient: 'from-emerald-500 to-teal-600',  glow: 'shadow-emerald-100 dark:shadow-emerald-900/20'},
    { label: 'Problemas',      value: stats?.exception      ?? 0, icon: PackageX,      gradient: 'from-red-500 to-rose-600',      glow: 'shadow-red-100 dark:shadow-red-900/20'      },
    { label: 'Entregues Hoje', value: stats?.deliveredToday ?? 0, icon: CheckCircle,   gradient: 'from-teal-500 to-cyan-600',     glow: 'shadow-teal-100 dark:shadow-teal-900/20'   },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
            <Truck size={17} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">Rastreio de Pedidos</h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Correios, Jadlog, Loggi, webhooks e mais</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl p-1 mr-2">
            {([
              { id: 'pedidos' as Tab, label: 'Pedidos', icon: Package },
              { id: 'webhook' as Tab, label: 'Webhook', icon: Globe },
              { id: 'integracoes' as Tab, label: 'Integrações', icon: Zap },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tab === id ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
          {tab === 'pedidos' && (
            <>
              <button
                onClick={handleBulkRefresh}
                disabled={bulkRefreshing}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={bulkRefreshing ? 'animate-spin' : ''} />
                Atualizar Todos
              </button>
              <button
                onClick={() => { setEditShipment(null); setShowForm(true); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
              >
                <Plus size={13} /> Novo Rastreio
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'pedidos' ? (
          <>
            {/* KPIs */}
            <div className="px-6 pt-5 pb-4">
              <div className="grid grid-cols-6 gap-3">
                {kpis.map(k => <KpiCard key={k.label} {...k} loading={statsLoading} />)}
              </div>
            </div>

            {/* Filters */}
            <div className="px-6 pb-3 flex items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar código, cliente, produto..."
                  className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-xs w-64 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Todos os status</option>
                {(Object.entries(STATUS_CFG) as [ShipmentStatus, typeof STATUS_CFG[ShipmentStatus]][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <select
                value={carrierFilter}
                onChange={e => setCarrierFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Todas as transportadoras</option>
                {CARRIERS.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {(search || statusFilter || carrierFilter) && (
                <button
                  onClick={() => { setSearch(''); setStatusFilter(''); setCarrierFilter(''); }}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  <X size={12} /> Limpar
                </button>
              )}
              <span className="ml-auto text-xs text-slate-400">{filtered.length} pedido{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Table + Detail panel */}
            <div className="flex flex-1 overflow-hidden px-6 pb-6 gap-4">
              {/* Table */}
              <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <RefreshCw size={24} className="animate-spin" />
                      <p className="text-sm">Carregando rastreios...</p>
                    </div>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Package size={40} className="text-slate-300" />
                      <p className="text-sm font-medium">Nenhum rastreio encontrado</p>
                      <p className="text-xs text-slate-400">Adicione um novo ou ajuste os filtros</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700/50 z-10">
                        <tr className="border-b border-slate-100 dark:border-slate-700">
                          <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cliente / Produto</th>
                          <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Código</th>
                          <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Transportadora</th>
                          <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                          <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Previsão</th>
                          <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(s => (
                          <tr
                            key={s.id}
                            onClick={() => setSelected(sel => sel?.id === s.id ? null : s)}
                            className={`border-b border-slate-50 dark:border-slate-700/50 cursor-pointer transition-colors ${
                              selected?.id === s.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                            }`}
                          >
                            <td className="px-4 py-3">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{s.leadName || '—'}</p>
                              {s.product && <p className="text-[10px] text-slate-400 truncate max-w-[160px]">{s.product}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <code className="text-xs font-mono text-slate-600 dark:text-slate-300 tracking-wider">{s.trackingCode}</code>
                            </td>
                            <td className="px-4 py-3">
                              <CarrierBadge carrier={s.carrier} />
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={s.status} />
                            </td>
                            <td className="px-4 py-3">
                              {s.status === 'DELIVERED' ? (
                                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                                  <CheckCircle size={10} /> {s.deliveredAt ? fmtDate(s.deliveredAt) : '—'}
                                </span>
                              ) : s.estimatedDelivery ? (
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Calendar size={10} /> {fmtDate(s.estimatedDelivery)}
                                </span>
                              ) : <span className="text-[10px] text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleRefresh(s.id)}
                                  title="Atualizar rastreio"
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                  <RefreshCw size={13} />
                                </button>
                                <button
                                  onClick={() => { setEditShipment(s); setShowForm(true); }}
                                  title="Editar"
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDelete(s.id)}
                                  title={deleteConfirm === s.id ? 'Clique novamente para confirmar' : 'Excluir'}
                                  className={`p-1.5 rounded-lg transition-colors ${deleteConfirm === s.id ? 'bg-red-100 text-red-600' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500'}`}
                                >
                                  <Trash2 size={13} />
                                </button>
                                <button
                                  onClick={() => setSelected(sel => sel?.id === s.id ? null : s)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                  <ChevronRight size={13} className={selected?.id === s.id ? 'rotate-180' : ''} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Detail panel */}
              {selected && (
                <div className="w-80 flex-shrink-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                  <DetailPanel
                    shipment={selected}
                    onClose={() => setSelected(null)}
                    onRefresh={handleRefresh}
                    onEdit={s => { setEditShipment(s); setShowForm(true); }}
                    onDelete={handleDelete}
                  />
                </div>
              )}
            </div>
          </>
        ) : tab === 'webhook' ? (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <WebhookTab />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <IntegracoesTab />
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <FormModal
          initial={editShipment ? {
            id: editShipment.id,
            leadName: editShipment.leadName,
            product: editShipment.product,
            trackingCode: editShipment.trackingCode,
            carrier: editShipment.carrier,
            notes: editShipment.notes || '',
          } : undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditShipment(null); }}
        />
      )}
    </div>
  );
}
