import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { listChannels, createChannel, updateChannel } from '../controllers/config.controller';
import { prisma } from '../index';
import {
  parseChannelConfig, getCredsFromConfig,
  createEvolutionInstance, getEvolutionQRCode,
  getEvolutionStatus, disconnectEvolutionInstance, deleteEvolutionInstance,
} from '../services/evolution.service';

const router = Router();
router.use(authMiddleware);

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.get('/',      listChannels);
router.post('/',     createChannel);
router.put('/:id',   updateChannel);
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const channel = await prisma.channelInstance.findFirst({
      where: { id: req.params.id, companyId: req.companyId! },
    });
    if (!channel) { res.status(404).json({ error: 'Não encontrado' }); return; }

    // If Evolution, delete instance on the API too
    if (channel.type === 'WHATSAPP_EVOLUTION') {
      const cfg = parseChannelConfig(channel.config);
      const creds = getCredsFromConfig(cfg);
      if (creds.url && creds.key) {
        await deleteEvolutionInstance(channel.identifier, creds);
      }
    }

    await prisma.channelInstance.delete({ where: { id: channel.id } });
    res.json({ message: 'Deletado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar' });
  }
});

// ── POST /api/channels/:id/connect  →  cria instância e retorna QR ────────────
router.post('/:id/connect', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const channel = await prisma.channelInstance.findFirst({
      where: { id: req.params.id, companyId: req.companyId! },
    });
    if (!channel) { res.status(404).json({ error: 'Não encontrado' }); return; }

    const cfg = parseChannelConfig(channel.config);
    const creds = getCredsFromConfig(cfg);

    if (!creds.url || !creds.key) {
      res.status(400).json({ error: 'URL da instância e Chave de API são obrigatórios' });
      return;
    }

    const webhookUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/webhooks/evolution`;
    const result = await createEvolutionInstance(channel.identifier, creds, webhookUrl);

    // Update status to CONNECTING
    await prisma.channelInstance.update({
      where: { id: channel.id },
      data: { status: 'CONNECTING' },
    });

    res.json({ qrcode: result.qrcode, status: 'CONNECTING' });
  } catch (err: any) {
    const status = err?.response?.status;
    const detail = err?.response?.data ? JSON.stringify(err.response.data) : err?.message;
    console.error('[channels/connect] status=%s detail=%s', status, detail);

    // Instance already exists → just fetch the QR code
    if (status === 403 || err?.message?.includes('already')) {
      try {
        const channel = await prisma.channelInstance.findFirst({ where: { id: req.params.id } });
        if (channel) {
          const cfg = parseChannelConfig(channel.config);
          const creds = getCredsFromConfig(cfg);
          const qr = await getEvolutionQRCode(channel.identifier, creds);
          res.json({ qrcode: qr, status: 'CONNECTING' });
          return;
        }
      } catch (inner: any) {
        console.error('[channels/connect] fallback QR error', inner?.message);
      }
    }
    res.status(500).json({ error: `Erro ao conectar: ${detail || 'verifique URL e chave da API'}` });
  }
});

// ── GET /api/channels/:id/qrcode  →  busca QR atualizado ─────────────────────
router.get('/:id/qrcode', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const channel = await prisma.channelInstance.findFirst({
      where: { id: req.params.id, companyId: req.companyId! },
    });
    if (!channel) { res.status(404).json({ error: 'Não encontrado' }); return; }

    const cfg = parseChannelConfig(channel.config);
    const creds = getCredsFromConfig(cfg);
    const qr = await getEvolutionQRCode(channel.identifier, creds);
    res.json({ qrcode: qr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar QR code' });
  }
});

// ── GET /api/channels/:id/status  →  verifica status na Evolution ────────────
router.get('/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const channel = await prisma.channelInstance.findFirst({
      where: { id: req.params.id, companyId: req.companyId! },
    });
    if (!channel) { res.status(404).json({ error: 'Não encontrado' }); return; }

    const cfg = parseChannelConfig(channel.config);
    const creds = getCredsFromConfig(cfg);
    const status = await getEvolutionStatus(channel.identifier, creds);

    // Sync status to DB if changed
    if (status !== channel.status) {
      await prisma.channelInstance.update({ where: { id: channel.id }, data: { status } });
    }

    res.json({ status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

// ── POST /api/channels/:id/disconnect  →  desconecta instância ───────────────
router.post('/:id/disconnect', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const channel = await prisma.channelInstance.findFirst({
      where: { id: req.params.id, companyId: req.companyId! },
    });
    if (!channel) { res.status(404).json({ error: 'Não encontrado' }); return; }

    const cfg = parseChannelConfig(channel.config);
    const creds = getCredsFromConfig(cfg);
    await disconnectEvolutionInstance(channel.identifier, creds);

    await prisma.channelInstance.update({
      where: { id: channel.id },
      data: { status: 'DISCONNECTED' },
    });

    res.json({ status: 'DISCONNECTED' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao desconectar' });
  }
});

// ── POST /api/channels/:id/set-webhook  →  re-registra webhook na Evolution ───
router.post('/:id/set-webhook', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const channel = await prisma.channelInstance.findFirst({
      where: { id: req.params.id, companyId: req.companyId! },
    });
    if (!channel) { res.status(404).json({ error: 'Não encontrado' }); return; }

    const cfg = parseChannelConfig(channel.config);
    const creds = getCredsFromConfig(cfg);
    if (!creds.url || !creds.key) {
      res.status(400).json({ error: 'URL e chave da API são obrigatórios' });
      return;
    }

    // Permite passar uma URL personalizada no body, ou usa BACKEND_URL
    const webhookUrl = req.body?.webhookUrl
      || `${process.env.BACKEND_URL || 'http://localhost:3001'}/webhooks/evolution`;

    const axios = (await import('axios')).default;
    const api = axios.create({
      baseURL: creds.url.replace(/\/$/, ''),
      headers: { apikey: creds.key },
      timeout: 10000,
    });

    await api.post(`/webhook/set/${channel.identifier}`, {
      enabled: true,
      url: webhookUrl,
      webhookByEvents: false,
      webhookBase64: false,
      events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'SEND_MESSAGE'],
    });

    res.json({ ok: true, webhookUrl });
  } catch (err: any) {
    const detail = err?.response?.data ? JSON.stringify(err.response.data) : err?.message;
    console.error('[set-webhook]', detail);
    res.status(500).json({ error: `Erro ao registrar webhook: ${detail}` });
  }
});

// ── PATCH /api/channels/:id/toggle  →  ativa/desativa canal ──────────────────
router.patch('/:id/toggle', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const channel = await prisma.channelInstance.findFirst({
      where: { id: req.params.id, companyId: req.companyId! },
    });
    if (!channel) { res.status(404).json({ error: 'Não encontrado' }); return; }

    const newStatus = channel.status === 'CONNECTED' ? 'PAUSED' : 'CONNECTED';
    const updated = await prisma.channelInstance.update({
      where: { id: channel.id },
      data: { status: newStatus },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro' });
  }
});

export default router;
