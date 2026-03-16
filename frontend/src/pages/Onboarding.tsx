import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, MessageSquare, GitBranch, Plus, Trash2, Check, Loader2 } from 'lucide-react';
import api from '../services/api';

function StepEmpresa({ data, onChange }: { data: { name: string; segment: string }; onChange: (d: { name: string; segment: string }) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/40 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Building2 size={24} className="text-brand-600 dark:text-brand-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Bem-vindo ao CRM xPay!</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Vamos configurar sua conta em poucos passos</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome da empresa</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          placeholder="Ex: Minha Empresa Digital"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Segmento</label>
        <select
          value={data.segment}
          onChange={(e) => onChange({ ...data, segment: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
        >
          <option value="">Selecione...</option>
          <option value="Infoprodutos">Infoprodutos</option>
          <option value="E-commerce">E-commerce</option>
          <option value="Servicos">Servicos</option>
          <option value="Consultoria">Consultoria</option>
          <option value="Outro">Outro</option>
        </select>
      </div>
    </div>
  );
}

function StepEquipe({ members, onChange }: { members: { name: string; email: string; departments: string[] }[]; onChange: (m: { name: string; email: string; departments: string[] }[]) => void }) {
  const addMember = () => onChange([...members, { name: '', email: '', departments: ['Vendas'] }]);
  const removeMember = (idx: number) => onChange(members.filter((_, i) => i !== idx));
  const updateMember = (idx: number, field: string, value: string | string[]) => {
    const updated = [...members];
    (updated[idx] as Record<string, unknown>)[field] = value;
    onChange(updated);
  };
  const toggleDept = (idx: number, dept: string) => {
    const updated = [...members];
    const depts = updated[idx].departments;
    updated[idx].departments = depts.includes(dept) ? depts.filter(d => d !== dept) : [...depts, dept];
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Users size={24} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Monte sua equipe</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Adicione seus primeiros atendentes</p>
      </div>
      {members.map((member, idx) => (
        <div key={idx} className="border border-slate-200 dark:border-slate-600 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Atendente {idx + 1}</span>
            {members.length > 1 && (
              <button onClick={() => removeMember(idx)} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <input
            type="text"
            value={member.name}
            onChange={(e) => updateMember(idx, 'name', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            placeholder="Nome"
          />
          <input
            type="email"
            value={member.email}
            onChange={(e) => updateMember(idx, 'email', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            placeholder="Email"
          />
          <div className="flex gap-2">
            {['Vendas', 'Suporte', 'Cobranca'].map(dept => (
              <button
                key={dept}
                onClick={() => toggleDept(idx, dept)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  member.departments.includes(dept)
                    ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-700'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={addMember}
        className="flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700"
      >
        <Plus size={14} /> Adicionar atendente
      </button>
    </div>
  );
}

function StepWhatsApp({ config, onChange }: { config: { type: string; token: string; instanceName: string }; onChange: (c: { type: string; token: string; instanceName: string }) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <div className="w-14 h-14 bg-green-100 dark:bg-green-900/40 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <MessageSquare size={24} className="text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Conectar WhatsApp</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Escolha como conectar seu WhatsApp</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'cloud', label: 'WhatsApp Oficial', desc: 'Cloud API (Meta)', color: 'brand' },
          { key: 'evolution', label: 'Via QR Code', desc: 'Evolution API', color: 'emerald' },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => onChange({ ...config, type: opt.key })}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              config.type === opt.key
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 dark:border-brand-400'
                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
            }`}
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{opt.label}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</p>
          </button>
        ))}
      </div>
      {config.type === 'cloud' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Token de acesso</label>
          <input
            type="text"
            value={config.token}
            onChange={(e) => onChange({ ...config, token: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            placeholder="Token da Cloud API"
          />
        </div>
      )}
      {config.type === 'evolution' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome da instancia</label>
          <input
            type="text"
            value={config.instanceName}
            onChange={(e) => onChange({ ...config, instanceName: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            placeholder="minha-instancia"
          />
        </div>
      )}
      <p className="text-xs text-slate-400 dark:text-slate-500">Voce pode configurar isso depois nas configuracoes.</p>
    </div>
  );
}

function StepPipeline({ pipelineName, onChange }: { pipelineName: string; onChange: (n: string) => void }) {
  const defaultStages = ['Lead Novo', 'Abordagem', 'Objecao', 'Fechamento', 'Ganho'];
  const stageColors = ['#6366f1', '#818cf8', '#f59e0b', '#10b981', '#22c55e'];

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/40 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <GitBranch size={24} className="text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Primeira pipeline</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure seu funil de vendas X1</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nome da pipeline</label>
        <input
          type="text"
          value={pipelineName}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          placeholder="Vendas X1"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Etapas do funil</label>
        <div className="space-y-2">
          {defaultStages.map((stage, idx) => (
            <div key={stage} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700 rounded-lg px-4 py-2.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stageColors[idx] }} />
              <span className="text-sm text-slate-700 dark:text-slate-200">{stage}</span>
              {idx < defaultStages.length - 1 && (
                <svg className="w-4 h-4 text-slate-300 dark:text-slate-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              {idx === defaultStages.length - 1 && (
                <Check size={16} className="text-emerald-500 ml-auto" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const steps = ['Empresa', 'Equipe', 'WhatsApp', 'Pipeline'];

  const [companyData, setCompanyData] = useState({ name: '', segment: '' });
  const [members, setMembers] = useState([{ name: '', email: '', departments: ['Vendas'] as string[] }]);
  const [whatsappConfig, setWhatsappConfig] = useState({ type: '', token: '', instanceName: '' });
  const [pipelineName, setPipelineName] = useState('Vendas X1');

  const completeOnboarding = async () => {
    setSaving(true);
    try {
      // Save pipeline
      if (pipelineName.trim()) {
        await api.post('/api/pipelines', {
          name: pipelineName,
          stages: [
            { name: 'Lead Novo', color: '#6366f1', order: 0 },
            { name: 'Abordagem', color: '#818cf8', order: 1 },
            { name: 'Objecao', color: '#f59e0b', order: 2 },
            { name: 'Fechamento', color: '#10b981', order: 3 },
            { name: 'Ganho', color: '#22c55e', order: 4 },
          ],
        }).catch(() => {});
      }
      navigate('/');
    } catch {
      navigate('/');
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    if (step === 0) return companyData.name.trim().length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i <= step ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-400 border-2 border-slate-200 dark:border-slate-600'
                }`}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span className={`text-xs mt-1 ${i <= step ? 'text-brand-600 dark:text-brand-400 font-medium' : 'text-slate-400'}`}>{s}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-1 w-16 sm:w-24 mx-2 rounded transition-all ${i < step ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 animate-fade-in-up">
          {step === 0 && <StepEmpresa data={companyData} onChange={setCompanyData} />}
          {step === 1 && <StepEquipe members={members} onChange={setMembers} />}
          {step === 2 && <StepWhatsApp config={whatsappConfig} onChange={setWhatsappConfig} />}
          {step === 3 && <StepPipeline pipelineName={pipelineName} onChange={setPipelineName} />}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Voltar
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Pular
              </button>
            )}

            {step < steps.length - 1 ? (
              <div className="flex gap-2">
                {step >= 1 && (
                  <button
                    onClick={() => setStep(step + 1)}
                    className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Pular
                  </button>
                )}
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canNext()}
                  className="px-6 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 font-medium"
                >
                  Proximo
                </button>
              </div>
            ) : (
              <button
                onClick={completeOnboarding}
                disabled={saving}
                className="px-6 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors font-medium flex items-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Salvando...' : 'Concluir'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
