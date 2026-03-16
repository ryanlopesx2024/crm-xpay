import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Clock, DollarSign, UserMinus } from 'lucide-react';
import api from '../services/api';

interface FunnelStage {
  name: string;
  count: number;
  color: string;
}

interface Objection {
  reason: string;
  count: number;
  percentage: number;
}

interface Performance {
  name: string;
  leadsAssigned: number;
  closedDeals: number;
  conversionRate: number;
  avgTicket: number;
}

interface TimelinePoint {
  date: string;
  created: number;
  closed: number;
}

interface Metrics {
  conversionRate: number;
  avgCloseDays: number;
  avgTicket: number;
  lostThisMonth: number;
}

export default function Analises() {
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [objections, setObjections] = useState<Objection[]>([]);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ conversionRate: 0, avgCloseDays: 0, avgTicket: 0, lostThisMonth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [funnelRes, objectionsRes, performanceRes, timelineRes, metricsRes] = await Promise.all([
          api.get('/api/analytics/funnel'),
          api.get('/api/analytics/objections'),
          api.get('/api/analytics/performance'),
          api.get('/api/analytics/timeline'),
          api.get('/api/analytics/metrics'),
        ]);
        setFunnel(funnelRes.data.stages || []);
        setObjections(objectionsRes.data || []);
        setPerformance(performanceRes.data || []);
        setTimeline(timelineRes.data || []);
        setMetrics(metricsRes.data || {});
      } catch {
        // Use sample data if API fails
        setFunnel([
          { name: 'Leads Novos', count: 150, color: '#6366f1' },
          { name: 'Primeiro Contato', count: 105, color: '#818cf8' },
          { name: 'Qualificados', count: 60, color: '#a78bfa' },
          { name: 'Proposta', count: 30, color: '#34d399' },
          { name: 'Fechados', count: 15, color: '#22c55e' },
        ]);
        setObjections([
          { reason: 'Preco alto', count: 34, percentage: 34 },
          { reason: 'Nao respondeu', count: 28, percentage: 28 },
          { reason: 'Comprou concorrente', count: 18, percentage: 18 },
          { reason: 'Sem interesse', count: 12, percentage: 12 },
          { reason: 'Outros', count: 8, percentage: 8 },
        ]);
        setMetrics({ conversionRate: 10, avgCloseDays: 7, avgTicket: 497, lostThisMonth: 12 });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const maxFunnelCount = funnel.length > 0 ? Math.max(...funnel.map(s => s.count)) : 1;

  // SVG Chart
  const chartWidth = 700;
  const chartHeight = 200;
  const padding = 40;
  const maxCreated = timeline.length > 0 ? Math.max(...timeline.map(t => t.created), 1) : 10;
  const maxClosed = timeline.length > 0 ? Math.max(...timeline.map(t => t.closed), 1) : 10;
  const maxY = Math.max(maxCreated, maxClosed, 1);
  const stepX = timeline.length > 1 ? (chartWidth - 2 * padding) / (timeline.length - 1) : 0;

  const createdLine = timeline.map((t, i) => {
    const x = padding + i * stepX;
    const y = chartHeight - padding - ((t.created / maxY) * (chartHeight - 2 * padding));
    return `${x},${y}`;
  }).join(' ');

  const closedLine = timeline.map((t, i) => {
    const x = padding + i * stepX;
    const y = chartHeight - padding - ((t.closed / maxY) * (chartHeight - 2 * padding));
    return `${x},${y}`;
  }).join(' ');

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <p className="text-slate-400">Carregando analises...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
            <BarChart2 size={20} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Analise de Conversao</h1>
            <p className="text-sm text-slate-500">Funil de vendas e metricas de infoprodutos X1</p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Taxa de Conversao', value: `${metrics.conversionRate}%`, icon: TrendingUp, color: 'brand' },
            { label: 'Tempo Medio (dias)', value: String(metrics.avgCloseDays), icon: Clock, color: 'blue' },
            { label: 'Ticket Medio', value: `R$ ${metrics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, icon: DollarSign, color: 'green' },
            { label: 'Perdidos este mes', value: String(metrics.lostThisMonth), icon: UserMinus, color: 'red' },
          ].map(card => (
            <div key={card.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-${card.color}-100 flex items-center justify-center`}>
                  <card.icon size={18} className={`text-${card.color}-600`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{card.value}</p>
                  <p className="text-xs text-slate-500">{card.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Funnel */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Funil de Conversao</h2>
            <div className="space-y-3">
              {funnel.map((stage, idx) => {
                const pct = maxFunnelCount > 0 ? Math.round((stage.count / maxFunnelCount) * 100) : 0;
                const convRate = idx > 0 && funnel[idx - 1].count > 0
                  ? Math.round((stage.count / funnel[idx - 1].count) * 100)
                  : 100;
                return (
                  <div key={stage.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{stage.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{stage.count}</span>
                        {idx > 0 && (
                          <span className="text-xs text-slate-400">({convRate}%)</span>
                        )}
                      </div>
                    </div>
                    <div className="h-6 bg-slate-100 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: stage.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Objections */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Top Objecoes (Motivos de Perda)</h2>
            <div className="space-y-3">
              {objections.map((obj) => (
                <div key={obj.reason}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{obj.reason}</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{obj.percentage}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400 rounded-full transition-all duration-500"
                      style={{ width: `${obj.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Chart */}
        {timeline.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Conversoes por Dia (ultimos 30 dias)</h2>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1 rounded bg-brand-500" />
                <span className="text-xs text-slate-500">Leads criados</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1 rounded bg-green-500" />
                <span className="text-xs text-slate-500">Fechados</span>
              </div>
            </div>
            <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                const y = chartHeight - padding - pct * (chartHeight - 2 * padding);
                return (
                  <g key={pct}>
                    <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                    <text x={padding - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                      {Math.round(maxY * pct)}
                    </text>
                  </g>
                );
              })}
              {/* Created line */}
              {createdLine && <polyline fill="none" stroke="#6366f1" strokeWidth="2" points={createdLine} />}
              {/* Closed line */}
              {closedLine && <polyline fill="none" stroke="#22c55e" strokeWidth="2" points={closedLine} />}
              {/* X-axis labels (every 5 days) */}
              {timeline.filter((_, i) => i % 5 === 0).map((t, i) => {
                const idx = timeline.indexOf(t);
                const x = padding + idx * stepX;
                return (
                  <text key={i} x={x} y={chartHeight - 10} textAnchor="middle" fontSize="9" fill="#94a3b8">
                    {t.date.slice(5)}
                  </text>
                );
              })}
            </svg>
          </div>
        )}

        {/* Performance Table */}
        {performance.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Performance por Atendente</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Atendente</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Leads</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Fechamentos</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Taxa %</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Ticket Medio</th>
                </tr>
              </thead>
              <tbody>
                {performance.map((p) => (
                  <tr key={p.name} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.leadsAssigned}</td>
                    <td className="px-4 py-3 text-slate-600">{p.closedDeals}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${p.conversionRate >= 20 ? 'bg-green-100 text-green-700' : p.conversionRate >= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {p.conversionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">R$ {p.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
