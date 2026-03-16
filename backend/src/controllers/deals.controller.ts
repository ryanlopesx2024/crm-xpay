import { Response } from 'express';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

export const listDeals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pipelineId } = req.query;
    const where: Record<string, unknown> = {};
    if (pipelineId) where.pipelineId = pipelineId as string;

    const deals = await prisma.deal.findMany({
      where,
      include: {
        lead: {
          include: {
            tags: { include: { tag: true } },
          },
        },
        stage: true,
        product: true,
        assignedUser: { select: { id: true, name: true, avatar: true } },
        lostReason: true,
        activities: {
          include: { type: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(deals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar deals' });
  }
};

export const getDeal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        lead: {
          include: {
            tags: { include: { tag: true } },
            history: { orderBy: { createdAt: 'desc' }, take: 20 },
            deals: { include: { stage: true, pipeline: true }, orderBy: { createdAt: 'desc' } },
          },
        },
        stage: true,
        pipeline: { include: { stages: { orderBy: { order: 'asc' } } } },
        product: true,
        assignedUser: { select: { id: true, name: true, avatar: true } },
        lostReason: true,
        activities: {
          include: { type: true, assignedUser: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!deal) {
      res.status(404).json({ error: 'Deal nao encontrado' });
      return;
    }
    res.json(deal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar deal' });
  }
};

export const createDeal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { leadId, pipelineId, stageId, productId, value, assignedUserId } = req.body;
    const deal = await prisma.deal.create({
      data: {
        leadId,
        pipelineId,
        stageId,
        productId,
        value: value || 0,
        assignedUserId,
        status: 'OPEN',
      },
      include: {
        lead: { include: { tags: { include: { tag: true } } } },
        stage: true,
        product: true,
        assignedUser: { select: { id: true, name: true, avatar: true } },
      },
    });

    await prisma.leadHistory.create({
      data: {
        leadId,
        type: 'DEAL_CREATED',
        description: 'Negócio criado no pipeline',
        metadata: JSON.stringify({ dealId: deal.id, pipelineId }),
        userId: req.userId,
      },
    });

    io.to(req.companyId!).emit('deal_created', deal);
    res.status(201).json(deal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar deal' });
  }
};

export const updateDeal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { stageId, assignedUserId, notes, value, quantity, discount, surcharge, freight, productId } = req.body;
    const data: Record<string, any> = {};
    if (stageId !== undefined) data.stageId = stageId;
    if (assignedUserId !== undefined) data.assignedUserId = assignedUserId;
    if (notes !== undefined) data.notes = notes;
    if (value !== undefined) data.value = value;
    if (quantity !== undefined) data.quantity = quantity;
    if (discount !== undefined) data.discount = discount;
    if (surcharge !== undefined) data.surcharge = surcharge;
    if (freight !== undefined) data.freight = freight;
    if ('productId' in req.body) {
      data.productId = productId ?? null;
    }
    const deal = await prisma.deal.update({
      where: { id },
      data,
      include: {
        lead: { include: { tags: { include: { tag: true } } } },
        stage: true,
        product: true,
        assignedUser: { select: { id: true, name: true, avatar: true } },
      },
    });
    io.to(req.companyId!).emit('deal_updated', deal);
    res.json(deal);
  } catch (err) {
    console.error('updateDeal error:', err);
    res.status(500).json({ error: 'Erro ao atualizar deal' });
  }
};

export const moveDealStage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { stageId } = req.body;
    const deal = await prisma.deal.update({
      where: { id },
      data: { stageId },
      include: {
        lead: true,
        stage: true,
        assignedUser: { select: { id: true, name: true } },
      },
    });

    await prisma.leadHistory.create({
      data: {
        leadId: deal.leadId,
        type: 'DEAL_STAGE_CHANGED',
        description: `Negócio movido para etapa: ${deal.stage.name}`,
        metadata: JSON.stringify({ dealId: id, stageId }),
        userId: req.userId,
      },
    });

    io.to(req.companyId!).emit('deal_moved', { dealId: id, stageId, deal });
    res.json(deal);
  } catch {
    res.status(500).json({ error: 'Erro ao mover deal' });
  }
};

export const deleteDeal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.activity.deleteMany({ where: { dealId: id } });
    await prisma.deal.delete({ where: { id } });
    io.to(req.companyId!).emit('deal_deleted', { dealId: id });
    res.json({ message: 'Deal deletado' });
  } catch {
    res.status(500).json({ error: 'Erro ao deletar deal' });
  }
};

export const wonDeal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deal = await prisma.deal.update({
      where: { id },
      data: { status: 'WON' },
      include: {
        lead: { include: { tags: { include: { tag: true } } } },
        stage: true,
        product: true,
        assignedUser: { select: { id: true, name: true, avatar: true } },
      },
    });
    await prisma.leadHistory.create({
      data: {
        leadId: deal.leadId,
        type: 'DEAL_WON',
        description: `Negocio ganho! Valor: R$ ${(deal.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        metadata: JSON.stringify({ dealId: id }),
        userId: req.userId,
      },
    });
    io.to(req.companyId!).emit('deal_updated', deal);
    res.json(deal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao marcar negocio como ganho' });
  }
};

export const lostDeal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { lostReasonId } = req.body;
    const deal = await prisma.deal.update({
      where: { id },
      data: { status: 'LOST', lostReasonId: lostReasonId || null },
      include: {
        lead: { include: { tags: { include: { tag: true } } } },
        stage: true,
        product: true,
        lostReason: true,
        assignedUser: { select: { id: true, name: true, avatar: true } },
      },
    });
    await prisma.leadHistory.create({
      data: {
        leadId: deal.leadId,
        type: 'DEAL_LOST',
        description: `Negocio perdido${deal.lostReason ? ': ' + deal.lostReason.name : ''}`,
        metadata: JSON.stringify({ dealId: id, lostReasonId }),
        userId: req.userId,
      },
    });
    io.to(req.companyId!).emit('deal_updated', deal);
    res.json(deal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao marcar negocio como perdido' });
  }
};

export const reopenDeal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deal = await prisma.deal.update({
      where: { id },
      data: { status: 'OPEN', lostReasonId: null },
      include: {
        lead: { include: { tags: { include: { tag: true } } } },
        stage: true,
        product: true,
        assignedUser: { select: { id: true, name: true, avatar: true } },
      },
    });
    io.to(req.companyId!).emit('deal_updated', deal);
    res.json(deal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao reabrir negocio' });
  }
};

export const createDealActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: dealId } = req.params;
    const { typeId, title, description, dueDate } = req.body;
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) { res.status(404).json({ error: 'Negocio nao encontrado' }); return; }
    const activity = await prisma.activity.create({
      data: {
        dealId,
        leadId: deal.leadId,
        typeId,
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedUserId: req.user?.id || null,
      },
      include: { type: true, assignedUser: { select: { id: true, name: true } } },
    });
    res.status(201).json(activity);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar atividade' });
  }
};
