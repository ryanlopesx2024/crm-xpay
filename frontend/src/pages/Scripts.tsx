import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, GripVertical, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, X } from 'lucide-react';
import api from '../services/api';

interface ScriptStep {
  id: string;
  title: string;
  text: string;
  order: number;
}

interface Script {
  id: string;
  name: string;
  category: string;
  steps: ScriptStep[];
  isActive: boolean;
  createdAt: string;
}

const categories = ['Abordagem', 'Objecao', 'Fechamento', 'Follow-up', 'Reativacao'];

const categoryColors: Record<string, { bg: string; text: string }> = {
  'Abordagem': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Objecao': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'Fechamento': { bg: 'bg-green-100', text: 'text-green-700' },
  'Follow-up': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'Reativacao': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
};

export default function Scripts() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Abordagem');
  const [steps, setSteps] = useState<{ title: string; text: string }[]>([{ title: '', text: '' }]);

  const fetchData = async () => {
    try {
      const { data } = await api.get('/api/scripts');
      setScripts(data);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async () => {
    try {
      const payload = { name, category, steps };
      if (editId) {
        await api.put(`/api/scripts/${editId}`, payload);
      } else {
        await api.post('/api/scripts', payload);
      }
      resetForm();
      fetchData();
    } catch {
      // empty
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este script?')) return;
    try {
      await api.delete(`/api/scripts/${id}`);
      fetchData();
    } catch {
      // empty
    }
  };

  const handleToggle = async (script: Script) => {
    try {
      await api.put(`/api/scripts/${script.id}`, { isActive: !script.isActive });
      fetchData();
    } catch {
      // empty
    }
  };

  const handleEdit = (script: Script) => {
    setName(script.name);
    setCategory(script.category);
    setSteps(script.steps.map(s => ({ title: s.title, text: s.text })));
    setEditId(script.id);
    setShowModal(true);
  };

  const resetForm = () => {
    setShowModal(false);
    setEditId(null);
    setName('');
    setCategory('Abordagem');
    setSteps([{ title: '', text: '' }]);
  };

  const addStep = () => setSteps([...steps, { title: '', text: '' }]);
  const removeStep = (idx: number) => setSteps(steps.filter((_, i) => i !== idx));
  const moveStep = (idx: number, dir: number) => {
    const newSteps = [...steps];
    const target = idx + dir;
    if (target < 0 || target >= newSteps.length) return;
    [newSteps[idx], newSteps[target]] = [newSteps[target], newSteps[idx]];
    setSteps(newSteps);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
              <FileText size={20} className="text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Scripts de Vendas</h1>
              <p className="text-sm text-slate-500">Teleprompter para vendas X1 no WhatsApp</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus size={16} />
            Novo Script
          </button>
        </div>

        {/* Category filter badges */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {categories.map(cat => {
            const cc = categoryColors[cat] || { bg: 'bg-slate-100', text: 'text-slate-600' };
            const count = scripts.filter(s => s.category === cat).length;
            return (
              <span key={cat} className={`px-3 py-1 rounded-lg text-xs font-medium ${cc.bg} ${cc.text}`}>
                {cat} ({count})
              </span>
            );
          })}
        </div>

        {/* Script List */}
        {loading ? (
          <div className="text-center p-8 text-slate-400">Carregando...</div>
        ) : scripts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <FileText size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">Nenhum script criado ainda</p>
            <p className="text-xs text-slate-400 mt-1">Crie scripts para guiar suas conversas de venda X1</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scripts.map(script => {
              const cc = categoryColors[script.category] || { bg: 'bg-slate-100', text: 'text-slate-600' };
              const isExpanded = expandedId === script.id;
              return (
                <div key={script.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 flex-1">
                      <button onClick={() => setExpandedId(isExpanded ? null : script.id)} className="text-slate-400 hover:text-slate-600">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <div>
                        <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">{script.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${cc.bg} ${cc.text}`}>{script.category}</span>
                          <span className="text-xs text-slate-400">{script.steps.length} etapa(s)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggle(script)} title={script.isActive ? 'Desativar' : 'Ativar'}>
                        {script.isActive ? (
                          <ToggleRight size={22} className="text-green-500" />
                        ) : (
                          <ToggleLeft size={22} className="text-slate-300" />
                        )}
                      </button>
                      <button onClick={() => handleEdit(script)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand-600">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(script.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {isExpanded && script.steps.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-900">
                      <ol className="space-y-2">
                        {script.steps.sort((a, b) => a.order - b.order).map((step, idx) => (
                          <li key={step.id} className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{step.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{step.text}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{editId ? 'Editar Script' : 'Novo Script'}</h2>
              <button onClick={resetForm} className="p-1 rounded-lg hover:bg-slate-100">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Script</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Ex: Abordagem para curso de marketing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Etapas do Script</label>
                  <button onClick={addStep} className="text-xs text-brand-600 hover:text-brand-800 font-medium">+ Adicionar etapa</button>
                </div>
                <p className="text-xs text-slate-400 mb-2">Use {'{nome}'}, {'{produto}'}, {'{valor}'} como variaveis</p>
                <div className="space-y-3">
                  {steps.map((step, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">Etapa {idx + 1}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-30">
                            <ChevronUp size={12} />
                          </button>
                          <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} className="p-1 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-30">
                            <ChevronDown size={12} />
                          </button>
                          {steps.length > 1 && (
                            <button onClick={() => removeStep(idx)} className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="text"
                        value={step.title}
                        onChange={e => { const n = [...steps]; n[idx] = { ...n[idx], title: e.target.value }; setSteps(n); }}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="Titulo da etapa"
                      />
                      <textarea
                        value={step.text}
                        onChange={e => { const n = [...steps]; n[idx] = { ...n[idx], text: e.target.value }; setSteps(n); }}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                        rows={2}
                        placeholder="Texto da mensagem... use {nome}, {produto}, {valor}"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={resetForm} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!name}
                className="px-4 py-2 bg-brand-600 text-white text-sm rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {editId ? 'Salvar' : 'Criar Script'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
