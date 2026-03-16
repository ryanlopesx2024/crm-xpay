import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  listConversations,
  createConversation,
  getConversation,
  assignConversation,
  moveDepartment,
  finishConversation,
} from '../controllers/conversations.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', listConversations);
router.post('/', createConversation);
router.get('/:id', getConversation);
router.put('/:id/assign', assignConversation);
router.put('/:id/department', moveDepartment);
router.put('/:id/finish', finishConversation);

export default router;
