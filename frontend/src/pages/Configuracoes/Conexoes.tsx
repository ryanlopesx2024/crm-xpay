import { useEffect, useState, useRef } from 'react';
import {
  Plus, Wifi, WifiOff, Loader2, X, ChevronRight,
  RefreshCw, Power, Trash2, Settings, MessageCircle,
  Instagram, Facebook, ExternalLink, AlertCircle, CheckCircle2,
} from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

// ── types ─────────────────────────────────────────────────────────────────────
interface ChannelConfig {
  // Evolution API
  evolutionUrl?: string;
  evolutionKey?: string;
  instanceName?: string;
  // WhatsApp Cloud API (Meta oficial)
  phoneNumberId?: string;
  accessToken?: string;
  verifyToken?: string;
  wabaId?: string;
  // Intervalos
  msgInterval?: number;
  reconnectInterval?: number;
  // Configurações
  rejectCalls?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
}

interface Channel {
  id: string;
  name: string;
  type: string;
  identifier: string;
  status: string;
  config: string;
  createdAt: string;
}

// ── connection type definitions ───────────────────────────────────────────────
type ChannelPlatform = 'whatsapp' | 'instagram' | 'messenger';
type WhatsappSubtype = 'WHATSAPP_CLOUD' | 'WHATSAPP_CLOUD_MANUAL' | 'WHATSAPP_ZAPI' | 'WHATSAPP_EVOLUTION' | 'WHATSAPP_BAILEYS';

