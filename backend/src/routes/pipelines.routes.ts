import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  listPipelines,
  createPipeline,
  updatePipeline,
  deletePipeline,
  createStage,
  updateStage,
  deleteStage,
} from '../controllers/pipelines.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', listPipelines);
router.post('/', createPipeline);
router.put('/:id', updatePipeline);
router.delete('/:id', deletePipeline);
router.post('/:id/stages', createStage);
router.put('/:id/stages/:stageId', updateStage);
router.delete('/:id/stages/:stageId', deleteStage);

export default router;
