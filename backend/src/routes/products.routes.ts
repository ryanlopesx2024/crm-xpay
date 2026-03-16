import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { listProducts, createProduct, updateProduct, deleteProduct } from '../controllers/config.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', listProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;
