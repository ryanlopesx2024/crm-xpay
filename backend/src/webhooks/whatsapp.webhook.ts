import { Router, Request, Response } from 'express';
import { prisma, io } from '../index';

const router = Router();

// Meta verification
router.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === (process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'xpay-verify-token')) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Verification failed' });
  }
});

// Receive messages
router.post('/', async (req: Request, res: Response) => {
  try {
    res.status(200).json({ status: 'ok' });

    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;

        // Find channel instance
        // SQLite stores config as string; filter in JS
        const allChannels = await prisma.channelInstance.findMany({
          where: { type: 'WHATSAPP_OFFICIAL' },
        });
        const channel = allChannels.find((ch) => {
          try {
            const cfg = typeof ch.config === 'string' ? JSON.parse(ch.config) : ch.config;
            return cfg?.phoneNumberId === phoneNumberId;
          } catch { return false; }
        });

        if (!channel) continue;

        for (const msg of value.messages || []) {
          const phone = msg.from;
          const content = msg.text?.body || msg.caption || '';
          const type = msg.type?.toUpperCase() || 'TEXT';

          // Find or create lead
          let lead = await prisma.lead.findFirst({
            where: { companyId: channel.companyId, phone },
          });

          if (!lead) {
            const contactName = value.contacts?.[0]?.profile?.name || phone;
            lead = await prisma.lead.create({
              data: {
                companyId: channel.companyId,
                name: contactName,
                phone,
                countryCode: '+55',
              },
            });
            await prisma.leadHistory.create({
              data: {
                leadId: lead.id,
                type: 'LEAD_CREATED',
                description: 'Lead criado via WhatsApp',
                metadata: JSON.stringify({ source: 'whatsapp', phone }),
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

          // Save message
          const message = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              leadId: lead.id,
              direction: 'IN',
              type: type as 'TEXT',
              content,
              mediaUrl: msg.image?.id || msg.audio?.id || msg.document?.id,
              createdAt: new Date(parseInt(msg.timestamp) * 1000),
            },
          });

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date() },
          });

          // Emit socket events
          io.to(channel.companyId).emit('new_incoming_message', {
            conversationId: conversation.id,
            message,
            lead,
          });
          io.to(`conv_${conversation.id}`).emit('new_message', message);
        }
      }
    }
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
  }
});

export default router;
