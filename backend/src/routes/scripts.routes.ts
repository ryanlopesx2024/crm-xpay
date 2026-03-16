import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(authMiddleware);

const DATA_FILE = path.join(__dirname, '../../data/scripts.json');

interface ScriptStep {
  id: string;
  title: string;
  text: string;
  order: number;
}

interface Script {
  id: string;
  companyId: string;
  name: string;
  category: string;
  steps: ScriptStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function readData(): Script[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeData(data: Script[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET /api/scripts
router.get('/', (req: AuthRequest, res: Response): void => {
  try {
    const data = readData();
    const filtered = data.filter(s => s.companyId === req.companyId);
    res.json(filtered);
  } catch {
    res.status(500).json({ error: 'Erro' });
  }
});

// POST /api/scripts
router.post('/', (req: AuthRequest, res: Response): void => {
  try {
    const data = readData();
    const script: Script = {
      id: uuidv4(),
      companyId: req.companyId!,
      name: req.body.name,
      category: req.body.category || 'Abordagem',
      steps: (req.body.steps || []).map((s: Partial<ScriptStep>, i: number) => ({
        id: uuidv4(),
        title: s.title || '',
        text: s.text || '',
        order: i,
      })),
      isActive: req.body.isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.push(script);
    writeData(data);
    res.status(201).json(script);
  } catch {
    res.status(500).json({ error: 'Erro ao criar script' });
  }
});

// PUT /api/scripts/:id
router.put('/:id', (req: AuthRequest, res: Response): void => {
  try {
    const data = readData();
    const idx = data.findIndex(s => s.id === req.params.id && s.companyId === req.companyId);
    if (idx === -1) { res.status(404).json({ error: 'Não encontrado' }); return; }
    if (req.body.name !== undefined) data[idx].name = req.body.name;
    if (req.body.category !== undefined) data[idx].category = req.body.category;
    if (req.body.isActive !== undefined) data[idx].isActive = req.body.isActive;
    if (req.body.steps !== undefined) {
      data[idx].steps = req.body.steps.map((s: Partial<ScriptStep>, i: number) => ({
        id: s.id || uuidv4(),
        title: s.title || '',
        text: s.text || '',
        order: i,
      }));
    }
    data[idx].updatedAt = new Date().toISOString();
    writeData(data);
    res.json(data[idx]);
  } catch {
    res.status(500).json({ error: 'Erro' });
  }
});

// DELETE /api/scripts/:id
router.delete('/:id', (req: AuthRequest, res: Response): void => {
  try {
    let data = readData();
    data = data.filter(s => !(s.id === req.params.id && s.companyId === req.companyId));
    writeData(data);
    res.json({ message: 'Deletado' });
  } catch {
    res.status(500).json({ error: 'Erro' });
  }
});

export default router;
