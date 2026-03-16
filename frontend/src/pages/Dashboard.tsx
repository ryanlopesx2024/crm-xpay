import React, { useEffect, useState } from 'react';
import {
  Users, MessageSquare, TrendingUp, DollarSign,
  Tag, GitBranch, UserPlus, CheckCircle, Zap, Info,
  BarChart2, Headphones, Activity, Trophy,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── types ─────────────────────────────────────────────────────────────────────
interface DashboardStats {
  totalLeads: number;
  openConversations: number;
  monthDeals: number;
  wonRevenue: number;
  recentHistory: Array<{ id: string; type: string; description: string; createdAt: string; lead?: { name: string } }>;
  agentPerformance: Array<{ userId: string; name: string; deals: number }>;
}

interface NegociosData {
  total: { count: number; value: number };
  won: { count: number; value: number };
  lost: { count: number; value: number };
  open: { count: number; value: number };
  monthly: Array<{ month: string; total: number; ganhos: number; valor: number }>;
  byAgent: Array<{ id: string; name: string; count: number; value: number; won: number }>;
  byProduct: Array<{ name: string; category: string; count: number; value: number; won: number }>;
}

interface AtendimentosData {
  total: number;
  resolved: number;
  open: number;
  pending: number;
  monthly: Array<{ month: string; total: number; finalizados: number }>;
  byDepartment: Array<{ id: string; name: string; count: number }>;
  byAgent: Array<{ id: string; name: string; count: number }>;
}

// ── constants ─────────────────────────────────────────────────────────────────
const PALETTE = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#3b82f6', '#ef4444', '#06b6d4', '#f97316'];

const historyIcon: Record<string, { icon: React.ElementType; color: string; bg: string; dot: string }> = {
  LEAD_CREATED:           { icon: UserPlus,     color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/30',   dot: 'bg-indigo-400' },
  TAG_ADDED:              { icon: Tag,           color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/30',   dot: 'bg-purple-400' },
  DEAL_CREATED:           { icon: GitBranch,     color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30', dot: 'bg-emerald-400'},
  DEAL_STAGE_CHANGED:     { icon: GitBranch,     color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/30',     dot: 'bg-amber-400'  },
  CONVERSATION_STARTED:   { icon: MessageSquare, color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/30',   dot: 'bg-indigo-400' },
  CONVERSATION_ASSIGNED:  { icon: CheckCircle,   color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30', dot: 'bg-emerald-400'},
  CONVERSATION_RESOLVED:  { icon: CheckCircle,   color: 'text-slate-500',   bg: 'bg-slate-50 dark:bg-slate-700',        dot: 'bg-slate-400'  },
  AUTOMATION_TRIGGERED:   { icon: Zap,           color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/30',     dot: 'bg-amber-400'  },
};

const fmt  = (n: number) => n.toLocaleString('pt-BR');
const fmtR = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const pct  = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

// ── KPI card ──────────────────────────────────────────────────────────────────
const KPI_THEMES = {
  indigo: {
    gradient: 'from-indigo-500 to-violet-600',
    glow: 'shadow-indigo-200 dark:shadow-indigo-900/40',
    text: 'text-indigo-600 dark:text-indigo-400',
    badge: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
  },
  emerald: {
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-200 dark:shadow-emerald-900/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    gradient: 'from-amber-400 to-orange-500',
    glow: 'shadow-amber-200 dark:shadow-amber-900/40',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
  },
  violet: {
    gradient: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-200 dark:shadow-violet-900/40',
    text: 'text-violet-600 dark:text-violet-400',
    badge: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400',
  },
  rose: {
    gradient: 'from-rose-500 to-pink-600',
    glow: 'shadow-rose-200 dark:shadow-rose-900/40',
    text: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400',
  },
};
type KpiTheme = keyof typeof KPI_THEMES;

function KpiCard({
  title, value, sub, icon: Icon, theme, loading,
}: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; theme: KpiTheme; loading?: boolean;
}) {
  const t = KPI_THEMES[theme];
  return (
    <div className={`relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 overflow-hidden hover:shadow-lg ${t.glow} transition-all duration-300`}>
      {/* Background blob */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${t.gradient} opacity-[0.08]`} />
      <div className="relative">
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${t.gradient} shadow-sm mb-3`}>
          <Icon size={17} className="text-white" />
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none mb-1">
          {loading ? <span className="inline-block w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /> : value}
        </p>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{title}</p>
        {sub && (
          <p className={`mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full w-fit ${t.badge}`}>
            {loading ? '...' : sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── SectionCard ───────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        {subtitle && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-3 py-2.5 text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1.5 text-[11px]">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-500 dark:text-slate-400">{p.name}:</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Ranking row ───────────────────────────────────────────────────────────────
function RankRow({ rank, name, count, total, sub, color }: { rank: number; name: string; count: number; total: number; sub?: string; color: string }) {
  const width = pct(count, total);
  return (
    <div className="flex items-center gap-3 group">
      <span className={`text-[10px] font-bold w-5 text-center rounded-md py-0.5 ${rank <= 3 ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}
        style={rank <= 3 ? { background: color } : {}}>
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{name}</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-2 flex-shrink-0">{sub || fmt(count)}</span>
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${width}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonChart({ h = 220 }: { h?: number }) {
  return <div className={`rounded-xl bg-slate-100 dark:bg-slate-700/60 animate-pulse`} style={{ height: h }} />;
}

// ── Gradients defs for recharts ───────────────────────────────────────────────
function ChartDefs() {
  return (
    <defs>
      <linearGradient id="grad-indigo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id="grad-emerald" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
        <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id="grad-amber" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
      </linearGradient>
    </defs>
  );
}

// ── DonutStat ─────────────────────────────────────────────────────────────────
function DonutStat({ data, colors, centerLabel }: { data: { name: string; value: number }[]; colors: string[]; centerLabel: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <ChartDefs />
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={60} outerRadius={80}
            dataKey="value"
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => [fmt(Number(v)), '']} contentStyle={{ borderRadius: 12, fontSize: 11 }} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: -10 }}>
        <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{fmt(total)}</span>
        <span className="text-[9px] text-slate-400 dark:text-slate-500">{centerLabel}</span>
      </div>
    </div>
  );
}

// ── NEGÓCIOS tab ──────────────────────────────────────────────────────────────
function NegociosTab({ data, loading }: { data: NegociosData | null; loading: boolean }) {
  const d = data;
  const convRate = pct(d?.won.count ?? 0, d?.total.count ?? 0);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard title="Total de Negócios" value={fmt(d?.total.count ?? 0)} sub={fmtR(d?.total.value ?? 0)} icon={TrendingUp} theme="indigo" loading={loading} />
        <KpiCard title="Negócios Ganhos" value={fmt(d?.won.count ?? 0)} sub={`${convRate}% conversão`} icon={Trophy} theme="emerald" loading={loading} />
        <KpiCard title="Receita Gerada" value={fmtR(d?.won.value ?? 0)} sub={`${fmt(d?.won.count ?? 0)} deals`} icon={DollarSign} theme="amber" loading={loading} />
        <KpiCard title="Em Aberto" value={fmt(d?.open.count ?? 0)} sub={fmtR(d?.open.value ?? 0)} icon={GitBranch} theme="violet" loading={loading} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <SectionCard title="Negócios por Mês" subtitle="Últimos 12 meses — total vs ganhos">
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={d?.monthly ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <ChartDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" name="Total" stroke="#c7d2fe" strokeWidth={2} fill="url(#grad-indigo)" dot={false} />
                  <Area type="monotone" dataKey="ganhos" name="Ganhos" stroke="#6366f1" strokeWidth={2.5} fill="url(#grad-emerald)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </div>

        <SectionCard title="Por Status" subtitle="Distribuição atual">
          {loading ? <SkeletonChart /> : (() => {
            const pieData = [
              { name: 'Ganhos',   value: d?.won.count  ?? 0 },
              { name: 'Perdidos', value: d?.lost.count ?? 0 },
              { name: 'Abertos',  value: d?.open.count ?? 0 },
            ].filter((x) => x.value > 0);
            return <DonutStat data={pieData} colors={['#10b981', '#ef4444', '#6366f1']} centerLabel="total" />;
          })()}
        </SectionCard>
      </div>

      {/* Revenue area */}
      <SectionCard title="Receita Mensal (Ganhos)" subtitle="Valor em R$ dos negócios ganhos por mês">
        {loading ? <SkeletonChart h={160} /> : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={d?.monthly ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <ChartDefs />
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="valor" name="Receita" stroke="#f59e0b" strokeWidth={2.5} fill="url(#grad-amber)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Rankings */}
      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Top Atendentes" subtitle="Por volume de negócios (12 meses)">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
          ) : d?.byAgent.length ? (
            <div className="space-y-3">
              {d.byAgent.slice(0, 8).map((a, i) => (
                <RankRow
                  key={a.id} rank={i + 1} name={a.name}
                  count={a.count} total={d.byAgent[0].count}
                  sub={`${a.count} deals · ${pct(a.won, a.count)}% conv`}
                  color={PALETTE[i % PALETTE.length]}
                />
              ))}
            </div>
          ) : <p className="text-xs text-slate-400 text-center py-8">Sem dados</p>}
        </SectionCard>

        <SectionCard title="Top Produtos" subtitle="Por volume de negócios (12 meses)">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
          ) : d?.byProduct.length ? (
            <div className="space-y-3">
              {d.byProduct.slice(0, 8).map((p, i) => (
                <RankRow
                  key={p.name} rank={i + 1} name={p.name}
                  count={p.count} total={d.byProduct[0].count}
                  sub={`${p.count} deals · ${fmtR(p.value)}`}
                  color={PALETTE[i % PALETTE.length]}
                />
              ))}
            </div>
          ) : <p className="text-xs text-slate-400 text-center py-8">Sem dados</p>}
        </SectionCard>
      </div>
    </div>
  );
}

// ── MULTIATENDIMENTO tab ──────────────────────────────────────────────────────
function AtendimentosTab({ data, loading }: { data: AtendimentosData | null; loading: boolean }) {
  const d = data;
  const resRate = pct(d?.resolved ?? 0, d?.total ?? 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard title="Total de Atendimentos" value={fmt(d?.total ?? 0)} icon={Headphones} theme="indigo" loading={loading} />
        <KpiCard title="Finalizados" value={fmt(d?.resolved ?? 0)} sub={`${resRate}% resolução`} icon={CheckCircle} theme="emerald" loading={loading} />
        <KpiCard title="Em Aberto" value={fmt(d?.open ?? 0)} icon={MessageSquare} theme="amber" loading={loading} />
        <KpiCard title="Pendentes" value={fmt(d?.pending ?? 0)} icon={Activity} theme="rose" loading={loading} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <SectionCard title="Atendimentos por Mês" subtitle="Últimos 12 meses — total vs finalizados">
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={d?.monthly ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <ChartDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" name="Total" stroke="#c7d2fe" strokeWidth={2} fill="url(#grad-indigo)" dot={false} />
                  <Area type="monotone" dataKey="finalizados" name="Finalizados" stroke="#10b981" strokeWidth={2.5} fill="url(#grad-emerald)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </div>

        <SectionCard title="Status dos Atendimentos" subtitle="Distribuição atual">
          {loading ? <SkeletonChart /> : (() => {
            const pieData = [
              { name: 'Finalizados', value: d?.resolved ?? 0 },
              { name: 'Abertos',     value: d?.open     ?? 0 },
              { name: 'Pendentes',   value: d?.pending  ?? 0 },
            ].filter((x) => x.value > 0);
            return <DonutStat data={pieData} colors={['#10b981', '#6366f1', '#f59e0b']} centerLabel="total" />;
          })()}
        </SectionCard>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Por Departamento" subtitle="Volume de atendimentos (12 meses)">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-9 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
          ) : d?.byDepartment.length ? (
            <div className="space-y-3">
              {d.byDepartment.slice(0, 8).map((dep, i) => (
                <RankRow key={dep.id} rank={i + 1} name={dep.name} count={dep.count} total={d.byDepartment[0].count} color={PALETTE[i % PALETTE.length]} />
              ))}
            </div>
          ) : <p className="text-xs text-slate-400 text-center py-8">Sem dados</p>}
        </SectionCard>

        <SectionCard title="Por Atendente" subtitle="Atendimentos por agente (12 meses)">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-9 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />)}</div>
          ) : d?.byAgent.length ? (
            <div className="space-y-3">
              {d.byAgent.slice(0, 8).map((a, i) => (
                <RankRow key={a.id} rank={i + 1} name={a.name} count={a.count} total={d.byAgent[0].count} color={PALETTE[i % PALETTE.length]} />
              ))}
            </div>
          ) : <p className="text-xs text-slate-400 text-center py-8">Sem dados</p>}
        </SectionCard>
      </div>

      {/* Bar chart comparison departments */}
      {!loading && (d?.byDepartment.length ?? 0) > 0 && (
        <SectionCard title="Atendimentos por Departamento" subtitle="Comparativo visual">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d!.byDepartment.slice(0, 8)} margin={{ top: 4, right: 4, bottom: 0, left: -10 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Atendimentos" radius={[0, 4, 4, 0]}>
                {d!.byDepartment.slice(0, 8).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}
    </div>
  );
}

// ── ATIVIDADES tab ────────────────────────────────────────────────────────────
function AtividadesTab({ stats, loading }: { stats: DashboardStats | null; loading: boolean }) {
  const maxDeals = stats?.agentPerformance?.length ? Math.max(...stats.agentPerformance.map((a) => a.deals)) : 1;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard title="Total de Leads" value={fmt(stats?.totalLeads ?? 0)} icon={Users} theme="indigo" loading={loading} />
        <KpiCard title="Conversas Abertas" value={fmt(stats?.openConversations ?? 0)} icon={MessageSquare} theme="emerald" loading={loading} />
        <KpiCard title="Negócios no Mês" value={fmt(stats?.monthDeals ?? 0)} icon={TrendingUp} theme="violet" loading={loading} />
        <KpiCard title="Receita do Mês" value={fmtR(stats?.wonRevenue ?? 0)} icon={DollarSign} theme="amber" loading={loading} />
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Activity feed */}
        <div className="col-span-2">
          <SectionCard title="Atividade Recente" subtitle="Últimas ações no CRM">
            <div className="relative space-y-0 max-h-[400px] overflow-y-auto pr-1">
              {/* timeline line */}
              <div className="absolute left-[13px] top-0 bottom-0 w-px bg-slate-100 dark:bg-slate-700" />
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 pl-1">
                    <div className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-full animate-pulse flex-shrink-0 z-10" />
                    <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                ))
              ) : stats?.recentHistory?.length ? (
                stats.recentHistory.map((event) => {
                  const cfg = historyIcon[event.type] || { icon: Info, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-700', dot: 'bg-slate-400' };
                  const Icon = cfg.icon;
                  return (
                    <div key={event.id} className="flex items-start gap-3 py-2.5 pl-1 group">
                      <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg} ring-2 ring-white dark:ring-slate-800`}>
                        <Icon size={11} className={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{event.description}</p>
                        {event.lead?.name && (
                          <span className="inline-block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 bg-slate-50 dark:bg-slate-700/50 rounded px-1.5 py-px">
                            {event.lead.name}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0 pt-0.5">
                        {formatDistanceToNow(new Date(event.createdAt), { addSuffix: false, locale: ptBR })}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-slate-400 text-sm">Nenhuma atividade recente</div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Agent performance */}
        <SectionCard title="Desempenho por Atendente" subtitle="Negócios criados no mês">
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i}>
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded animate-pulse mb-1.5" />
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full animate-pulse" />
                </div>
              ))
            ) : stats?.agentPerformance?.length ? (
              stats.agentPerformance.map((agent, idx) => (
                <RankRow
                  key={agent.userId} rank={idx + 1} name={agent.name}
                  count={agent.deals} total={maxDeals}
                  sub={`${agent.deals} negócios`}
                  color={PALETTE[idx % PALETTE.length]}
                />
              ))
            ) : (
              <p className="text-center py-8 text-slate-400 text-xs">Sem dados</p>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
type Tab = 'negocios' | 'atendimentos' | 'atividades';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'negocios',     label: 'Negócios',        icon: BarChart2  },
  { id: 'atendimentos', label: 'Multiatendimento', icon: Headphones },
  { id: 'atividades',   label: 'Atividades',       icon: Activity   },
];

export default function Dashboard() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('negocios');

  const [statsData,    setStatsData]    = useState<DashboardStats | null>(null);
  const [negociosData, setNegociosData] = useState<NegociosData | null>(null);
  const [atendData,    setAtendData]    = useState<AtendimentosData | null>(null);

  const [loadingStats,    setLoadingStats]    = useState(true);
  const [loadingNegocios, setLoadingNegocios] = useState(true);
  const [loadingAtend,    setLoadingAtend]    = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/api/dashboard/stats').then(({ data }) => setStatsData(data)).finally(() => setLoadingStats(false)),
      api.get('/api/dashboard/negocios').then(({ data }) => setNegociosData(data)).finally(() => setLoadingNegocios(false)),
      api.get('/api/dashboard/atendimentos').then(({ data }) => setAtendData(data)).finally(() => setLoadingAtend(false)),
    ]).catch(() => setError(true));
  }, []);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
      {/* Top header bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {greeting}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl p-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  tab === id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-6 text-sm text-red-600 dark:text-red-400">
            Erro ao carregar dados. Verifique a conexão com o servidor.
          </div>
        )}

        {tab === 'negocios'     && <NegociosTab     data={negociosData} loading={loadingNegocios} />}
        {tab === 'atendimentos' && <AtendimentosTab data={atendData}    loading={loadingAtend}    />}
        {tab === 'atividades'   && <AtividadesTab   stats={statsData}   loading={loadingStats}    />}
      </div>
    </div>
  );
}
