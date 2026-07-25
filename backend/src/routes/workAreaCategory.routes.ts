import { Router } from 'express';
import validate from '../middleware/validate.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  getWorkAreaCategories, createWorkAreaCategory, updateWorkAreaCategory,
  deleteWorkAreaCategory, updateWorkAreaCategoryOrder,
  workAreaCategorySchema, reorderSchema
} from '../controllers/workAreaCategory.controller.js';

const router = Router();

// Öffentlich: Lesen (Kategorien sind reine Stammdaten-Labels)
router.get('/', getWorkAreaCategories);

// Nur Admin/Organizer
router.post('/', authenticate, requireAdmin, validate(workAreaCategorySchema), createWorkAreaCategory);
router.post('/reorder', authenticate, requireAdmin, validate(reorderSchema), updateWorkAreaCategoryOrder);
router.patch('/:id', authenticate, requireAdmin, validate(workAreaCategorySchema.partial()), updateWorkAreaCategory);
router.delete('/:id', authenticate, requireAdmin, deleteWorkAreaCategory);

export default router;
