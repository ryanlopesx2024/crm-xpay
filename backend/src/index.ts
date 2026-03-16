import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/auth.routes';
import pipelineRoutes from './routes/pipelines.routes';
import dealsRoutes from './routes/deals.routes';
import leadsRoutes from './routes/leads.routes';
import conversationsRoutes from './routes/conversations.routes';
import messagesRoutes from './routes/messages.routes';
import automationsRoutes from './routes/automations.routes';
import departmentsRoutes from './routes/departments.routes';
import usersRoutes from './routes/users.routes';
import tagsRoutes from './routes/tags.routes';
import productsRoutes from './routes/products.routes';
import channelsRoutes from './routes/channels.routes';
import configRoutes from './routes/config.routes';
import dashboardRoutes from './routes/dashboard.routes';
import trackingRoutes from './routes/tracking.routes';
import scriptsRoutes from './routes/scripts.routes';
import campaignsRoutes from './routes/campaigns.routes';
import analyticsRoutes from './routes/analytics.routes';
import whatsappWebhook from './webhooks/whatsapp.webhook';
import evolutionWebhook from './webhooks/evolution.webhook';
import trackingWebhook from './webhooks/tracking.webhook';

import { setupChatSocket } from './socket/chat.socket';
import { setupQueueSocket } from './socket/queue.socket';
import { setupPresenceSocket } from './socket/presence.socket';

dotenv.config();

export const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// File upload endpoint
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });
app.post('/api/upload', upload.single('file'), (req: express.Request, res: express.Response) => {
  if (!req.file) { res.status(400).json({ error: 'Nenhum arquivo enviado' }); return; }
  const url = `${process.env.BACKEND_URL || 'http://localhost:3001'}/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename, mimetype: req.file.mimetype });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/automations', automationsRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/scripts', scriptsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/webhooks/whatsapp', whatsappWebhook);
app.use('/webhooks/evolution', evolutionWebhook);
app.use('/webhooks/tracking', trackingWebhook);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Socket setup
setupChatSocket(io);
setupQueueSocket(io);
setupPresenceSocket(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`CRM xPay backend rodando na porta ${PORT}`);
});
