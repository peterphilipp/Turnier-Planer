import { Router } from 'express';
import { getWorkAreaCategories, createWorkAreaCategory, updateWorkAreaCategory, deleteWorkAreaCategory, updateWorkAreaCategoryOrder } from '../controllers/workAreaCategory.controller.js';

const router = Router();

router.get('/', getWorkAreaCategories);
router.post('/', createWorkAreaCategory);
router.post('/reorder', updateWorkAreaCategoryOrder);
router.patch('/:id', updateWorkAreaCategory);
router.delete('/:id', deleteWorkAreaCategory);

export default router;
