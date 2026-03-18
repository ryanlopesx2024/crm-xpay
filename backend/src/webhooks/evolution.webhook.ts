import { Router, Request, Response } from 'express';
import { prisma, io } from '../index';
import { triggerAutomation } from '../services/automation.service';

const router = Router();

// Log ALL incoming requests (debug)
router.use((req: Request, _res, next) => {
  console.log(`[Evolution webhook] ← ${req.method} ${req.path} body=${JSON.stringify(req.body).slice(0, 200)}`);
  next();
});

// ── GET /webhooks/evolution/ping  →  verifica se o webhook é acessível ────────
router.get('/ping', (_req: Request, res: Response) => {
  res.json({ ok: true, timestamp: new Date().toISOString(), service: 'evolution-webhook' });
});

// ── Handler principal (extrai evento + instância e processa) ──────────────────
async function handleEvolutionEvent(body: any): Promise<void> {
  const event: string = body.event || '';
  const instanceName: string = body.instance || '';

  console.log(`[Evolution webhook] event=${event} instance=${instanceName}`);

  // ── CONNECTION UPDATE ──────────────────────────────────────────────────
  if (event === 'connection.update' || event === 'CONNECTION_UPDATE') {
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

      // Quando conecta, re-registra o webhook com a URL correta (self-healing)
      if (newStatus === 'CONNECTED') {
        try {
          const { parseChannelConfig, getCredsFromConfig } = await import('../services/evolution.service');
          const axios = (await import('axios')).default;
          const cfg = parseChannelConfig(channel.config);
          const creds = getCredsFromConfig(cfg);
          const backendUrl = process.env.BACKEND_URL || `http://${new URL(creds.url).hostname}:${process.env.PORT || '3001'}`;
          const webhookUrl = `${backendUrl}/webhooks/evolution`;
          const api = axios.create({ baseURL: creds.url.replace(/\/$/, ''), headers: { apikey: creds.key }, timeout: 8000 });
          const payload = {
            enabled: true, url: webhookUrl,
            webhookByEvents: false, webhookBase64: false,
            events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'SEND_MESSAGE'],
          };
          try {
            await api.post(`/webhook/set/${instanceName}`, { webhook: payload });
          } catch {
            await api.post(`/webhook/set/${instanceName}`, payload);
          }
          console.log(`[Evolution webhook] auto re-registered webhook → ${webhookUrl}`);
        } catch (e: any) {
          console.warn('[Evolution webhook] auto re-register webhook falhou:', e?.message);
        }
      }
    }
    return;
  }

  // ── MESSAGES UPSERT ────────────────────────────────────────────────────
  if (event.toLowerCase().replace('_', '.') !== 'messages.upsert') return;

  // Log completo do payload para debug
  console.log('[Evolution webhook] FULL body:', JSON.stringify(body).slice(0, 800));

  // Evolution v2 pode enviar array de mensagens em body.data
  const rawData = body.data;
  const messages: any[] = Array.isArray(rawData) ? rawData : [rawData];

  for (const data of messages) {
    if (!data?.key) { console.log('[Evolution webhook] sem data.key, pulando'); continue; }
    // Ignora mensagens enviadas por nós
    if (data.key.fromMe) { console.log('[Evolution webhook] fromMe=true, pulando'); continue; }

    const phone = (data.key.remoteJid as string)
      ?.replace('@s.whatsapp.net', '')
      ?.replace('@g.us', '');
    if (!phone) continue;

    // Busca o canal pelo identifier (exact first, then case-insensitive fallback)
    let channel = await prisma.channelInstance.findFirst({
      where: { type: 'WHATSAPP_EVOLUTION', identifier: instanceName },
    });
    if (!channel) {
      const all = await prisma.channelInstance.findMany({ where: { type: 'WHATSAPP_EVOLUTION' } });
      channel = all.find(c => c.identifier.toLowerCase() === instanceName.toLowerCase()) || null;
    }
    if (!channel) {
      // Tenta listar todos os canais para debug
      const allChannels = await prisma.channelInstance.findMany({ where: { type: 'WHATSAPP_EVOLUTION' }, select: { identifier: true, id: true } });
      console.warn(`[Evolution webhook] Canal não encontrado para instância: "${instanceName}". Canais cadastrados:`, JSON.stringify(allChannels));
      continue;
    }

    // Extrai conteúdo da mensagem (Evolution v1 e v2)
    const msg = data.message || data.Message || {};
    const content: string =
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.imageMessage?.caption ||
      msg.videoMessage?.caption ||
      msg.documentMessage?.title ||
      msg.buttonsResponseMessage?.selectedDisplayText ||
      msg.listResponseMessage?.title ||
      data.body ||          // alguns eventos colocam direto em body
      data.text ||
      '';

    console.log('[Evolution webhook] content extraído:', JSON.stringify(content));

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
    const savedMessage = await prisma.message.create({
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
        lead: { include: { tags: { include: { tag: true } } } },
        channelInstance: true,
        department: true,
        assignedUser: { select: { id: true, name: true, avatar: true, status: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (isNewConversation) {
      io.to(channel.companyId).emit('new_conversation', {
        conversation: fullConversation,
        message: savedMessage,
      });
    } else {
      io.to(channel.companyId).emit('new_incoming_message', {
        conversationId: conversation.id,
        message: savedMessage,
        lead,
      });
    }

    // Emite para quem está dentro da conversa aberta
    io.to(`conv_${conversation.id}`).emit('new_message', savedMessage);

    console.log(`[Evolution webhook] Msg salva: conv=${conversation.id} lead=${lead.name} tipo=${msgType}`);

    // Fire MESSAGE_RECEIVED automation (non-blocking)
    triggerAutomation(channel.companyId, 'MESSAGE_RECEIVED', lead.id, { content, msgType }).catch(() => {});
  }
}

// POST /webhooks/evolution  (byEvents: false — payload único com body.event)
router.post('/', async (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
  try { await handleEvolutionEvent(req.body); } catch (err) {
    console.error('[Evolution webhook] Erro:', err);
  }
});

// POST /webhooks/evolution/:EVENT_NAME  (byEvents: true — cada evento tem sua URL)
router.post('/:eventName', async (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
  const body = { ...req.body, event: req.params.eventName.toLowerCase().replace('_', '.') };
  try { await handleEvolutionEvent(body); } catch (err) {
    console.error('[Evolution webhook] Erro (byEvent):', err);
  }
});

export default router;
