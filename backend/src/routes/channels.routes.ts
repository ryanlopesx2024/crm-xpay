import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { listChannels, createChannel, updateChannel, deleteChannel } from '../controllers/config.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', listChannels);
router.post('/', createChannel);
router.put('/:id', updateChannel);
router.delete('/:id', deleteChannel);

export default router;
