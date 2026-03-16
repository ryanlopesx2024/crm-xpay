import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { listLeads, getLead, createLead, updateLead, addTag, removeTag, addToList, removeFromList } from '../controllers/leads.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', listLeads);
router.get('/:id', getLead);
router.post('/', createLead);
router.put('/:id', updateLead);
router.post('/:id/tags', addTag);
router.delete('/:id/tags/:tagId', removeTag);
router.post('/:id/lists', addToList);
router.delete('/:id/lists/:listId', removeFromList);

export default router;
