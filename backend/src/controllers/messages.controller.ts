import { Response } from 'express';
import { prisma, io } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendEvolutionMessage, sendEvolutionMedia, sendEvolutionAudio,
  parseChannelConfig, getCredsFromConfig,
} from '../services/evolution.service';
import { sendCloudTextMessage, getCloudCredsFromConfig } from '../services/whatsapp-cloud.service';

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

    // Envia via API do canal (non-blocking, após resposta)
    const ch = conversation.channelInstance;
    const lead = conversation.lead;
    console.log('[sendMessage] ch.type=%s ch.identifier=%s lead.phone=%s type=%s', ch?.type, ch?.identifier, lead?.phone, type);

    if (ch && lead?.phone) {
      const phone = lead.phone;
      if (ch.type === 'WHATSAPP_EVOLUTION') {
        const cfg = parseChannelConfig(ch.config);
        const creds = getCredsFromConfig(cfg);
        console.log('[sendMessage] Evolution url=%s key=%s type=%s', creds.url, creds.key ? '***' : 'EMPTY', type);
        if (!creds.url || !creds.key) {
          console.warn('[sendMessage] Evolution: URL ou KEY vazia, não enviando');
        } else if ((type === 'TEXT' || !type) && content) {
          sendEvolutionMessage(ch.identifier, phone, content, creds)
            .catch((e) => console.error('[sendMessage] Evolution text error:', e?.response?.data || e.message));
        } else if (type === 'AUDIO' && mediaUrl) {
          sendEvolutionAudio(ch.identifier, phone, mediaUrl, creds)
            .catch((e) => console.error('[sendMessage] Evolution audio error:', e?.message));
        } else if (type === 'IMAGE' && mediaUrl) {
          sendEvolutionMedia(ch.identifier, phone, mediaUrl, 'image', content || 'imagem', content || '', creds)
            .catch((e) => console.error('[sendMessage] Evolution image error:', e?.message));
        } else if (type === 'VIDEO' && mediaUrl) {
          sendEvolutionMedia(ch.identifier, phone, mediaUrl, 'video', content || 'video', content || '', creds)
            .catch((e) => console.error('[sendMessage] Evolution video error:', e?.message));
        } else if (type === 'DOCUMENT' && mediaUrl) {
          sendEvolutionMedia(ch.identifier, phone, mediaUrl, 'document', content || 'arquivo', content || '', creds)
            .catch((e) => console.error('[sendMessage] Evolution document error:', e?.message));
        } else if (type === 'STICKER' && mediaUrl) {
          sendEvolutionMedia(ch.identifier, phone, mediaUrl, 'image', 'sticker', '', creds)
            .catch((e) => console.error('[sendMessage] Evolution sticker error:', e?.message));
        }
      } else if (ch.type === 'WHATSAPP_CLOUD' || ch.type === 'WHATSAPP_CLOUD_MANUAL') {
        if ((type === 'TEXT' || !type) && content) {
          const cfg = JSON.parse(ch.config || '{}');
          const creds = getCloudCredsFromConfig(cfg);
          if (creds.phoneNumberId && creds.accessToken) {
            sendCloudTextMessage(phone, content, creds)
              .catch((e) => console.error('[sendMessage] Cloud API error:', e.message));
          }
        }
      } else {
        console.warn('[sendMessage] Canal desconhecido: %s', ch?.type);
      }
    } else {
      console.warn('[sendMessage] Sem canal ou telefone: ch=%s phone=%s', !!ch, lead?.phone);
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
