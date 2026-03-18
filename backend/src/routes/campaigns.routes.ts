import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(authMiddleware);

const DATA_FILE = path.join(__dirname, '../../data/campaigns.json');

interface Campaign {
  id: string;
  companyId: string;
  name: string;
  status: string;
  targetType: string;
  targetIds: string[];
  targetCount: number;
  message: string;
  connectionId?: string;
  delay: number;
  scheduledAt?: string;
  sentCount: number;
  errorCount: number;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

function readData(): Campaign[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeData(data: Campaign[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET /api/campaigns
router.get('/', (req: AuthRequest, res: Response): void => {
  try {
    const data = readData();
    const filtered = data.filter(c => c.companyId === req.companyId);
    res.json(filtered);
  } catch {
    res.status(500).json({ error: 'Erro' });
  }
});

// POST /api/campaigns
router.post('/', (req: AuthRequest, res: Response): void => {
  try {
    const data = readData();
    const campaign: Campaign = {
      id: uuidv4(),
      companyId: req.companyId!,
      name: req.body.name || 'Nova Campanha',
      status: 'Rascunho',
      targetType: req.body.targetType || 'all',
      targetIds: req.body.targetIds || [],
      targetCount: req.body.targetCount || 0,
      message: req.body.message || '',
      connectionId: req.body.connectionId,
      delay: req.body.delay || 10,
      scheduledAt: req.body.scheduledAt,
      sentCount: 0,
      errorCount: 0,
      responseCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.push(campaign);
    writeData(data);
    res.status(201).json(campaign);
  } catch {
    res.status(500).json({ error: 'Erro ao criar campanha' });
  }
});

// PUT /api/campaigns/:id
router.put('/:id', (req: AuthRequest, res: Response): void => {
  try {
    const data = readData();
    const idx = data.findIndex(c => c.id === req.params.id && c.companyId === req.companyId);
    if (idx === -1) { res.status(404).json({ error: 'Não encontrado' }); return; }
    const allowed = ['name', 'status', 'targetType', 'targetIds', 'targetCount', 'message', 'connectionId', 'delay', 'scheduledAt'] as const;
    for (const key of allowed) {
      if (req.body[key] !== undefined) (data[idx] as unknown as Record<string, unknown>)[key] = req.body[key];
    }
    data[idx].updatedAt = new Date().toISOString();
    writeData(data);
    res.json(data[idx]);
  } catch {
    res.status(500).json({ error: 'Erro' });
  }
});

// DELETE /api/campaigns/:id
router.delete('/:id', (req: AuthRequest, res: Response): void => {
  try {
    let data = readData();
    data = data.filter(c => !(c.id === req.params.id && c.companyId === req.companyId));
    writeData(data);
    res.json({ message: 'Deletado' });
  } catch {
    res.status(500).json({ error: 'Erro' });
  }
});

// POST /api/campaigns/:id/start
router.post('/:id/start', (req: AuthRequest, res: Response): void => {
  try {
    const data = readData();
    const idx = data.findIndex(c => c.id === req.params.id && c.companyId === req.companyId);
    if (idx === -1) { res.status(404).json({ error: 'Não encontrado' }); return; }
    data[idx].status = 'Em envio';
    // Simulate sending
    data[idx].sentCount = Math.floor(data[idx].targetCount * 0.7);
    data[idx].errorCount = Math.floor(data[idx].targetCount * 0.05);
    data[idx].responseCount = Math.floor(data[idx].targetCount * 0.2);
    data[idx].updatedAt = new Date().toISOString();
    writeData(data);
    res.json(data[idx]);
  } catch {
    res.status(500).json({ error: 'Erro' });
  }
});

// POST /api/campaigns/:id/pause
router.post('/:id/pause', (req: AuthRequest, res: Response): void => {
  try {
    const data = readData();
    const idx = data.findIndex(c => c.id === req.params.id && c.companyId === req.companyId);
    if (idx === -1) { res.status(404).json({ error: 'Não encontrado' }); return; }
    data[idx].status = 'Pausada';
    data[idx].updatedAt = new Date().toISOString();
    writeData(data);
    res.json(data[idx]);
  } catch {
    res.status(500).json({ error: 'Erro' });
  }
});

export default router;
