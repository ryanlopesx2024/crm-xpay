import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../index';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const router = Router();
router.use(authMiddleware);

// ── helpers ──────────────────────────────────────────────────────────────────
function monthKey(date: Date) {
  return format(date, 'MM/yy');
}

function last12Months() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, 11 - i);
    return { label: monthKey(d), start: startOfMonth(d), end: endOfMonth(d) };
  });
}

// ── /stats (existing) ────────────────────────────────────────────────────────
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalLeads, openConversations, monthDeals, wonRevenue, recentHistory, agentPerformance] = await Promise.all([
      prisma.lead.count({ where: { companyId } }),
      prisma.conversation.count({ where: { lead: { companyId }, status: 'OPEN' } }),
      prisma.deal.count({ where: { lead: { companyId }, createdAt: { gte: firstDayOfMonth } } }),
      prisma.deal.aggregate({
        where: { lead: { companyId }, status: 'WON', createdAt: { gte: firstDayOfMonth } },
        _sum: { value: true },
      }),
      prisma.leadHistory.findMany({
        where: { lead: { companyId } },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: { lead: true },
      }),
      prisma.deal.groupBy({
        by: ['assignedUserId'],
        where: { lead: { companyId }, createdAt: { gte: firstDayOfMonth }, assignedUserId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    const agentIds = agentPerformance.map((a) => a.assignedUserId).filter((id): id is string => id !== null);
    const agents = agentIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true } }) : [];
    const agentMap = new Map(agents.map((a) => [a.id, a.name]));
    const performance = agentPerformance.map((a) => ({ userId: a.assignedUserId, name: agentMap.get(a.assignedUserId!) || 'Desconhecido', deals: a._count.id }));
    const parsedHistory = recentHistory.map((h) => ({ ...h, metadata: typeof h.metadata === 'string' ? JSON.parse(h.metadata as string) : h.metadata }));

    res.json({ totalLeads, openConversations, monthDeals, wonRevenue: wonRevenue._sum.value || 0, recentHistory: parsedHistory, agentPerformance: performance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// ── /negocios ────────────────────────────────────────────────────────────────
router.get('/negocios', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const months = last12Months();
    const since = months[0].start;

    const deals = await prisma.deal.findMany({
      where: { lead: { companyId }, createdAt: { gte: since } },
      include: {
        assignedUser: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, category: true } },
      },
    });

    // Summary
    const total  = { count: deals.length, value: deals.reduce((s, d) => s + (d.value || 0), 0) };
    const won    = deals.filter((d) => d.status === 'WON');
    const lost   = deals.filter((d) => d.status === 'LOST');
    const open   = deals.filter((d) => d.status === 'OPEN');
    const wonSum  = { count: won.length,  value: won.reduce((s, d) => s + (d.value || 0), 0) };
    const lostSum = { count: lost.length, value: lost.reduce((s, d) => s + (d.value || 0), 0) };
    const openSum = { count: open.length, value: open.reduce((s, d) => s + (d.value || 0), 0) };

    // Monthly chart data
    const monthly = months.map(({ label, start, end }) => {
      const m = deals.filter((d) => d.createdAt >= start && d.createdAt <= end);
      const w = m.filter((d) => d.status === 'WON');
      return {
        month: label,
        total: m.length,
        ganhos: w.length,
        valor: w.reduce((s, d) => s + (d.value || 0), 0),
      };
    });

    // By agent
    const agentMap = new Map<string, { name: string; count: number; value: number; won: number }>();
    for (const d of deals) {
      if (!d.assignedUserId) continue;
      const key = d.assignedUserId;
      const entry = agentMap.get(key) || { name: d.assignedUser?.name || 'Sem atendente', count: 0, value: 0, won: 0 };
      entry.count++;
      entry.value += d.value || 0;
      if (d.status === 'WON') entry.won++;
      agentMap.set(key, entry);
    }
    const byAgent = Array.from(agentMap.entries())
      .map(([id, a]) => ({ id, ...a }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // By product
    const prodMap = new Map<string, { name: string; sku: string; count: number; value: number; won: number }>();
    for (const d of deals) {
      if (!d.productId) continue;
      const key = d.productId;
      const entry = prodMap.get(key) || { name: d.product?.name || 'Sem produto', category: d.product?.category || '', count: 0, value: 0, won: 0 };
      entry.count++;
      entry.value += d.value || 0;
      if (d.status === 'WON') entry.won++;
      prodMap.set(key, entry);
    }
    const byProduct = Array.from(prodMap.values()).sort((a, b) => b.count - a.count).slice(0, 10);

    res.json({ total, won: wonSum, lost: lostSum, open: openSum, monthly, byAgent, byProduct });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar dados de negócios' });
  }
});

// ── /atendimentos ────────────────────────────────────────────────────────────
router.get('/atendimentos', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.companyId!;
    const months = last12Months();
    const since = months[0].start;

    const [conversations, departments, users] = await Promise.all([
      prisma.conversation.findMany({
        where: { lead: { companyId }, createdAt: { gte: since } },
        select: { id: true, status: true, createdAt: true, departmentId: true, assignedUserId: true },
      }),
      prisma.department.findMany({ where: { companyId }, select: { id: true, name: true } }),
      prisma.user.findMany({ where: { companyId }, select: { id: true, name: true } }),
    ]);

    const deptMap = new Map(departments.map((d) => [d.id, d.name]));
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    // Summary
    const total     = conversations.length;
    const resolved  = conversations.filter((c) => c.status === 'RESOLVED').length;
    const open      = conversations.filter((c) => c.status === 'OPEN').length;
    const pending   = conversations.filter((c) => c.status === 'PENDING').length;

    // Monthly
    const monthly = months.map(({ label, start, end }) => {
      const m = conversations.filter((c) => c.createdAt >= start && c.createdAt <= end);
      return { month: label, total: m.length, finalizados: m.filter((c) => c.status === 'RESOLVED').length };
    });

    // By department
    const deptCount = new Map<string, number>();
    for (const c of conversations) {
      if (!c.departmentId) continue;
      deptCount.set(c.departmentId, (deptCount.get(c.departmentId) || 0) + 1);
    }
    const byDepartment = Array.from(deptCount.entries())
      .map(([id, count]) => ({ id, name: deptMap.get(id) || 'Sem depto', count }))
      .sort((a, b) => b.count - a.count);

    // By agent
    const agentCount = new Map<string, number>();
    for (const c of conversations) {
      if (!c.assignedUserId) continue;
      agentCount.set(c.assignedUserId, (agentCount.get(c.assignedUserId) || 0) + 1);
    }
    const byAgent = Array.from(agentCount.entries())
      .map(([id, count]) => ({ id, name: userMap.get(id) || 'Desconhecido', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({ total, resolved, open, pending, monthly, byDepartment, byAgent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar dados de atendimentos' });
  }
});

export default router;
