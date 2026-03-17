import { Router, Request, Response } from 'express';
import { prisma, io } from '../index';
import { getCloudMediaUrl } from '../services/whatsapp-cloud.service';

const router = Router();

// ── GET  /webhooks/whatsapp  →  verificação do Meta ───────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const mode      = req.query['hub.mode']         as string;
  const token     = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge']    as string;

  if (mode !== 'subscribe') { res.status(400).send('Bad request'); return; }

  // Tenta encontrar canal com esse verifyToken
  const allChannels = await prisma.channelInstance.findMany({
    where: { type: { in: ['WHATSAPP_CLOUD', 'WHATSAPP_CLOUD_MANUAL'] } },
  });

  const matched = allChannels.find(ch => {
    try {
      const cfg = JSON.parse(ch.config);
      return cfg?.verifyToken === token;
    } catch { return false; }
  });

  // Também aceita token global de env
  const globalToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'xpay-verify-token';

  if (matched || token === globalToken) {
    res.status(200).send(challenge);
  } else {
    console.warn('[Cloud webhook] verify_token não reconhecido:', token);
    res.status(403).json({ error: 'Verification failed' });
  }
});

// ── POST /webhooks/whatsapp  →  recebe mensagens da Meta ─────────────────────
router.post('/', async (req: Request, res: Response) => {
  // Responde imediatamente — Meta exige resposta em < 20s
  res.status(200).json({ status: 'ok' });

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of (entry.changes || [])) {
        if (change.field !== 'messages') continue;

        const value         = change.value;
        const phoneNumberId = value.metadata?.phone_number_id as string;
        if (!phoneNumberId) continue;

        // Busca canal pelo phoneNumberId (dentro do config JSON)
        const allChannels = await prisma.channelInstance.findMany({
          where: { type: { in: ['WHATSAPP_CLOUD', 'WHATSAPP_CLOUD_MANUAL'] } },
        });
        const channel = allChannels.find(ch => {
          try { return JSON.parse(ch.config)?.phoneNumberId === phoneNumberId; }
          catch { return false; }
        });

        if (!channel) {
          console.warn(`[Cloud webhook] Canal não encontrado para phoneNumberId: ${phoneNumberId}`);
          continue;
        }

        const channelConfig = JSON.parse(channel.config || '{}');
        const accessToken: string = channelConfig.accessToken || process.env.WHATSAPP_CLOUD_TOKEN || '';

        // ── Status updates (leitura, entrega) ────────────────────────────────
        for (const statusUpdate of (value.statuses || [])) {
          console.log(`[Cloud webhook] status=${statusUpdate.status} msgId=${statusUpdate.id}`);
        }

        // ── Mensagens recebidas ───────────────────────────────────────────────
        for (const msg of (value.messages || [])) {
          const phone       = msg.from as string;
          const contactName = (value.contacts?.[0]?.profile?.name as string) || phone;

          // Extrai conteúdo por tipo
          let content  = '';
          let mediaUrl = '';
          let msgType  = 'TEXT';

          switch (msg.type) {
            case 'text':
              content = msg.text?.body || '';
              break;
            case 'image':
              msgType  = 'IMAGE';
              content  = msg.image?.caption || '';
              mediaUrl = msg.image?.id ? await getCloudMediaUrl(msg.image.id, accessToken) : '';
              break;
            case 'audio':
              msgType  = 'AUDIO';
              mediaUrl = msg.audio?.id ? await getCloudMediaUrl(msg.audio.id, accessToken) : '';
              break;
            case 'document':
              msgType  = 'DOCUMENT';
              content  = msg.document?.filename || '';
              mediaUrl = msg.document?.id ? await getCloudMediaUrl(msg.document.id, accessToken) : '';
              break;
            case 'video':
              msgType  = 'VIDEO';
              content  = msg.video?.caption || '';
              mediaUrl = msg.video?.id ? await getCloudMediaUrl(msg.video.id, accessToken) : '';
              break;
            case 'sticker':
              msgType  = 'STICKER';
              mediaUrl = msg.sticker?.id ? await getCloudMediaUrl(msg.sticker.id, accessToken) : '';
              break;
            case 'location':
              content = `📍 Localização: ${msg.location?.latitude}, ${msg.location?.longitude}`;
              break;
            default:
              content = `[${msg.type}]`;
          }

          // ── Lead: busca ou cria ─────────────────────────────────────────────
          let lead = await prisma.lead.findFirst({
            where: { companyId: channel.companyId, phone },
          });
          if (!lead) {
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
                description: `Lead criado via WhatsApp Cloud (${channel.name})`,
                metadata: JSON.stringify({ source: 'whatsapp_cloud', phone }),
              },
            });
          } else if (lead.name === lead.phone && contactName !== phone) {
            lead = await prisma.lead.update({
              where: { id: lead.id },
              data: { name: contactName },
            });
          }

          // ── Conversa: busca aberta ou cria ─────────────────────────────────
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

          // ── Salva mensagem ──────────────────────────────────────────────────
          const message = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              leadId: lead.id,
              direction: 'IN',
              type: msgType as 'TEXT',
              content: content || null,
              mediaUrl: mediaUrl || null,
              createdAt: new Date(parseInt(msg.timestamp) * 1000),
            },
          });

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date() },
          });

          // ── Emite via Socket.IO ─────────────────────────────────────────────
          if (isNewConversation) {
            const fullConv = await prisma.conversation.findUnique({
              where: { id: conversation.id },
              include: {
                lead: true,
                channelInstance: true,
                department: true,
                assignedUser: { select: { id: true, name: true, avatar: true } },
              },
            });
            io.to(channel.companyId).emit('new_conversation', { conversation: fullConv, message });
          } else {
            io.to(channel.companyId).emit('new_incoming_message', {
              conversationId: conversation.id,
              message,
              lead,
            });
          }
          io.to(`conv_${conversation.id}`).emit('new_message', message);

          console.log(`[Cloud webhook] Msg salva: lead=${lead.name} tipo=${msgType} conv=${conversation.id}`);
        }
      }
    }
  } catch (err) {
    console.error('[Cloud webhook] Erro:', err);
  }
});

export default router;
