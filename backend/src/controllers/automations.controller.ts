import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

function parseAutomation(automation: Record<string, unknown>) {
  return {
    ...automation,
    trigger: typeof automation.trigger === 'string' ? JSON.parse(automation.trigger as string) : automation.trigger,
    flow: typeof automation.flow === 'string' ? JSON.parse(automation.flow as string) : automation.flow,
  };
}

export const listAutomations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const automations = await prisma.automation.findMany({
      where: { companyId: req.companyId },
      include: { _count: { select: { executions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(automations.map((a) => parseAutomation(a as unknown as Record<string, unknown>)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar automações' });
  }
};

export const createAutomation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, trigger } = req.body;
    const automation = await prisma.automation.create({
      data: {
        companyId: req.companyId!,
        name,
        trigger: JSON.stringify(trigger || {}),
        flow: JSON.stringify({ nodes: [], edges: [] }),
      },
    });
    res.status(201).json(parseAutomation(automation as unknown as Record<string, unknown>));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar automação' });
  }
};

export const updateAutomation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, trigger, flow } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (trigger !== undefined) data.trigger = JSON.stringify(trigger);
    if (flow !== undefined) data.flow = JSON.stringify(flow);

    const automation = await prisma.automation.update({
      where: { id },
      data,
    });
    res.json(parseAutomation(automation as unknown as Record<string, unknown>));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar automação' });
  }
};

export const toggleAutomation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.automation.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Automação não encontrada' });
      return;
    }
    const automation = await prisma.automation.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    res.json(parseAutomation(automation as unknown as Record<string, unknown>));
  } catch {
    res.status(500).json({ error: 'Erro ao alternar automação' });
  }
};

export const deleteAutomation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.automationExecution.deleteMany({ where: { automationId: id } });
    await prisma.leadHistory.updateMany({ where: { automationId: id }, data: { automationId: null } });
    await prisma.automation.delete({ where: { id } });
    res.json({ message: 'Automação deletada' });
  } catch {
    res.status(500).json({ error: 'Erro ao deletar automação' });
  }
};

export const executeAutomation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { leadId } = req.body;
    const automation = await prisma.automation.findUnique({ where: { id } });
    if (!automation) { res.status(404).json({ error: 'Automação não encontrada' }); return; }

    const execution = await prisma.automationExecution.create({
      data: {
        automationId: id,
        leadId,
        userId: req.userId,
        status: 'RUNNING',
      },
    });

    await prisma.leadHistory.create({
      data: {
        leadId,
        type: 'AUTOMATION_TRIGGERED',
        description: `Automação "${automation.name}" executada manualmente`,
        metadata: JSON.stringify({ automationId: id, executionId: execution.id }),
        automationId: id,
        userId: req.userId,
      },
    });

    // Mark execution as completed (actual execution logic would go here)
    await prisma.automationExecution.update({
      where: { id: execution.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    res.json({ message: 'Automação executada', executionId: execution.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao executar automação' });
  }
};
