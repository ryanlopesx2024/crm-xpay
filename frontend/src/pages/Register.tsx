import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Building2, User, Mail, Lock, Phone } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/register', {
        companyName: form.companyName,
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      await login(form.email, form.password);
      navigate('/onboarding');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const features = ['Pipeline de vendas X1', 'Automacoes WhatsApp', 'Rastreio de pedidos', 'Analise de conversao'];

  return (
    <div className="min-h-screen flex dark:bg-slate-900">
      {/* Left Panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-brand-600 via-purple-600 to-brand-800 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-purple-300 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">xP</span>
          </div>
          <span className="text-white font-bold text-xl">CRM xPay</span>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Comece agora.<br />
            <span className="text-purple-200">E venda mais.</span>
          </h2>
          <p className="text-brand-200 text-lg mb-8">
            CRM especializado para vendedores digitais e times de WhatsApp
          </p>
          <div className="space-y-3">
            {features.map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-brand-100 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[{ n: 'Gratis', l: 'Para comecar' }, { n: '100%', l: 'Configuravel' }, { n: '24/7', l: 'Disponivel' }].map(s => (
            <div key={s.l} className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-white font-bold text-xl">{s.n}</div>
              <div className="text-brand-200 text-xs">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-slate-900 overflow-y-auto">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="inline-flex w-14 h-14 bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl items-center justify-center mb-4 shadow-lg shadow-brand-200 dark:shadow-none">
              <span className="text-white font-bold text-xl">xP</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Criar sua conta</h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Comece gratuitamente, sem cartao</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-gray-100 dark:shadow-none border border-gray-100 dark:border-slate-700 p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Company */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Empresa</label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={set('companyName')}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                    placeholder="Nome da sua empresa"
                    required
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Seu nome</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={set('name')}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">WhatsApp</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Senha</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                    placeholder="Min. 6 caracteres"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Confirmar senha</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                    placeholder="Repita a senha"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm mt-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Criando conta...' : 'Criar conta gratis'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-slate-400 mt-6">
            Ja tem conta?{' '}
            <Link to="/login" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
