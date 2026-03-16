import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  listDepartments, createDepartment, updateDepartment, deleteDepartment,
  listTags, createTag, updateTag, deleteTag,
  listProducts, createProduct, updateProduct, deleteProduct,
  listLostReasons, createLostReason, updateLostReason, deleteLostReason,
  listActivityTypes, createActivityType, updateActivityType, deleteActivityType,
  listCustomFields, createCustomField, updateCustomField, deleteCustomField,
  listLeadLists, createLeadList, deleteLeadList,
  listChannels, createChannel, updateChannel, deleteChannel,
  listApiKeys, createApiKey, deleteApiKey,
} from '../controllers/config.controller';

const router = Router();
router.use(authMiddleware);

router.get('/departments', listDepartments);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

router.get('/tags', listTags);
router.post('/tags', createTag);
router.put('/tags/:id', updateTag);
router.delete('/tags/:id', deleteTag);

router.get('/products', listProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

router.get('/lost-reasons', listLostReasons);
router.post('/lost-reasons', createLostReason);
router.put('/lost-reasons/:id', updateLostReason);
router.delete('/lost-reasons/:id', deleteLostReason);

router.get('/activity-types', listActivityTypes);
router.post('/activity-types', createActivityType);
router.put('/activity-types/:id', updateActivityType);
router.delete('/activity-types/:id', deleteActivityType);

router.get('/custom-fields', listCustomFields);
router.post('/custom-fields', createCustomField);
router.put('/custom-fields/:id', updateCustomField);
router.delete('/custom-fields/:id', deleteCustomField);

router.get('/lists', listLeadLists);
router.post('/lists', createLeadList);
router.delete('/lists/:id', deleteLeadList);

router.get('/channels', listChannels);
router.post('/channels', createChannel);
router.put('/channels/:id', updateChannel);
router.delete('/channels/:id', deleteChannel);

router.get('/api-keys', listApiKeys);
router.post('/api-keys', createApiKey);
router.delete('/api-keys/:id', deleteApiKey);

export default router;
