import { prisma, io } from '../index';
import QRCode from 'qrcode';

interface BaileysInstance {
  sock: any;
  qr: string;
  status: string;
  reconnectToken: symbol;
}

const instances = new Map<string, BaileysInstance>();

// Baileys is ESM-only. TypeScript with module:commonjs compiles `await import()`
// to `require()`, which fails for ESM packages. Use Function() to emit a native
// import() call that Node.js handles correctly at runtime.
const dynamicImport = new Function('modulePath', 'return import(modulePath)') as
  (m: string) => Promise<typeof import('@whiskeysockets/baileys')>;

async function getBaileys() {
  return dynamicImport('@whiskeysockets/baileys');
}

// ── DB-backed auth state ──────────────────────────────────────────────────────

async function getChannelConfig(channelId: string): Promise<Record<string, any>> {
  const ch = await prisma.channelInstance.findUnique({ where: { id: channelId } });
  try { return JSON.parse(ch?.config || '{}'); } catch { return {}; }
}

async function saveAuthToDB(channelId: string, authData: Record<string, any> | null) {
  const config = await getChannelConfig(channelId);
  if (authData) {
    config.baileysAuth = authData;
  } else {
    delete config.baileysAuth;
  }
  await prisma.channelInstance.update({
    where: { id: channelId },
    data: { config: JSON.stringify(config) },
  });
}

async function useDatabaseAuthState(channelId: string) {
  const { initAuthCreds } = await getBaileys();
  const config = await getChannelConfig(channelId);
  const stored = config.baileysAuth || null;

  const creds = stored?.creds || initAuthCreds();
  const keysData: Record<string, Record<string, any>> = stored?.keys || {};

  const persistAll = async () => {
    await saveAuthToDB(channelId, { creds, keys: keysData });
  };

  const state = {
    creds,
    keys: {
      get: async (type: string, ids: string[]) => {
        const result: Record<string, any> = {};
        for (const id of ids) {
          const val = keysData[type]?.[id];
          if (val !== undefined) result[id] = val;
        }
        return result;
      },
      set: async (data: Record<string, Record<string, any>>) => {
        for (const [type, values] of Object.entries(data)) {
          if (!keysData[type]) keysData[type] = {};
          for (const [id, val] of Object.entries(values || {})) {
            if (val) keysData[type][id] = val;
            else delete keysData[type][id];
          }
        }
        await persistAll();
      },
    },
  };

  return { state, saveCreds: persistAll };
}

// ── Incoming message handler ──────────────────────────────────────────────────

