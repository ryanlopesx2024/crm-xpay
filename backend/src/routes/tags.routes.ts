import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { listTags, createTag, updateTag, deleteTag } from '../controllers/config.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', listTags);
router.post('/', createTag);
router.put('/:id', updateTag);
router.delete('/:id', deleteTag);

export default router;
