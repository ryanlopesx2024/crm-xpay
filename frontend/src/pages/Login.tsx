import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const errMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(errMsg || 'Credenciais invalidas');
    } finally {
      setLoading(false);
    }
  };

  const features = ['Pipeline de vendas X1', 'Automacoes WhatsApp', 'Rastreio automatico', 'Analise de conversao'];
  const stats = [
    { n: '2.4k+', l: 'Vendedores' },
    { n: 'R$12M+', l: 'Receita gerenciada' },
    { n: '98%', l: 'Satisfacao' },
  ];

  return (
    <div className="min-h-screen flex dark:bg-slate-900">
      {/* Left Panel */}
      <div className="hidden lg:flex w-1/2 p-12 flex-col justify-between relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #00C05A 0%, #007A38 60%, #005228 100%)' }}>
        {/* Background decorations */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-brand-300 rounded-full blur-2xl" />
        </div>
        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl shadow-lg overflow-hidden">
              <img src="/xpay-logo.png" alt="XPAY" className="w-full h-full object-cover" />
            </div>
            <span className="text-white font-black text-2xl tracking-tight">XPAY</span>
          </div>
        </div>
        {/* Content */}
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Venda mais.<br />
            <span className="text-white/80">Gerencie melhor.</span>
          </h2>
          <p className="text-white text-lg mb-8">
            CRM especializado para vendedores digitais e times de WhatsApp
          </p>
          <div className="space-y-3">
            {features.map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-white text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {stats.map(s => (
            <div key={s.l} className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-white font-bold text-xl">{s.n}</div>
              <div className="text-white/70 text-xs">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Logo (mobile) */}
          <div className="text-center mb-10">
            <div className="inline-flex w-16 h-16 rounded-2xl mb-4 shadow-lg overflow-hidden">
              <img src="/xpay-logo.png" alt="XPAY" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h1>
            <p className="text-gray-500 text-sm mt-1">Faca login para acessar o XPAY CRM</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition-all"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition-all"
                    placeholder="********"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Forgot password link */}
              <div className="text-right">
                <button type="button" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                  Esqueceu a senha?
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
          <p className="text-center text-sm text-gray-500 mt-6">
            Nao tem conta?{' '}
            <Link to="/register" className="text-brand-600 font-semibold hover:underline">
              Criar conta gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