async function handleIncomingMessage(channelId: string, rawMsg: any) {
  const channel = await prisma.channelInstance.findUnique({ where: { id: channelId } });
  if (!channel) return;

  const jid: string = rawMsg.key?.remoteJid || '';
  if (jid.endsWith('@g.us') || jid.endsWith('@broadcast')) return;

  const phone = jid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
  if (!phone) return;

  const msg = rawMsg.message || {};
  const pushName: string = rawMsg.pushName || phone;

  // Detect type + extract content
  let msgType = 'TEXT';
  let content = '';
  let mediaUrl: string | null = null;
  let mediaType: string | null = null;

  if (msg.conversation || msg.extendedTextMessage) {
    msgType = 'TEXT';
    content = msg.conversation || msg.extendedTextMessage?.text || '';
  } else if (msg.imageMessage) {
    msgType = 'IMAGE';
    content = msg.imageMessage.caption || '';
    mediaType = msg.imageMessage.mimetype || 'image/jpeg';
  } else if (msg.videoMessage) {
    msgType = 'VIDEO';
    content = msg.videoMessage.caption || '';
    mediaType = msg.videoMessage.mimetype || 'video/mp4';
  } else if (msg.audioMessage || msg.pttMessage) {
    msgType = 'AUDIO';
    mediaType = (msg.audioMessage || msg.pttMessage)?.mimetype || 'audio/ogg';
  } else if (msg.documentMessage) {
    msgType = 'DOCUMENT';
    content = msg.documentMessage.fileName || msg.documentMessage.title || '';
    mediaType = msg.documentMessage.mimetype || 'application/octet-stream';
  } else if (msg.stickerMessage) {
    msgType = 'STICKER';
    mediaType = msg.stickerMessage.mimetype || 'image/webp';
  } else if (msg.reactionMessage) {
    return; // ignore reactions
  }

  // Download media to base64
  if (msgType !== 'TEXT') {
    try {
      const { downloadMediaMessage } = await getBaileys();
      const inst = instances.get(channelId);
      const buffer = await downloadMediaMessage(
        rawMsg,
        'buffer',
        {},
        { logger: silentLogger, reuploadRequest: inst?.sock?.updateMediaMessage },
      ) as Buffer;
      if (buffer?.length) {
        mediaUrl = `data:${mediaType};base64,${buffer.toString('base64')}`;
      }
    } catch (e: any) {
      console.warn(`[Baileys] media download failed: ${e?.message}`);
    }
  }

  // Find or create lead
  let lead = await prisma.lead.findFirst({ where: { companyId: channel.companyId, phone } });
  if (!lead) {
    lead = await prisma.lead.create({
      data: { companyId: channel.companyId, name: pushName, phone, countryCode: '+55' },
    });
  } else if (lead.name === lead.phone && pushName !== phone) {
    lead = await prisma.lead.update({ where: { id: lead.id }, data: { name: pushName } });
  }

  // Find or create conversation
  let conversation = await prisma.conversation.findFirst({
    where: { leadId: lead.id, channelInstanceId: channel.id, status: { notIn: ['RESOLVED', 'CLOSED'] } },
  });
  const isNew = !conversation;
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { leadId: lead.id, channelInstanceId: channel.id, status: 'PENDING', lastMessageAt: new Date() },
    });
  }

  const savedMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      leadId: lead.id,
      direction: 'IN',
      type: msgType as any,
      content: content || null,
      mediaUrl,
      mediaType,
      isRead: false,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      status: conversation.status === 'RESOLVED' ? 'PENDING' : conversation.status,
    },
  });

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

  if (isNew) {
    io.to(channel.companyId).emit('new_conversation', { conversation: fullConversation, message: savedMessage });
  } else {
    io.to(channel.companyId).emit('new_incoming_message', { conversationId: conversation.id, message: savedMessage, lead });
  }
  io.to(`conv_${conversation.id}`).emit('new_message', savedMessage);

  console.log(`[Baileys] Msg salva: conv=${conversation.id} lead=${lead.name} tipo=${msgType}`);

  const { triggerAutomation } = await import('./automation.service');
  const { handleFunnelMessage } = await import('./funnel.service');
  const handledByFunnel = await handleFunnelMessage(lead, channel, content).catch(() => false);
  if (!handledByFunnel) {
    triggerAutomation(channel.companyId, 'MESSAGE_RECEIVED', lead.id, { content, msgType, channelId: channel.id }).catch(() => {});
  }
}

// ── Connection management ─────────────────────────────────────────────────────

function closeInstance(channelId: string) {
  const inst = instances.get(channelId);
  if (inst?.sock) {
    try { inst.sock.end?.(undefined); } catch {}
    try { inst.sock.ws?.close?.(); } catch {}
  }
  instances.delete(channelId);
}

const silentLogger = {
  level: 'silent',
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: console.error,
  fatal: console.error,
  child: () => silentLogger,
} as any;

