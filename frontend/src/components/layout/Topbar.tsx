import React from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Plus, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/pipeline': 'Pipeline de Vendas',
  '/atendimento': 'Atendimento',
  '/leads': 'Leads',
  '/automacoes': 'Automacoes',
  '/configuracoes': 'Configuracoes',
  '/rastreio': 'Rastreio',
  '/scripts': 'Scripts',
  '/disparos': 'Disparos',
  '/analises': 'Analises',
};

export default function Topbar() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const title = pageTitles[location.pathname] || 'CRM xPay';

  return (
    <div className="h-14 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-4 flex-shrink-0">
      <h1 className="text-base font-semibold text-gray-900 dark:text-slate-100">{title}</h1>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-8 pr-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 dark:text-slate-200 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
        </div>
        <button
          onClick={toggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          title={isDark ? 'Modo claro' : 'Modo escuro'}
        >
          {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-500" />}
        </button>
        <button className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
          <Plus size={14} />
          Novo
        </button>
      </div>
    </div>
  );
}
