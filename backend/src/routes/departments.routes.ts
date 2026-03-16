import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { listDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/config.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', listDepartments);
router.post('/', createDepartment);
router.put('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);

export default router;
