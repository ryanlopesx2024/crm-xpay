import { Response } from 'express';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

export const createConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { leadId, channelInstanceId } = req.body;
    if (!leadId) {
      res.status(400).json({ error: 'leadId é obrigatório' });
      return;
    }

    // Verify the lead belongs to this company
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, companyId: req.companyId! },
    });
    if (!lead) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }

    // Find existing open/pending conversation
    const existing = await prisma.conversation.findFirst({
      where: {
        leadId,
        status: { notIn: ['RESOLVED'] },
        ...(channelInstanceId ? { channelInstanceId } : {}),
      },
      include: {
        lead: { include: { tags: { include: { tag: true } } } },
        assignedUser: { select: { id: true, name: true, avatar: true, status: true } },
        department: true,
        channelInstance: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (existing) {
      res.json(existing);
      return;
    }

    // Pick first available channel for this company if none specified
    let resolvedChannelId = channelInstanceId || null;
    if (!resolvedChannelId) {
      const ch = await prisma.channelInstance.findFirst({
        where: { companyId: req.companyId!, status: 'CONNECTED' },
      });
      resolvedChannelId = ch?.id || null;
    }

    const conversation = await prisma.conversation.create({
      data: {
        leadId,
        channelInstanceId: resolvedChannelId,
        status: 'OPEN',
        lastMessageAt: new Date(),
      },
      include: {
        lead: { include: { tags: { include: { tag: true } } } },
        assignedUser: { select: { id: true, name: true, avatar: true, status: true } },
        department: true,
        channelInstance: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    res.status(201).json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar conversa' });
  }
};

export const listConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, departmentId, assignedUserId, search, leadId } = req.query;

    // Sempre filtra pela empresa do usuário autenticado
    const where: Record<string, unknown> = {
      lead: { companyId: req.companyId! },
    };

    if (status) where.status = status as string;
    if (departmentId) where.departmentId = departmentId as string;
    if (assignedUserId) where.assignedUserId = assignedUserId as string;
    if (leadId) where.leadId = leadId as string;
    if (search) {
      where.lead = {
        companyId: req.companyId!,
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { phone: { contains: search as string } },
        ],
      };
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        lead: { include: { tags: { include: { tag: true } } } },
        assignedUser: { select: { id: true, name: true, avatar: true, status: true } },
        department: true,
        channelInstance: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar conversas' });
  }
};

export const getConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        lead: {
          include: {
            tags: { include: { tag: true } },
            deals: { include: { stage: true, pipeline: true } },
            history: { orderBy: { createdAt: 'desc' }, take: 20 },
          },
        },
        assignedUser: { select: { id: true, name: true, avatar: true } },
        department: true,
        channelInstance: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' });
      return;
    }

    res.json(conversation);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar conversa' });
  }
};

export const assignConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const conversation = await prisma.conversation.update({
      where: { id },
      data: { assignedUserId: userId, status: 'OPEN' },
      include: {
        assignedUser: { select: { id: true, name: true, avatar: true } },
        lead: true,
      },
    });

    await prisma.leadHistory.create({
      data: {
        leadId: conversation.leadId,
        type: 'CONVERSATION_ASSIGNED',
        description: `Conversa atribuída para ${conversation.assignedUser?.name}`,
        metadata: JSON.stringify({ conversationId: id, userId }),
        userId: req.userId,
      },
    });

    io.to(req.companyId!).emit('conversation_assigned', conversation);
    res.json(conversation);
  } catch {
    res.status(500).json({ error: 'Erro ao atribuir conversa' });
  }
};

export const moveDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { departmentId } = req.body;
    const conversation = await prisma.conversation.update({
      where: { id },
      data: { departmentId, assignedUserId: null, status: 'PENDING' },
      include: { department: true },
    });
    io.to(req.companyId!).emit('conversation_moved', conversation);
    res.json(conversation);
  } catch {
    res.status(500).json({ error: 'Erro ao mover departamento' });
  }
};

export const finishConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const conversation = await prisma.conversation.update({
      where: { id },
      data: { status: 'RESOLVED' },
    });

    await prisma.leadHistory.create({
      data: {
        leadId: conversation.leadId,
        type: 'CONVERSATION_RESOLVED',
        description: 'Conversa finalizada',
        metadata: JSON.stringify({ conversationId: id }),
        userId: req.userId,
      },
    });

    io.to(req.companyId!).emit('conversation_finished', { conversationId: id });
    res.json(conversation);
  } catch {
    res.status(500).json({ error: 'Erro ao finalizar conversa' });
  }
};
