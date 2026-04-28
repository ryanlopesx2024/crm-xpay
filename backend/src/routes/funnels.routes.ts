import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../index';
import { startFunnel } from '../services/funnel.service';

const router = Router();
router.use(authMiddleware);

// ── List funnels ──────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const funnels = await prisma.funnel.findMany({
    where: { companyId: req.companyId! },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, active: true, createdAt: true },
  });
  res.json(funnels);
});

// ── Import funnel from JSON ───────────────────────────────────────────────
router.post('/import', async (req: AuthRequest, res: Response): Promise<void> => {
  const { jsonData } = req.body;
  if (!jsonData) { res.status(400).json({ error: 'jsonData obrigatório' }); return; }

  let parsed: any;
  try { parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData; }
  catch { res.status(400).json({ error: 'JSON inválido' }); return; }

  const funnel = await prisma.funnel.create({
    data: {
      companyId: req.companyId!,
      name: parsed.name || 'Funil importado',
      jsonData: JSON.stringify(parsed),
      active: true,
    },
  });

  res.json(funnel);
});

// ── Toggle active ─────────────────────────────────────────────────────────
router.patch('/:id/toggle', async (req: AuthRequest, res: Response): Promise<void> => {
  const funnel = await prisma.funnel.findFirst({ where: { id: req.params.id, companyId: req.companyId! } });
  if (!funnel) { res.status(404).json({ error: 'Não encontrado' }); return; }

  const updated = await prisma.funnel.update({
    where: { id: funnel.id },
    data: { active: !funnel.active },
  });
  res.json(updated);
});

// ── Delete funnel ─────────────────────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const funnel = await prisma.funnel.findFirst({ where: { id: req.params.id, companyId: req.companyId! } });
  if (!funnel) { res.status(404).json({ error: 'Não encontrado' }); return; }

  await prisma.funnelExecution.deleteMany({ where: { funnelId: funnel.id } });
  await prisma.funnel.delete({ where: { id: funnel.id } });
  res.json({ ok: true });
});

// ── Trigger funnel for a lead ─────────────────────────────────────────────
router.post('/:id/trigger', async (req: AuthRequest, res: Response): Promise<void> => {
  const { leadId, channelId } = req.body;
  if (!leadId || !channelId) {
    res.status(400).json({ error: 'leadId e channelId obrigatórios' });
    return;
  }

  const funnel = await prisma.funnel.findFirst({ where: { id: req.params.id, companyId: req.companyId! } });
  if (!funnel) { res.status(404).json({ error: 'Funil não encontrado' }); return; }

  const lead = await prisma.lead.findFirst({ where: { id: leadId, companyId: req.companyId! } });
  if (!lead) { res.status(404).json({ error: 'Lead não encontrado' }); return; }

  const channel = await prisma.channelInstance.findFirst({ where: { id: channelId, companyId: req.companyId! } });
  if (!channel) { res.status(404).json({ error: 'Canal não encontrado' }); return; }

  startFunnel(funnel.id, lead, channel).catch(() => {});
  res.json({ ok: true, message: 'Funil iniciado' });
});

// ── List executions ───────────────────────────────────────────────────────
router.get('/:id/executions', async (req: AuthRequest, res: Response): Promise<void> => {
  const funnel = await prisma.funnel.findFirst({ where: { id: req.params.id, companyId: req.companyId! } });
  if (!funnel) { res.status(404).json({ error: 'Não encontrado' }); return; }

  const executions = await prisma.funnelExecution.findMany({
    where: { funnelId: funnel.id },
    orderBy: { startedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      leadId: true,
      currentBlockId: true,
      waitingInput: true,
      status: true,
      startedAt: true,
      completedAt: true,
    },
  });
  res.json(executions);
});

// ── Get funnel JSON ───────────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const funnel = await prisma.funnel.findFirst({ where: { id: req.params.id, companyId: req.companyId! } });
  if (!funnel) { res.status(404).json({ error: 'Não encontrado' }); return; }

  let parsed: any = {};
  try { parsed = JSON.parse(funnel.jsonData); } catch { /* */ }
  res.json({ ...funnel, blocks: parsed.blocks || [], blockCount: (parsed.blocks || []).length });
});

export default router;
