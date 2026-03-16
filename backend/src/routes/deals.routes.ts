import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  listDeals,
  getDeal,
  createDeal,
  updateDeal,
  moveDealStage,
  deleteDeal,
  wonDeal,
  lostDeal,
  reopenDeal,
  createDealActivity,
} from '../controllers/deals.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', listDeals);
router.get('/:id', getDeal);
router.post('/', createDeal);
router.put('/:id', updateDeal);
router.put('/:id/stage', moveDealStage);
router.put('/:id/won', wonDeal);
router.put('/:id/lost', lostDeal);
router.put('/:id/reopen', reopenDeal);
router.delete('/:id', deleteDeal);
router.post('/:id/activities', createDealActivity);

export default router;
