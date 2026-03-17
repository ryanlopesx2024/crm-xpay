import { Router, Request, Response } from 'express';
import { prisma, io } from '../index';

const router = Router();

// Evolution API envia todos os eventos no mesmo endpoint
router.post('/', async (req: Request, res: Response) => {
  // Responde imediatamente para não timeout
  res.status(200).json({ status: 'ok' });

  try {
    const body = req.body;
    const event: string = body.event || '';
    const instanceName: string = body.instance || '';

    console.log(`[Evolution webhook] event=${event} instance=${instanceName}`);

    // ── CONNECTION UPDATE ──────────────────────────────────────────────────
    if (event === 'connection.update') {
      const state: string = body.data?.state || '';
      let newStatus = 'DISCONNECTED';
      if (state === 'open') newStatus = 'CONNECTED';
      else if (state === 'connecting') newStatus = 'CONNECTING';
      else if (state === 'close') newStatus = 'DISCONNECTED';

      const channel = await prisma.channelInstance.findFirst({
        where: { identifier: instanceName, type: 'WHATSAPP_EVOLUTION' },
      });
      if (channel) {
        await prisma.channelInstance.update({
          where: { id: channel.id },
          data: { status: newStatus },
        });
        io.to(channel.companyId).emit('channel_status_updated', {
          channelId: channel.id,
          status: newStatus,
        });
        console.log(`[Evolution webhook] channel ${instanceName} → ${newStatus}`);
      }
      return;
    }

    // ── MESSAGES UPSERT ────────────────────────────────────────────────────
    if (event !== 'messages.upsert') return;

    const data = body.data;
    if (!data?.key) return;
    // Ignora mensagens enviadas por nós
    if (data.key.fromMe) return;

    const phone = (data.key.remoteJid as string)
      ?.replace('@s.whatsapp.net', '')
      ?.replace('@g.us', '');
    if (!phone) return;

    // Busca o canal pelo identifier (nome da instância Evolution)
    const channel = await prisma.channelInstance.findFirst({
      where: { identifier: instanceName, type: 'WHATSAPP_EVOLUTION' },
    });
    if (!channel) {
      console.warn(`[Evolution webhook] Canal não encontrado para instância: ${instanceName}`);
      return;
    }

    // Extrai conteúdo da mensagem
    const content: string =
      data.message?.conversation ||
      data.message?.extendedTextMessage?.text ||
      data.message?.imageMessage?.caption ||
      data.message?.videoMessage?.caption ||
      data.message?.documentMessage?.title ||
      '';

    const mediaUrl: string =
      data.message?.imageMessage?.url ||
      data.message?.videoMessage?.url ||
      data.message?.audioMessage?.url ||
      data.message?.documentMessage?.url ||
      '';

    const msgType: string = data.message?.audioMessage ? 'AUDIO'
      : data.message?.imageMessage ? 'IMAGE'
      : data.message?.videoMessage ? 'VIDEO'
      : data.message?.documentMessage ? 'DOCUMENT'
      : data.message?.stickerMessage ? 'STICKER'
      : 'TEXT';

    const pushName: string = data.pushName || phone;

    // ── Lead: busca ou cria ───────────────────────────────────────────────
    let lead = await prisma.lead.findFirst({
      where: { companyId: channel.companyId, phone },
    });
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          companyId: channel.companyId,
          name: pushName,
          phone,
          countryCode: '+55',
        },
      });
    } else if (lead.name === lead.phone && pushName !== phone) {
      // Atualiza nome se era só o número
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: { name: pushName },
      });
    }

    // ── Conversa: busca aberta ou cria nova ───────────────────────────────
    let conversation = await prisma.conversation.findFirst({
      where: {
        leadId: lead.id,
        channelInstanceId: channel.id,
        status: { notIn: ['RESOLVED', 'CLOSED'] },
      },
    });

    const isNewConversation = !conversation;
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          channelInstanceId: channel.id,
          status: 'PENDING',
          lastMessageAt: new Date(),
        },
      });
    }

    // ── Salva mensagem ────────────────────────────────────────────────────
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        leadId: lead.id,
        direction: 'IN',
        type: msgType as 'TEXT',
        content: content || null,
        mediaUrl: mediaUrl || null,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        status: conversation.status === 'RESOLVED' ? 'PENDING' : conversation.status,
      },
    });

    // ── Busca conversa completa para emitir ao frontend ───────────────────
    const fullConversation = await prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: {
        lead: true,
        channelInstance: true,
        department: true,
        assignedUser: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Emite para a sala da empresa
    if (isNewConversation) {
      // Nova conversa → adiciona à lista
      io.to(channel.companyId).emit('new_conversation', {
        conversation: fullConversation,
        message,
      });
    } else {
      // Conversa existente → atualiza
      io.to(channel.companyId).emit('new_incoming_message', {
        conversationId: conversation.id,
        message,
        lead,
      });
    }

    // Emite para quem está dentro da conversa
    io.to(`conv_${conversation.id}`).emit('new_message', message);

    console.log(`[Evolution webhook] Msg salva: conv=${conversation.id} lead=${lead.name} tipo=${msgType}`);
  } catch (err) {
    console.error('[Evolution webhook] Erro:', err);
  }
});

export default router;
