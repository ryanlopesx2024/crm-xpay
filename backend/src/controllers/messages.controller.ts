import { Response } from 'express';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendEvolutionMessage } from '../services/evolution.service';

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversationId, content, type, mediaUrl, mediaType, duration } = req.body;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { channelInstance: true, lead: true },
    });
    if (!conversation) {
      res.status(404).json({ error: 'Conversa não encontrada' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        leadId: conversation.leadId,
        userId: req.userId,
        direction: 'OUT',
        type: type || 'TEXT',
        content,
        mediaUrl,
        mediaType,
        duration,
        isRead: true,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    io.to(`conv_${conversationId}`).emit('new_message', message);
    io.to(req.companyId!).emit('conversation_updated', { conversationId, lastMessage: message });

    res.status(201).json(message);

    // Forward to WhatsApp via Evolution API (after response, non-blocking)
    const ch = conversation.channelInstance;
    const lead = conversation.lead;
    if (ch?.type === 'WHATSAPP_UNOFFICIAL' && lead?.phone && (type === 'TEXT' || !type) && content) {
      sendEvolutionMessage(ch.identifier, lead.phone, content).catch((err) =>
        console.error('Evolution send error:', err.message)
      );
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
};

export const listMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: parseInt(limit as string),
    });

    // Mark incoming messages as read
    await prisma.message.updateMany({
      where: { conversationId, direction: 'IN', isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Erro ao listar mensagens' });
  }
};
