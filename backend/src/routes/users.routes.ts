import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../index';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.companyId },
      select: {
        id: true, name: true, email: true, role: true,
        avatar: true, status: true, maxConversations: true, createdAt: true,
        departments: { include: { department: true } },
      },
    });
    res.json(users);
  } catch { res.status(500).json({ error: 'Erro' }); }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, role: true,
        avatar: true, status: true, maxConversations: true,
        departments: { include: { department: true } },
      },
    });
    if (!user) { res.status(404).json({ error: 'Não encontrado' }); return; }
    res.json(user);
  } catch { res.status(500).json({ error: 'Erro' }); }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role, maxConversations } = req.body;
    const hashed = await bcrypt.hash(password || '123456', 10);
    const user = await prisma.user.create({
      data: {
        companyId: req.companyId!,
        name, email,
        password: hashed,
        role: role || 'AGENT',
        maxConversations: maxConversations || 10,
      },
    });
    res.status(201).json({ ...user, password: undefined });
  } catch { res.status(500).json({ error: 'Erro ao criar usuário' }); }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, role, maxConversations, status, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, email, role, maxConversations, status, avatar },
    });
    res.json({ ...user, password: undefined });
  } catch { res.status(500).json({ error: 'Erro' }); }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'Usuário deletado' });
  } catch { res.status(500).json({ error: 'Erro' }); }
});

export default router;
