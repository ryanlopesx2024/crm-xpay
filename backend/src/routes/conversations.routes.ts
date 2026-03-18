import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import {
  listConversations,
  createConversation,
  getConversation,
  assignConversation,
  moveDepartment,
  finishConversation,
} from '../controllers/conversations.controller';
import { prisma } from '../index';

const router = Router();

router.use(authMiddleware);

router.get('/', listConversations);
router.post('/', createConversation);
router.get('/:id', getConversation);
router.put('/:id/assign', assignConversation);
router.put('/:id/department', moveDepartment);
router.put('/:id/finish', finishConversation);

// Troca o canal (instância) de uma conversa
router.put('/:id/channel', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { channelInstanceId } = req.body;
    if (!channelInstanceId) { res.status(400).json({ error: 'channelInstanceId obrigatório' }); return; }

    // Verifica que o canal pertence à empresa
    const channel = await prisma.channelInstance.findFirst({
      where: { id: channelInstanceId, companyId: req.companyId! },
    });
    if (!channel) { res.status(404).json({ error: 'Canal não encontrado' }); return; }

    const updated = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { channelInstanceId },
      include: {
        lead: { include: { tags: { include: { tag: true } } } },
        assignedUser: { select: { id: true, name: true, avatar: true, status: true } },
        department: true,
        channelInstance: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao trocar canal' });
  }
});

export default router;
