import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  GitBranch,
  Users,
  Zap,
  MessageSquare,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Truck,
  FileText,
  Megaphone,
  BarChart2,
  GitMerge,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useConversationStore } from '../../stores/conversationStore';
import { useSocketEvent } from '../../hooks/useSocket';
import Avatar from '../shared/Avatar';

const navItems = [
  { to: '/', icon: LayoutGrid, label: 'Dashboard', exact: true },
  { to: '/pipeline', icon: GitBranch, label: 'Pipeline' },
  { to: '/atendimento', icon: MessageSquare, label: 'Atendimento' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/automacoes', icon: Zap, label: 'Automacoes' },
  { to: '/rastreio', icon: Truck, label: 'Rastreio' },
  { to: '/scripts', icon: FileText, label: 'Scripts' },
  { to: '/disparos', icon: Megaphone, label: 'Disparos' },
  { to: '/analises', icon: BarChart2, label: 'Analises' },
  { to: '/funnels', icon: GitMerge, label: 'Funis' },
];

const bottomItems = [
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { conversations } = useConversationStore();

  // Badge: conta conversas pendentes ou com mensagem não lida
  const [extraPending, setExtraPending] = useState(0);

  // Quando chega nova conversa (não estamos na página de atendimento)
  useSocketEvent<{ conversation: any; message: any }>('new_conversation', () => {
    if (!location.pathname.startsWith('/atendimento')) {
      setExtraPending((n) => n + 1);
    }
  });
  useSocketEvent<{ conversationId: string; message: any }>('new_incoming_message', () => {
    if (!location.pathname.startsWith('/atendimento')) {
      setExtraPending((n) => n + 1);
    }
  });

  // Ao entrar em /atendimento, zera o extra
  useEffect(() => {
    if (location.pathname.startsWith('/atendimento')) {
      setExtraPending(0);
    }
  }, [location.pathname]);

  const pendingCount = conversations.filter((c) => c.status === 'PENDING').length + extraPending;

  return (
    <div className="w-14 h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-md flex flex-col items-center py-3 flex-shrink-0 z-20">
      {/* XPAY Logo */}
      <div className="w-9 h-9 rounded-xl mb-6 flex-shrink-0 shadow-md overflow-hidden">
        <img src="/xpay-logo.png" alt="XPAY" className="w-full h-full object-cover" />
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {navItems.map(({ to, icon: Icon, label, exact }) => {
          const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
          const isAtendimento = to === '/atendimento';
          const badge = isAtendimento && pendingCount > 0 ? pendingCount : 0;
          return (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative ${
                isActive
                  ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-600 dark:bg-brand-400 rounded-r-full" />
              )}
              <Icon size={20} />
              {badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 animate-pulse-soft">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Items */}
      <div className="flex flex-col items-center gap-1 mb-2">
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
          >
            <Icon size={20} />
          </NavLink>
        ))}

        {/* Notifications */}
        <button
          title="Notificacoes"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 relative"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold animate-pulse-soft">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <NavLink
          to="/configuracoes"
          title="Configuracoes"
          className={({ isActive }) =>
            `w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative ${
              isActive
                ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-600 dark:bg-brand-400 rounded-r-full" />
              )}
              <Settings size={20} />
            </>
          )}
        </NavLink>

        {/* User Avatar */}
        {user && (
          <div className="mt-2 group relative">
            <button title={user.name}>
              <Avatar name={user.name} src={user.avatar} size="sm" status={user.status} />
            </button>
            <div className="absolute left-full bottom-0 ml-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-1 hidden group-hover:block min-w-[120px] z-50">
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg w-full text-left transition-colors"
              >
                <LogOut size={14} />
                Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
