import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, Save, Settings, GitBranch, Clock, Zap, Tag, User,
  ArrowRight, Globe, Filter, MessageSquare, AlignLeft, MessageCircle,
  Mic, Paperclip, Link2, Trash2, ChevronDown, ChevronUp, Plus,
} from 'lucide-react';
import api from '../../services/api';

// ── Types ───────────────────────────────────────────────────────────────────
type ContentType = 'text' | 'user_input' | 'delay' | 'audio' | 'attachment' | 'dynamic_url' | 'buttons';

interface ContentItem {
  id: string;
  type: ContentType;
  text?: string;
  placeholder?: string;
  variable?: string;
  delay?: number;
  unit?: string;
  url?: string;
  label?: string;
  buttons?: { label: string; value: string }[];
}

const CONTENT_TYPES: { type: ContentType; icon: typeof AlignLeft; label: string; color: string; iconBg: string }[] = [
  { type: 'text',        icon: AlignLeft,      label: 'Mensagem de texto',     color: 'text-blue-600',    iconBg: 'bg-blue-100'    },
  { type: 'user_input',  icon: MessageCircle,  label: 'Entrada do usuário',    color: 'text-violet-600',  iconBg: 'bg-violet-100'  },
  { type: 'delay',       icon: Clock,          label: 'Atraso de tempo',       color: 'text-amber-600',   iconBg: 'bg-amber-100'   },
  { type: 'audio',       icon: Mic,            label: 'Mensagem de áudio',     color: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  { type: 'attachment',  icon: Paperclip,      label: 'Arquivo anexo',         color: 'text-slate-600',   iconBg: 'bg-slate-100'   },
  { type: 'dynamic_url', icon: Link2,          label: 'Arquivo URL Dinâmica',  color: 'text-indigo-600',  iconBg: 'bg-indigo-100'  },
];

const VARIABLES = [
  { label: 'Nome',     value: '{nome}' },
  { label: 'Telefone', value: '{telefone}' },
  { label: 'E-mail',   value: '{email}' },
  { label: 'Empresa',  value: '{empresa}' },
];

const ACTION_META: Record<string, { icon: typeof MessageSquare; title: string; subtitle: string; iconColor: string; iconBg: string }> = {
  SEND_MESSAGE:  { icon: MessageSquare, title: 'Mensagens',       subtitle: 'Envie mensagens pelo WhatsApp', iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  ADD_TAG:       { icon: Tag,           title: 'Adicionar Tag',   subtitle: 'Aplica uma tag ao lead',       iconColor: 'text-blue-600',    iconBg: 'bg-blue-100'    },
  REMOVE_TAG:    { icon: Tag,           title: 'Remover Tag',     subtitle: 'Remove uma tag do lead',       iconColor: 'text-red-600',     iconBg: 'bg-red-100'     },
  ASSIGN_AGENT:  { icon: User,          title: 'Atribuir',        subtitle: 'Atribui o lead a um atendente',iconColor: 'text-violet-600',  iconBg: 'bg-violet-100'  },
  MOVE_PIPELINE: { icon: ArrowRight,    title: 'Mover Pipeline',  subtitle: 'Move o lead para outra etapa', iconColor: 'text-indigo-600',  iconBg: 'bg-indigo-100'  },
  HTTP_REQUEST:  { icon: Globe,         title: 'Webhook HTTP',    subtitle: 'Envia dados para URL externa', iconColor: 'text-amber-600',   iconBg: 'bg-amber-100'   },
  FILTER_LEADS:  { icon: Filter,        title: 'Filtrar Leads',   subtitle: 'Filtra leads por critérios',   iconColor: 'text-slate-600',   iconBg: 'bg-slate-100'   },
};
const TYPE_META: Record<string, { icon: typeof MessageSquare; title: string; subtitle: string; iconColor: string; iconBg: string }> = {
  trigger:   { icon: Zap,       title: 'Gatilho',  subtitle: 'Inicia a automação',            iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  condition: { icon: GitBranch, title: 'Condição', subtitle: 'Ramifica o fluxo com Se/Então', iconColor: 'text-amber-600',   iconBg: 'bg-amber-100'   },
  delay:     { icon: Clock,     title: 'Aguardar', subtitle: 'Pausa o fluxo por um tempo',    iconColor: 'text-slate-600',   iconBg: 'bg-slate-100'   },
};

const fieldClass = 'w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all';
const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5';

function MessagePreview({ text }: { text: string }) {
  const parts = text.split(/(\{[^}]+\})/g);
  return (
    <div className="text-sm text-slate-700 leading-relaxed break-words whitespace-pre-wrap">
      {parts.map((part, i) =>
        /^\{[^}]+\}$/.test(part) ? (
          <span key={i} className="inline-block bg-blue-100 text-blue-600 rounded-md px-1.5 py-0.5 text-[11px] font-semibold mx-0.5 align-middle">
            {part.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  );
}

function ContentItemCard({ item, onChange, onDelete }: {
  item: ContentItem; onChange: (u: ContentItem) => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cfg = CONTENT_TYPES.find((c) => c.type === item.type)!;
  const Icon = cfg.icon;

  const insertVar = (v: string) => {
    const ta = textareaRef.current;
    if (!ta) { onChange({ ...item, text: (item.text || '') + v }); return; }
    const s = ta.selectionStart, e = ta.selectionEnd;
    const next = (item.text || '').slice(0, s) + v + (item.text || '').slice(e);
    onChange({ ...item, text: next });
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + v.length, s + v.length); }, 0);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-800">
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-100 dark:border-slate-700">
        <div className={`w-7 h-7 ${cfg.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon size={13} className={cfg.color} />
        </div>
        <span className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200">{cfg.label}</span>
        <button onClick={() => setExpanded((v) => !v)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
          {expanded ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
        </button>
        <button onClick={onDelete} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
          <Trash2 size={13} className="text-red-400" />
        </button>
      </div>
      {expanded && (
        <div className="px-3 py-3 space-y-2.5">
          {item.type === 'text' && (
            <>
              {!!item.text && (
                <div className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5 mb-2">
                  <MessagePreview text={item.text} />
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={item.text || ''}
                onChange={(e) => onChange({ ...item, text: e.target.value })}
                className={`${fieldClass} resize-none`}
                rows={4}
                placeholder="Digite a mensagem... Use {variável} para personalizar"
              />
              <div className="flex flex-wrap gap-1">
                {VARIABLES.map((v) => (
                  <button key={v.value} onClick={() => insertVar(v.value)}
                    className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-[10px] font-medium rounded-lg hover:bg-blue-100">
                    {v.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {item.type === 'user_input' && (
            <>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 mb-1">Pergunta / Instrução</p>
                <input type="text" value={item.placeholder || ''} onChange={(e) => onChange({ ...item, placeholder: e.target.value })} className={fieldClass} placeholder="Ex: Qual é o seu nome?" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 mb-1">Salvar resposta em variável</p>
                <input type="text" value={item.variable || ''} onChange={(e) => onChange({ ...item, variable: e.target.value })} className={fieldClass} placeholder="Ex: nome_resposta" />
              </div>
            </>
          )}
          {item.type === 'delay' && (
            <div className="flex gap-2">
              <input type="number" min={1} value={item.delay || 1} onChange={(e) => onChange({ ...item, delay: parseInt(e.target.value) })} className={`${fieldClass} w-24`} />
              <select value={item.unit || 'SECONDS'} onChange={(e) => onChange({ ...item, unit: e.target.value })} className={`${fieldClass} flex-1`}>
                <option value="SECONDS">Segundos</option>
                <option value="MINUTES">Minutos</option>
                <option value="HOURS">Horas</option>
              </select>
            </div>
          )}
          {(item.type === 'audio' || item.type === 'attachment' || item.type === 'dynamic_url') && (
            <>
              <input type="text" value={item.url || ''} onChange={(e) => onChange({ ...item, url: e.target.value })} className={fieldClass}
                placeholder={item.type === 'audio' ? 'URL do áudio (mp3, ogg...)' : item.type === 'attachment' ? 'URL do arquivo' : 'URL dinâmica'} />
              {item.type === 'dynamic_url' && (
                <input type="text" value={item.label || ''} onChange={(e) => onChange({ ...item, label: e.target.value })} className={fieldClass} placeholder="Texto do link (opcional)" />
              )}
            </>
          )}
          {item.type === 'buttons' && (
            <div className="space-y-2">
              {(item.buttons || []).map((btn, bi) => (
                <div key={bi} className="flex gap-2 items-center">
                  <input type="text" value={btn.label}
                    onChange={(e) => { const btns = [...(item.buttons || [])]; btns[bi] = { ...btns[bi], label: e.target.value }; onChange({ ...item, buttons: btns }); }}
                    className={`${fieldClass} flex-1`} placeholder={`Botão ${bi + 1}`} />
                  <button onClick={() => onChange({ ...item, buttons: (item.buttons || []).filter((_, idx) => idx !== bi) })} className="p-2 hover:bg-red-50 rounded-lg">
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
              ))}
              <button onClick={() => onChange({ ...item, buttons: [...(item.buttons || []), { label: '', value: String(Date.now()) }] })}
                className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 rounded-xl text-[11px] text-slate-500 hover:border-blue-400 hover:text-blue-500">
                <Plus size={12} /> Adicionar botão
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ConfigPanel ──────────────────────────────────────────────────────────────
interface Pipeline { id: string; name: string; stages: { id: string; name: string; order: number }[] }

interface ConfigPanelProps {
  node: { id: string; type: string; data: Record<string, unknown> } | null;
  onClose: () => void;
  onSave: (nodeId: string, data: Record<string, unknown>) => void;
  onDeleteNode?: (nodeId: string) => void;
}

export default function ConfigPanel({ node, onClose, onSave, onDeleteNode }: ConfigPanelProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  // Dynamic data from API
  const [channels, setChannels] = useState<{ id: string; name: string; identifier: string; status: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  useEffect(() => {
    api.get('/api/channels').then(r => setChannels(r.data || [])).catch(() => {});
    api.get('/api/tags').then(r => setTags(r.data?.tags || r.data || [])).catch(() => {});
    api.get('/api/users').then(r => setUsers(r.data?.users || r.data || [])).catch(() => {});
    api.get('/api/pipelines').then(r => setPipelines(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!node) return;
    const d = { ...node.data };
    setFormData(d);
    if (node.type === 'action' && (d.actionType === 'SEND_MESSAGE' || d.action === 'SEND_MESSAGE')) {
      if (Array.isArray(d.contents) && (d.contents as ContentItem[]).length > 0) {
        setContents(d.contents as ContentItem[]);
      } else if (Array.isArray(d.items) && (d.items as ContentItem[]).length > 0) {
        setContents(d.items as ContentItem[]);
      } else if (typeof d.message === 'string' && d.message) {
        setContents([{ id: Date.now().toString(), type: 'text', text: d.message }]);
      } else {
        setContents([]);
      }
    }
  }, [node?.id]); // eslint-disable-line

  if (!node) return null;

  const update = (key: string, value: unknown) => setFormData((prev) => ({ ...prev, [key]: value }));

  const isSendMessage = node.type === 'action' && (formData.actionType === 'SEND_MESSAGE' || formData.action === 'SEND_MESSAGE');

  const handleSave = () => {
    let finalData = { ...formData };
    if (isSendMessage) {
      finalData = { ...finalData, contents, items: contents };
    }
    onSave(node.id, finalData);
    onClose();
  };

  const addContent = (type: ContentType) => {
    const item: ContentItem = {
      id: Date.now().toString(), type,
      ...(type === 'delay' ? { delay: 5, unit: 'SECONDS' } : {}),
      ...(type === 'buttons' ? { buttons: [{ label: '', value: '1' }] } : {}),
    };
    setContents((prev) => [...prev, item]);
    setShowPicker(false);
  };

  const updateItem = (id: string, updated: ContentItem) => setContents((prev) => prev.map((c) => (c.id === id ? updated : c)));
  const deleteItem = (id: string) => setContents((prev) => prev.filter((c) => c.id !== id));

  const action = (formData.actionType || formData.action) as string | undefined;
  const meta = node.type === 'action' && action && ACTION_META[action]
    ? ACTION_META[action]
    : TYPE_META[node.type] || { icon: Settings, title: 'Configurar', subtitle: '', iconColor: 'text-slate-600', iconBg: 'bg-slate-100' };
  const HeaderIcon = meta.icon;

  const connectedChannels = channels.filter(c => c.status === 'CONNECTED');

  return (
    <div className="absolute right-0 top-0 h-full w-[320px] bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-2xl z-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex-shrink-0">
          <ChevronLeft size={16} className="text-slate-500" />
        </button>
        <div className={`w-8 h-8 ${meta.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <HeaderIcon size={14} className={meta.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{meta.title}</p>
          <p className="text-[10px] text-slate-400 truncate">{meta.subtitle}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── SEND_MESSAGE ─────────────────────────────────────────────── */}
        {isSendMessage && (
          <>
            {/* Instance selector */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <p className={labelClass}>Instância WhatsApp</p>
              <select
                value={String(formData.connectionId || formData.connection || '')}
                onChange={(e) => { update('connectionId', e.target.value); update('connection', e.target.value); }}
                className={fieldClass}
              >
                <option value="">— Usar qualquer instância conectada —</option>
                {connectedChannels.map(ch => (
                  <option key={ch.id} value={ch.id}>{ch.name} ({ch.identifier})</option>
                ))}
                {channels.filter(c => c.status !== 'CONNECTED').map(ch => (
                  <option key={ch.id} value={ch.id} disabled>⚠ {ch.name} (desconectado)</option>
                ))}
              </select>
              <p className="text-[9px] text-slate-400 mt-1">A mensagem será enviada por esta instância.</p>
            </div>

            {/* Content items */}
            <div className="px-4 py-4 space-y-2.5">
              {contents.map((item) => (
                <ContentItemCard key={item.id} item={item} onChange={(u) => updateItem(item.id, u)} onDelete={() => deleteItem(item.id)} />
              ))}
              <button onClick={() => setShowPicker((v) => !v)}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
                <Plus size={14} /> Adicionar elemento
              </button>
              {showPicker && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-800 shadow-lg">
                  {CONTENT_TYPES.map((ct) => {
                    const Icon = ct.icon;
                    return (
                      <button key={ct.type} onClick={() => addContent(ct.type)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 text-left">
                        <div className={`w-7 h-7 ${ct.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon size={13} className={ct.color} />
                        </div>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{ct.label}</span>
                      </button>
                    );
                  })}
                  <button onClick={() => addContent('buttons')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-left">
                    <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-dashed border-blue-300">
                      <Plus size={13} className="text-blue-500" />
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">Adicionar botão</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Other ACTION types ────────────────────────────────────────── */}
        {node.type === 'action' && !isSendMessage && (
          <div className="px-4 py-4 space-y-4">
            <div>
              <p className={labelClass}>Tipo de ação</p>
              <select value={String(action || '')} onChange={(e) => { update('actionType', e.target.value); update('action', e.target.value); }} className={fieldClass}>
                <option value="SEND_MESSAGE">Enviar Mensagem</option>
                <option value="ADD_TAG">Adicionar Tag</option>
                <option value="REMOVE_TAG">Remover Tag</option>
                <option value="ASSIGN_AGENT">Atribuir Atendente</option>
                <option value="MOVE_PIPELINE">Mover Pipeline</option>
                <option value="HTTP_REQUEST">Requisição HTTP</option>
                <option value="FILTER_LEADS">Filtrar Leads</option>
              </select>
            </div>

            {(action === 'ADD_TAG' || action === 'REMOVE_TAG') && (
              <div>
                <p className={labelClass}>Tag</p>
                <select value={String(formData.tagName || formData.tag || '')} onChange={(e) => { update('tagName', e.target.value); update('tag', e.target.value); }} className={fieldClass}>
                  <option value="">— Selecione uma tag —</option>
                  {tags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
                <p className="text-[9px] text-slate-400 mt-1">Ou digite o nome de uma nova tag:</p>
                <input type="text" value={String(formData.tagName || formData.tag || '')}
                  onChange={(e) => { update('tagName', e.target.value); update('tag', e.target.value); }}
                  className={`${fieldClass} mt-1`} placeholder="Ex: cliente-vip" />
              </div>
            )}

            {action === 'ASSIGN_AGENT' && (
              <div>
                <p className={labelClass}>Atendente</p>
                <select value={String(formData.userId || formData.agentId || '')} onChange={(e) => { update('userId', e.target.value); update('agentId', e.target.value); }} className={fieldClass}>
                  <option value="">— Selecione um atendente —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}

            {action === 'MOVE_PIPELINE' && (() => {
              const selectedPipelineId = String(formData.pipelineId || '');
              const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
              return (
                <>
                  <div>
                    <p className={labelClass}>Pipeline</p>
                    <select value={selectedPipelineId} onChange={(e) => { update('pipelineId', e.target.value); update('stageId', ''); }} className={fieldClass}>
                      <option value="">— Selecione o pipeline —</option>
                      {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  {selectedPipeline && (
                    <div>
                      <p className={labelClass}>Etapa de destino</p>
                      <select value={String(formData.stageId || '')} onChange={(e) => update('stageId', e.target.value)} className={fieldClass}>
                        <option value="">— Selecione a etapa —</option>
                        {selectedPipeline.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                </>
              );
            })()}

            {action === 'HTTP_REQUEST' && (
              <>
                <div>
                  <p className={labelClass}>URL</p>
                  <input type="text" value={String(formData.url || '')} onChange={(e) => update('url', e.target.value)} className={fieldClass} placeholder="https://..." />
                </div>
                <div>
                  <p className={labelClass}>Método</p>
                  <select value={String(formData.method || 'POST')} onChange={(e) => update('method', e.target.value)} className={fieldClass}>
                    <option value="GET">GET</option><option value="POST">POST</option><option value="PUT">PUT</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TRIGGER ──────────────────────────────────────────────────── */}
        {node.type === 'trigger' && (
          <div className="px-4 py-4 space-y-4">
            <div>
              <p className={labelClass}>Tipo de gatilho</p>
              <select value={String(formData.type || '')} onChange={(e) => update('type', e.target.value)} className={fieldClass}>
                <option value="LEAD_CREATED">Lead Criado</option>
                <option value="TAG_ADDED">Tag Adicionada</option>
                <option value="MESSAGE_RECEIVED">Mensagem Recebida</option>
                <option value="DEAL_WON">Negócio Ganho</option>
                <option value="DEAL_LOST">Negócio Perdido</option>
                <option value="TIME_ELAPSED">Tempo Decorrido</option>
                <option value="SCHEDULED">Agendado</option>
              </select>
            </div>

            {/* TAG_ADDED: filter by specific tag */}
            {formData.type === 'TAG_ADDED' && (
              <div>
                <p className={labelClass}>Tag específica <span className="text-slate-400 font-normal">(opcional)</span></p>
                <select value={String(formData.tagName || '')} onChange={(e) => update('tagName', e.target.value)} className={fieldClass}>
                  <option value="">— Qualquer tag —</option>
                  {tags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
                <p className="text-[9px] text-slate-400 mt-1">Se vazio, dispara para qualquer tag adicionada.</p>
              </div>
            )}

            {/* DEAL_WON / DEAL_LOST: filter by pipeline */}
            {(formData.type === 'DEAL_WON' || formData.type === 'DEAL_LOST') && (() => {
              const selectedPipelineId = String(formData.pipelineId || '');
              const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
              return (
                <>
                  <div>
                    <p className={labelClass}>Pipeline específico <span className="text-slate-400 font-normal">(opcional)</span></p>
                    <select value={selectedPipelineId} onChange={(e) => { update('pipelineId', e.target.value); update('stageId', ''); }} className={fieldClass}>
                      <option value="">— Qualquer pipeline —</option>
                      {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1">Se vazio, dispara para negócios em qualquer pipeline.</p>
                  </div>
                  {selectedPipeline && (
                    <div>
                      <p className={labelClass}>Etapa específica <span className="text-slate-400 font-normal">(opcional)</span></p>
                      <select value={String(formData.stageId || '')} onChange={(e) => update('stageId', e.target.value)} className={fieldClass}>
                        <option value="">— Qualquer etapa —</option>
                        {selectedPipeline.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                </>
              );
            })()}

            <div>
              <p className={labelClass}>Nome do bloco</p>
              <input type="text" value={String(formData.label || '')} onChange={(e) => update('label', e.target.value)} className={fieldClass} placeholder="Ex: Início da jornada" />
            </div>
          </div>
        )}

        {/* ── CONDITION ────────────────────────────────────────────────── */}
        {node.type === 'condition' && (
          <div className="px-4 py-4 space-y-4">
            <div>
              <p className={labelClass}>Nome da condição</p>
              <input type="text" value={String(formData.label || '')} onChange={(e) => update('label', e.target.value)} className={fieldClass} placeholder="Ex: Tem tag VIP?" />
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-700/50 px-3 py-2 border-b border-slate-200 dark:border-slate-600">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Critérios — Se</p>
              </div>
              <div className="p-3 space-y-3">
                <select value={String(formData.field || '')} onChange={(e) => update('field', e.target.value)} className={fieldClass}>
                  <option value="">Selecione o campo...</option>
                  <option value="tag">Tag</option>
                  <option value="source">Origem</option>
                  <option value="deal_value">Valor do negócio</option>
                  <option value="message_content">Conteúdo da mensagem</option>
                </select>
                <select value={String(formData.operator || 'equals')} onChange={(e) => update('operator', e.target.value)} className={fieldClass}>
                  <option value="equals">Igual a</option>
                  <option value="contains">Contém</option>
                  <option value="greater_than">Maior que</option>
                  <option value="less_than">Menor que</option>
                  <option value="exists">Existe</option>
                </select>
                <input type="text" value={String(formData.value || '')} onChange={(e) => update('value', e.target.value)} className={fieldClass} placeholder="Valor de comparação" />
              </div>
            </div>
          </div>
        )}

        {/* ── DELAY ────────────────────────────────────────────────────── */}
        {node.type === 'delay' && (
          <div className="px-4 py-4 space-y-4">
            <p className="text-xs text-slate-500">Aguarda um tempo antes de continuar para o próximo bloco.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={labelClass}>Quantidade</p>
                <input type="number" min={1} value={Number(formData.delay || 1)} onChange={(e) => update('delay', parseInt(e.target.value))} className={fieldClass} />
              </div>
              <div>
                <p className={labelClass}>Unidade</p>
                <select value={String(formData.unit || 'HOURS')} onChange={(e) => update('unit', e.target.value)} className={fieldClass}>
                  <option value="MINUTES">Minutos</option>
                  <option value="HOURS">Horas</option>
                  <option value="DAYS">Dias</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 dark:border-slate-700 p-4 flex-shrink-0 space-y-2">
        <button onClick={handleSave} style={{ backgroundColor: '#00A34D' }}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm">
          <Save size={14} /> Salvar
        </button>
        {onDeleteNode && (
          <button onClick={() => { onDeleteNode(node.id); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-2 text-red-500 text-xs font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-red-200 dark:border-red-800">
            <Trash2 size={13} /> Deletar bloco
          </button>
        )}
      </div>
    </div>
  );
}
