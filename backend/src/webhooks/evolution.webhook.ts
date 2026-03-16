import { Router, Request, Response } from 'express';
import { prisma, io } from '../index';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    res.status(200).json({ status: 'ok' });

    const body = req.body;
    const event = body.event;

    if (event !== 'messages.upsert') return;

    const data = body.data;
    if (!data?.key || data.key.fromMe) return;

    const instanceName = body.instance;
    const phone = data.key.remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', '');
    if (!phone) return;

    // Find channel instance
    const channel = await prisma.channelInstance.findFirst({
      where: { name: instanceName, type: 'WHATSAPP_UNOFFICIAL' },
    });

    if (!channel) return;

    const content = data.message?.conversation
      || data.message?.extendedTextMessage?.text
      || data.message?.imageMessage?.caption
      || '';

    const msgType = data.message?.audioMessage ? 'AUDIO'
      : data.message?.imageMessage ? 'IMAGE'
      : data.message?.documentMessage ? 'DOCUMENT'
      : data.message?.videoMessage ? 'VIDEO'
      : 'TEXT';

    // Find or create lead
    let lead = await prisma.lead.findFirst({
      where: { companyId: channel.companyId, phone },
    });

    if (!lead) {
      const pushName = data.pushName || phone;
      lead = await prisma.lead.create({
        data: {
          companyId: channel.companyId,
          name: pushName,
          phone,
          countryCode: '+55',
        },
      });
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        leadId: lead.id,
        channelInstanceId: channel.id,
        status: { notIn: ['RESOLVED'] },
      },
    });

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

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        leadId: lead.id,
        direction: 'IN',
        type: msgType as 'TEXT',
        content,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    io.to(channel.companyId).emit('new_incoming_message', {
      conversationId: conversation.id,
      message,
      lead,
    });
    io.to(`conv_${conversation.id}`).emit('new_message', message);
  } catch (err) {
    console.error('Evolution webhook error:', err);
  }
});

export default router;
