import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  listAutomations,
  createAutomation,
  updateAutomation,
  toggleAutomation,
  deleteAutomation,
  executeAutomation,
  listExecutions,
} from '../controllers/automations.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', listAutomations);
router.get('/executions', listExecutions);
router.post('/', createAutomation);
router.put('/:id', updateAutomation);
router.put('/:id/toggle', toggleAutomation);
router.post('/:id/execute', executeAutomation);
router.delete('/:id', deleteAutomation);

export default router;