const PLATFORM_ICONS: Record<ChannelPlatform, { icon: React.ElementType; color: string; bg: string }> = {
  whatsapp:  { icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  instagram: { icon: Instagram,     color: 'text-pink-600',    bg: 'bg-pink-50 dark:bg-pink-900/20'       },
  messenger: { icon: Facebook,      color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20'       },
};

const WHATSAPP_SUBTYPES: { id: WhatsappSubtype; label: string; desc: string }[] = [
  { id: 'WHATSAPP_BAILEYS',      label: 'Conexão Direta (QR)',   desc: 'Conecte seu WhatsApp escaneando um QR code. Sem servidor externo.' },
  { id: 'WHATSAPP_CLOUD',        label: 'Whatsapp Cloud',        desc: 'Crie uma nova conexão com a API do Whatsapp Cloud utilizando login com facebook.' },
  { id: 'WHATSAPP_CLOUD_MANUAL', label: 'Whatsapp Cloud (Manual)',desc: 'Crie uma nova conexão com a API do Whatsapp Cloud utilizando cadastro manual.' },
  { id: 'WHATSAPP_ZAPI',         label: 'Z-API',                 desc: 'Crie uma nova conexão com a API do Z-API' },
  { id: 'WHATSAPP_EVOLUTION',    label: 'Evolution API',         desc: 'Crie uma nova conexão com a API do Evolution.' },
];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string; icon: React.ElementType }> = {
  CONNECTED:    { label: 'Conectado',    color: 'text-emerald-700', bg: 'bg-emerald-100 dark:bg-emerald-900/30', dot: 'bg-emerald-500', icon: CheckCircle2 },
  CONNECTING:   { label: 'Conectando',   color: 'text-amber-700',   bg: 'bg-amber-100 dark:bg-amber-900/30',     dot: 'bg-amber-400',   icon: Loader2      },
  DISCONNECTED: { label: 'Desconectado', color: 'text-slate-600',   bg: 'bg-slate-100 dark:bg-slate-700',        dot: 'bg-slate-400',   icon: WifiOff      },
  PAUSED:       { label: 'Pausado',      color: 'text-violet-700',  bg: 'bg-violet-100 dark:bg-violet-900/30',   dot: 'bg-violet-400',  icon: Power        },
};

// ── default config ────────────────────────────────────────────────────────────
const DEFAULT_CFG: ChannelConfig = {
  evolutionUrl: '',
  evolutionKey: '',
  instanceName: '',
  msgInterval: 20,
  reconnectInterval: 10,
  rejectCalls: false,
  msgCall: 'Não consigo atender ligações pelo WhatsApp.',
  groupsIgnore: true,
  alwaysOnline: false,
  readMessages: false,
  readStatus: false,
  syncFullHistory: false,
};

// ── helpers ───────────────────────────────────────────────────────────────────
function parseConfig(raw: string): ChannelConfig {
  try { return { ...DEFAULT_CFG, ...JSON.parse(raw) }; } catch { return { ...DEFAULT_CFG }; }
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-600'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

// ── QR Code Modal ─────────────────────────────────────────────────────────────
function QRModal({ channel, onClose, onConnected }: {
  channel: Channel;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [qr, setQr] = useState('');
  const [status, setStatus] = useState('CONNECTING');
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQR = async () => {
    try {
      const { data } = await api.get(`/api/channels/${channel.id}/qrcode`);
      if (data.qrcode) setQr(data.qrcode);
    } catch { /* ignore */ }
  };

  const pollStatus = async () => {
    try {
      const { data } = await api.get(`/api/channels/${channel.id}/status`);
      setStatus(data.status);
      if (data.status === 'CONNECTED') {
        if (pollRef.current) clearInterval(pollRef.current);
        if (qrRef.current) clearInterval(qrRef.current);
        onConnected();
      } else if (data.status === 'DISCONNECTED') {
        if (pollRef.current) clearInterval(pollRef.current);
        if (qrRef.current) clearInterval(qrRef.current);
        setError('Não foi possível conectar ao WhatsApp. Clique em fechar e tente novamente.');
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    // Start connection
    api.post(`/api/channels/${channel.id}/connect`)
      .then(({ data }) => { if (data.qrcode) setQr(data.qrcode); })
      .catch(err => setError(err?.response?.data?.error || 'Erro ao conectar'));

    // Poll status every 3s
    pollRef.current = setInterval(pollStatus, 3000);
    // Poll QR every 3s (Baileys may take a moment to generate it)
    qrRef.current = setInterval(fetchQR, 3000);

    // Listen for real-time QR via Socket.IO (instant update)
    const socket = getSocket();
    const onQR = (data: { channelId: string; qr: string }) => {
      if (data.channelId === channel.id) setQr(data.qr);
    };
    const onStatus = (data: { channelId: string; status: string }) => {
      if (data.channelId === channel.id) {
        setStatus(data.status);
        if (data.status === 'CONNECTED') {
          if (pollRef.current) clearInterval(pollRef.current);
          if (qrRef.current) clearInterval(qrRef.current);
          onConnected();
        } else if (data.status === 'DISCONNECTED') {
          if (pollRef.current) clearInterval(pollRef.current);
          if (qrRef.current) clearInterval(qrRef.current);
          setError('Não foi possível conectar ao WhatsApp. Feche e tente novamente.');
        }
      }
    };
    socket.on('channel_qr', onQR);
    socket.on('channel_status_updated', onStatus);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (qrRef.current) clearInterval(qrRef.current);
      socket.off('channel_qr', onQR);
      socket.off('channel_status_updated', onStatus);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Conectar WhatsApp</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{channel.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X size={15} className="text-slate-400" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          {error ? (
            <div className="w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
              <AlertCircle size={24} className="text-red-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
              <p className="text-xs text-red-500 mt-1">Verifique a URL e a chave da API</p>
            </div>
          ) : (
            <>
              {/* QR */}
              <div className="w-52 h-52 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-600 overflow-hidden">
                {qr ? (
                  <img src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`} alt="QR Code" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Loader2 size={28} className="animate-spin" />
                    <p className="text-xs">Gerando QR code...</p>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_CFG[status]?.bg || 'bg-slate-100'} ${STATUS_CFG[status]?.color || 'text-slate-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[status]?.dot || 'bg-slate-400'}`} />
                {STATUS_CFG[status]?.label || status}
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">1. Abra o WhatsApp no celular</p>
                <p className="text-xs text-slate-500 dark:text-slate-500">2. Toque em <strong>Dispositivos vinculados</strong></p>
                <p className="text-xs text-slate-500 dark:text-slate-500">3. Aponte a câmera para o QR code</p>
              </div>

              <button onClick={fetchQR} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                <RefreshCw size={11} /> Atualizar QR
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create Modal ──────────────────────────────────────────────────────────────
type CreateStep = 'platform' | 'subtype' | 'form';
type FormTab = 'auth' | 'intervals' | 'settings';

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (ch: Channel) => void }) {
  const [step, setStep] = useState<CreateStep>('platform');
  const [platform, setPlatform] = useState<ChannelPlatform>('whatsapp');
  const [subtype, setSubtype] = useState<WhatsappSubtype>('WHATSAPP_EVOLUTION');
  const [formTab, setFormTab] = useState<FormTab>('auth');
  const [name, setName] = useState('');
  const [cfg, setCfg] = useState<ChannelConfig>({ ...DEFAULT_CFG });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const updateCfg = (patch: Partial<ChannelConfig>) => setCfg(c => ({ ...c, ...patch }));

  const isCloud = subtype === 'WHATSAPP_CLOUD' || subtype === 'WHATSAPP_CLOUD_MANUAL';
  const isBaileys = subtype === 'WHATSAPP_BAILEYS';

  const handleCreate = async () => {
    if (!name.trim()) { setErr('Nome da conexão é obrigatório'); return; }
    if (subtype === 'WHATSAPP_EVOLUTION') {
      if (!cfg.evolutionUrl?.trim()) { setErr('URL da instância é obrigatória'); setFormTab('auth'); return; }
      if (!cfg.evolutionKey?.trim()) { setErr('Chave de API é obrigatória'); setFormTab('auth'); return; }
      if (!cfg.instanceName?.trim()) { setErr('Nome da instância é obrigatório'); setFormTab('auth'); return; }
    }
    if (isCloud) {
      if (!cfg.phoneNumberId?.trim()) { setErr('Phone Number ID é obrigatório'); setFormTab('auth'); return; }
      if (!cfg.accessToken?.trim()) { setErr('Access Token é obrigatório'); setFormTab('auth'); return; }
      if (!cfg.verifyToken?.trim()) { setErr('Verify Token é obrigatório'); setFormTab('auth'); return; }
    }
    setSaving(true);
    setErr('');
    try {
      const identifier = isBaileys
        ? name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 30) || `baileys-${Date.now()}`
        : isCloud ? (cfg.phoneNumberId || name) : (cfg.instanceName || name);
      const { data } = await api.post('/api/channels', {
        name,
        type: subtype,
        identifier,
        status: 'DISCONNECTED',
        config: isBaileys ? '{}' : JSON.stringify(cfg),
      });
      onCreated(data);
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Erro ao criar conexão');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {step === 'platform' ? 'Nova Conexão' : step === 'subtype' ? 'WhatsApp' : 'Cadastrar conexão'}
            </h3>
            {step === 'subtype' && <p className="text-[11px] text-slate-400 mt-0.5">Crie conexões com a plataforma Whatsapp</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X size={15} className="text-slate-400" />
          </button>
        </div>

        {/* Step: choose platform */}
        {step === 'platform' && (
          <div className="flex divide-x divide-slate-100 dark:divide-slate-700">
            <div className="w-44 py-2">
              {(Object.entries(PLATFORM_ICONS) as [ChannelPlatform, typeof PLATFORM_ICONS[ChannelPlatform]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => { setPlatform(key); setStep('subtype'); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                    platform === key
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <val.icon size={15} className={platform === key ? val.color : ''} />
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex-1 p-4 text-xs text-slate-400 flex items-center justify-center">
              Selecione uma plataforma
            </div>
          </div>
        )}

        {/* Step: choose whatsapp subtype */}
        {step === 'subtype' && (
          <div className="flex divide-x divide-slate-100 dark:divide-slate-700 min-h-[240px]">
            <div className="w-44 py-2">
              {(Object.entries(PLATFORM_ICONS) as [ChannelPlatform, typeof PLATFORM_ICONS[ChannelPlatform]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setPlatform(key)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                    platform === key
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <val.icon size={15} className={platform === key ? val.color : ''} />
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex-1 py-2">
              {platform === 'whatsapp' && WHATSAPP_SUBTYPES.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSubtype(s.id); setStep('form'); }}
                  className="w-full px-5 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                >
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{s.label}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{s.desc}</p>
                </button>
              ))}
              {platform !== 'whatsapp' && (
                <div className="flex items-center justify-center h-full text-xs text-slate-400 p-6">Em breve</div>
              )}
            </div>
          </div>
        )}

        {/* Step: form */}
        {step === 'form' && (
          <div>
            {/* Connection name */}
            <div className="px-5 pt-5 pb-3">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nome da conexão"
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* Baileys: simplified – just show info, no tabs */}
            {isBaileys && (
              <div className="px-5 pb-5">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  <p className="font-semibold mb-1.5 text-sm">Conexão Direta via QR Code</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Sem necessidade de servidor externo</li>
                    <li>Após criar, um QR code será exibido</li>
                    <li>Escaneie com o WhatsApp do celular</li>
                    <li>A sessão é salva automaticamente</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tabs (only for non-Baileys) */}
            {!isBaileys && <div className="flex border-b border-slate-200 dark:border-slate-700 px-5">
              {([
                { id: 'auth' as FormTab, label: 'Autenticação' },
                { id: 'intervals' as FormTab, label: 'Intervalos' },
                { id: 'settings' as FormTab, label: 'Configurações' },
              ]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setFormTab(t.id)}
                  className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                    formTab === t.id
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>}

            {!isBaileys && <div className="px-5 py-4 space-y-3 min-h-[200px]">
              {/* Autenticação — Cloud API */}
              {formTab === 'auth' && isCloud && (
                <>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                    <p className="font-semibold mb-1">Como obter as credenciais:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Acesse <strong>developers.facebook.com</strong> → seu app → WhatsApp → API Setup</li>
                      <li>Copie o <strong>Phone Number ID</strong> e o <strong>Temporary/Permanent Access Token</strong></li>
                      <li>Configure o webhook da Meta com a URL abaixo e o Verify Token que você definir</li>
                    </ol>
                    <p className="mt-2 font-mono bg-blue-100 dark:bg-blue-900/40 rounded px-2 py-1 text-[10px] break-all">
                      {window.location.origin.replace('5173', '3001')}/webhooks/whatsapp
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Phone Number ID</label>
                    <input
                      value={cfg.phoneNumberId || ''}
                      onChange={e => updateCfg({ phoneNumberId: e.target.value })}
                      placeholder="Ex: 123456789012345"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Access Token (permanente)</label>
                    <input
                      type="password"
                      value={cfg.accessToken || ''}
                      onChange={e => updateCfg({ accessToken: e.target.value })}
                      placeholder="EAAxxxx..."
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      Verify Token
                      <span className="ml-1.5 text-[9px] font-normal text-slate-400">Token que você vai colocar na Meta ao configurar o webhook</span>
                    </label>
                    <input
                      value={cfg.verifyToken || ''}
                      onChange={e => updateCfg({ verifyToken: e.target.value })}
                      placeholder="Ex: meu-token-secreto"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">WABA ID <span className="font-normal text-slate-400">(opcional)</span></label>
                    <input
                      value={cfg.wabaId || ''}
                      onChange={e => updateCfg({ wabaId: e.target.value })}
                      placeholder="WhatsApp Business Account ID"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                </>
              )}

              {/* Autenticação — Evolution API */}
              {formTab === 'auth' && !isCloud && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">URL da instância</label>
                    <input
                      value={cfg.evolutionUrl || ''}
                      onChange={e => updateCfg({ evolutionUrl: e.target.value })}
                      placeholder="Ex: http://localhost:8080"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Nome da instância</label>
                    <input
                      value={cfg.instanceName || ''}
                      onChange={e => updateCfg({ instanceName: e.target.value })}
                      placeholder="Ex: minha-instancia"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Identificador único da instância no Evolution API</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      Chave de API
                      <span className="ml-1.5 text-[9px] text-slate-400 font-normal">Acesse o Evolution Manager para obter a Chave de API</span>
                    </label>
                    <input
                      type="password"
                      value={cfg.evolutionKey || ''}
                      onChange={e => updateCfg({ evolutionKey: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                </>
              )}

              {/* Intervalos */}
              {formTab === 'intervals' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Intervalo entre mensagens (segundos)</label>
                    <input
                      type="number" min={1} max={60}
                      value={cfg.msgInterval ?? 20}
                      onChange={e => updateCfg({ msgInterval: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Delay entre envios para evitar bloqueio. Recomendado: 20s</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Intervalo de reconexão (segundos)</label>
                    <input
                      type="number" min={5} max={120}
                      value={cfg.reconnectInterval ?? 10}
                      onChange={e => updateCfg({ reconnectInterval: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                </>
              )}

              {/* Configurações */}
              {formTab === 'settings' && (
                <div className="space-y-3">
                  {([
                    { key: 'rejectCalls',    label: 'Rejeitar ligações',             desc: 'Recusa chamadas recebidas automaticamente' },
                    { key: 'groupsIgnore',   label: 'Ignorar mensagens de grupos',   desc: 'Não processar mensagens de grupos do WhatsApp' },
                    { key: 'alwaysOnline',   label: 'Sempre online',                 desc: 'Manter status online mesmo sem atividade' },
                    { key: 'readMessages',   label: 'Confirmar leitura automática',  desc: 'Marcar mensagens como lidas automaticamente' },
                    { key: 'readStatus',     label: 'Confirmar leitura de status',   desc: 'Marcar visualizações de status' },
                    { key: 'syncFullHistory',label: 'Sincronizar histórico completo',desc: 'Baixar todo o histórico de mensagens ao conectar' },
                  ] as { key: keyof ChannelConfig; label: string; desc: string }[]).map(opt => (
                    <div key={opt.key} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{opt.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                      </div>
                      <Toggle
                        checked={!!cfg[opt.key]}
                        onChange={v => updateCfg({ [opt.key]: v })}
                      />
                    </div>
                  ))}
                  {cfg.rejectCalls && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Mensagem ao rejeitar ligação</label>
                      <input
                        value={cfg.msgCall || ''}
                        onChange={e => updateCfg({ msgCall: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="Mensagem enviada ao rejeitar"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>}

            {/* Error */}
            {err && (
              <div className="mx-5 mb-3 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
                <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400">{err}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            Ao continuar, você concorda com nossos <a href="#" className="text-emerald-600 underline">Termos de Uso</a>
          </p>
          <div className="flex gap-2">
            {step !== 'platform' && (
              <button
                onClick={() => setStep(step === 'form' ? 'subtype' : 'platform')}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Voltar
              </button>
            )}
            {step === 'form' && (
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                Finalizar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Channel Card ──────────────────────────────────────────────────────────────
function ChannelCard({
  channel, onConnect, onDisconnect, onDelete, onToggle,
}: {
  channel: Channel;
  onConnect: () => void;
  onDisconnect: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const st = STATUS_CFG[channel.status] || STATUS_CFG.DISCONNECTED;
  const isConnected = channel.status === 'CONNECTED';
  const isPaused = channel.status === 'PAUSED';
  const isCloudType = channel.type === 'WHATSAPP_CLOUD' || channel.type === 'WHATSAPP_CLOUD_MANUAL';
  const cfg = parseConfig(channel.config);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookMsg, setWebhookMsg] = useState('');

  const handleSetWebhook = async () => {
    setWebhookLoading(true);
    setWebhookMsg('');
    try {
      await api.post(`/api/channels/${channel.id}/set-webhook`, {});
      setWebhookMsg('✓ Webhook registrado!');
    } catch (e: any) {
      setWebhookMsg('✗ ' + (e?.response?.data?.error || 'Erro'));
    } finally {
      setWebhookLoading(false);
      setTimeout(() => setWebhookMsg(''), 4000);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
            <MessageCircle size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{channel.name}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {channel.type === 'WHATSAPP_EVOLUTION' ? 'Evolution API'   :
               channel.type === 'WHATSAPP_CLOUD'     ? 'WhatsApp Cloud'  :
               channel.type === 'WHATSAPP_ZAPI'      ? 'Z-API'           :
               channel.type === 'WHATSAPP_BAILEYS'   ? 'Conexão Direta'  : channel.type}
            </p>
          </div>
        </div>
        {/* Status dot */}
        <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${st.bg} ${st.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot} ${channel.status === 'CONNECTING' ? 'animate-pulse' : ''}`} />
          {st.label}
        </span>
      </div>

      {/* Info */}
      <div className="space-y-1 mb-4">
        <p className="text-[10px] text-slate-400">
          <span className="font-medium text-slate-500">
            {isCloudType ? 'Phone ID:' : 'Instância:'}
          </span> {channel.identifier}
        </p>
        {cfg.evolutionUrl && (
          <p className="text-[10px] text-slate-400 truncate">
            <span className="font-medium text-slate-500">URL:</span> {cfg.evolutionUrl}
          </p>
        )}
        {isCloudType && cfg.verifyToken && (
          <p className="text-[10px] text-slate-400">
            <span className="font-medium text-slate-500">Verify Token:</span> {cfg.verifyToken}
          </p>
        )}
        {(isConnected || isPaused) && (
          <a href="https://web.whatsapp.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:underline">
            whatsapp.com <ExternalLink size={9} />
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
        {/* Cloud API: botão Verificar em vez de QR */}
        {isCloudType && !isConnected && (
          <button
            onClick={onConnect}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <CheckCircle2 size={11} /> Verificar
          </button>
        )}
        {/* Evolution API: botão Conectar (abre QR) */}
        {!isCloudType && !isConnected && !isPaused && (
          <button
            onClick={onConnect}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <Wifi size={11} /> Conectar
          </button>
        )}
        {(isConnected || isPaused) && (
          <button
            onClick={onDisconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <WifiOff size={11} /> Desconectar
          </button>
        )}
        {channel.type === 'WHATSAPP_EVOLUTION' && (
          <button
            onClick={handleSetWebhook}
            disabled={webhookLoading}
            title="Configurar URL do webhook na Evolution"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {webhookLoading ? <Loader2 size={11} className="animate-spin" /> : <Settings size={11} />}
            Webhook
          </button>
        )}
        {/* Toggle switch */}
        <div className="ml-auto">
          <Toggle checked={isConnected} onChange={onToggle} />
        </div>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
      {webhookMsg && (
        <p className={`text-[10px] mt-2 font-medium ${webhookMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>
          {webhookMsg}
        </p>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function Conexoes() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [qrChannel, setQrChannel] = useState<Channel | null>(null);
  const [search, setSearch] = useState('');

  const fetchChannels = async () => {
    try {
      const { data } = await api.get('/api/config/channels');
      setChannels(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchChannels(); }, []);

  const [verifyMsg, setVerifyMsg] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  const handleCreated = (ch: Channel) => {
    setChannels(prev => [...prev, ch]);
    setShowCreate(false);
    if (ch.type === 'WHATSAPP_EVOLUTION' || ch.type === 'WHATSAPP_BAILEYS') {
      setQrChannel(ch);
    }
  };

  const handleConnect = async (ch: Channel) => {
    const isCloud = ch.type === 'WHATSAPP_CLOUD' || ch.type === 'WHATSAPP_CLOUD_MANUAL';
    if (isCloud) {
      // Verifica credenciais na API da Meta
      try {
        const { data } = await api.post(`/api/channels/${ch.id}/verify`);
        setChannels(prev => prev.map(c => c.id === ch.id ? { ...c, status: 'CONNECTED' } : c));
        setVerifyMsg({ id: ch.id, msg: `✓ Conectado! Número: ${data.phone || ch.identifier}`, ok: true });
      } catch (e: any) {
        setVerifyMsg({ id: ch.id, msg: `✗ ${e?.response?.data?.error || 'Credenciais inválidas'}`, ok: false });
      }
      setTimeout(() => setVerifyMsg(null), 5000);
    } else {
      setQrChannel(ch);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await api.post(`/api/channels/${id}/disconnect`);
      setChannels(prev => prev.map(c => c.id === id ? { ...c, status: 'DISCONNECTED' } : c));
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir essa conexão?')) return;
    try {
      await api.delete(`/api/channels/${id}`);
      setChannels(prev => prev.filter(c => c.id !== id));
    } catch { /* ignore */ }
  };

  const handleToggle = async (id: string) => {
    try {
      const { data } = await api.patch(`/api/channels/${id}/toggle`);
      setChannels(prev => prev.map(c => c.id === id ? { ...c, status: data.status } : c));
    } catch { /* ignore */ }
  };

  const handleConnected = (id: string) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, status: 'CONNECTED' } : c));
    setQrChannel(null);
  };

  const filtered = channels.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.identifier.toLowerCase().includes(search.toLowerCase())
  );

  const connectedCount = channels.filter(c => c.status === 'CONNECTED').length;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Conexões</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gerencie suas conexões de comunicação
            {connectedCount > 0 && (
              <span className="ml-2 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                {connectedCount} conectado{connectedCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
        >
          <Plus size={15} /> Criar
        </button>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-xs">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          {search && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 h-44 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Wifi size={40} className="mb-3 text-slate-300" />
          <p className="text-sm font-medium">Nenhuma conexão encontrada</p>
          <p className="text-xs mt-1">Clique em <strong>Criar</strong> para adicionar sua primeira conexão</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(ch => (
            <div key={ch.id}>
              <ChannelCard
                channel={ch}
                onConnect={() => handleConnect(ch)}
                onDisconnect={() => handleDisconnect(ch.id)}
                onDelete={() => handleDelete(ch.id)}
                onToggle={() => handleToggle(ch.id)}
              />
              {verifyMsg?.id === ch.id && (
                <p className={`text-[10px] mt-1 font-medium px-1 ${verifyMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                  {verifyMsg.msg}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {qrChannel && (
        <QRModal
          channel={qrChannel}
          onClose={() => setQrChannel(null)}
          onConnected={() => handleConnected(qrChannel.id)}
        />
      )}
    </div>
  );
}