export async function connect(channelId: string): Promise<void> {
  closeInstance(channelId);

  const { makeWASocket, DisconnectReason, Browsers } = await getBaileys();
  const { state, saveCreds } = await useDatabaseAuthState(channelId);

  const token = Symbol();
  const inst: BaileysInstance = { sock: null, qr: '', status: 'CONNECTING', reconnectToken: token };
  instances.set(channelId, inst);

  const sock = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    logger: silentLogger,
  });

  inst.sock = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }: any) => {
    try {
      const channel = await prisma.channelInstance.findUnique({ where: { id: channelId } });
      if (!channel) return;

      if (qr) {
        const qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
        inst.qr = qrDataUrl;
        inst.status = 'CONNECTING';
        io.to(channel.companyId).emit('channel_qr', { channelId, qr: qrDataUrl });
        await prisma.channelInstance.update({ where: { id: channelId }, data: { status: 'CONNECTING' } });
        console.log(`[Baileys] QR gerado para channel ${channelId}`);
      }

      if (connection === 'open') {
        inst.status = 'CONNECTED';
        inst.qr = '';
        await prisma.channelInstance.update({ where: { id: channelId }, data: { status: 'CONNECTED' } });
        io.to(channel.companyId).emit('channel_status_updated', { channelId, status: 'CONNECTED' });
        console.log(`[Baileys] channel ${channelId} (${channel.name}) conectado!`);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        inst.status = loggedOut ? 'DISCONNECTED' : 'CONNECTING';
        await prisma.channelInstance.update({ where: { id: channelId }, data: { status: inst.status } });
        io.to(channel.companyId).emit('channel_status_updated', { channelId, status: inst.status });

        if (loggedOut) {
          console.log(`[Baileys] channel ${channelId} deslogado.`);
          instances.delete(channelId);
          await saveAuthToDB(channelId, null);
        } else {
          console.log(`[Baileys] channel ${channelId} desconectado (reason=${statusCode}), reconectando em 5s…`);
          setTimeout(() => {
            const current = instances.get(channelId);
            if (current && current.reconnectToken === token) {
              connect(channelId).catch(console.error);
            }
          }, 5000);
        }
      }
    } catch (err) {
      console.error('[Baileys] connection.update error:', err);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }: any) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.key?.remoteJid || msg.key.fromMe) continue;
      handleIncomingMessage(channelId, msg).catch(console.error);
    }
  });
}

export function getQR(channelId: string): string {
  return instances.get(channelId)?.qr || '';
}

export function getStatus(channelId: string): string {
  return instances.get(channelId)?.status || 'DISCONNECTED';
}

// Disconnect socket but keep auth so it can reconnect later
export async function disconnect(channelId: string): Promise<void> {
  closeInstance(channelId);
  await prisma.channelInstance.update({ where: { id: channelId }, data: { status: 'DISCONNECTED' } });
}

// Full logout: removes auth state from DB
export async function logout(channelId: string): Promise<void> {
  const inst = instances.get(channelId);
  if (inst?.sock) {
    try { await inst.sock.logout(); } catch {}
  }
  closeInstance(channelId);
  await saveAuthToDB(channelId, null);
  await prisma.channelInstance.update({ where: { id: channelId }, data: { status: 'DISCONNECTED' } });
}

export async function sendText(channelId: string, phone: string, text: string): Promise<void> {
  const inst = instances.get(channelId);
  if (!inst?.sock) throw new Error(`Canal Baileys ${channelId} não está conectado`);
  const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
  await inst.sock.sendMessage(jid, { text });
}

export async function sendMedia(
  channelId: string,
  phone: string,
  url: string,
  type: 'image' | 'video' | 'document',
  filename: string,
  caption: string,
): Promise<void> {
  const inst = instances.get(channelId);
  if (!inst?.sock) throw new Error(`Canal Baileys ${channelId} não está conectado`);
  const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;

  let content: any;
  if (type === 'image') content = { image: { url }, caption };
  else if (type === 'video') content = { video: { url }, caption };
  else content = { document: { url }, fileName: filename, caption };

  await inst.sock.sendMessage(jid, content);
}

export async function sendAudio(channelId: string, phone: string, audioUrl: string): Promise<void> {
  const inst = instances.get(channelId);
  if (!inst?.sock) throw new Error(`Canal Baileys ${channelId} não está conectado`);
  const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
  await inst.sock.sendMessage(jid, { audio: { url: audioUrl }, ptt: true });
}

// Auto-reconnect all Baileys channels that have saved auth on server start
export async function initAll(): Promise<void> {
  const channels = await prisma.channelInstance.findMany({
    where: { type: 'WHATSAPP_BAILEYS' },
  });

  for (const ch of channels) {
    try {
      let cfg: any = {};
      try { cfg = JSON.parse(ch.config || '{}'); } catch {}
      if (cfg.baileysAuth?.creds) {
        console.log(`[Baileys] Auto-reconnect: ${ch.name} (${ch.id})`);
        connect(ch.id).catch(e => console.error(`[Baileys] initAll error for ${ch.id}:`, e));
        // Small stagger to avoid hammering WhatsApp servers
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (e) {
      console.error(`[Baileys] initAll: error for ${ch.id}:`, e);
    }
  }
}
