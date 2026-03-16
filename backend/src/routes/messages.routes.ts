import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { sendMessage, listMessages } from '../controllers/messages.controller';

const router = Router();

router.use(authMiddleware);

router.post('/', sendMessage);
router.get('/:conversationId', listMessages);

export default router;
