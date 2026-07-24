import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getWorkAreas,
  createWorkArea,
  updateWorkArea,
  deleteWorkArea,
  workAreaSchema
} from '../controllers/workArea.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', getWorkAreas);
router.post('/', authenticate, requireAdmin, validate(workAreaSchema), createWorkArea);
router.patch('/:id', authenticate, requireAdmin, validate(workAreaSchema.partial()), updateWorkArea);
router.delete('/:id', authenticate, requireAdmin, deleteWorkArea);

export default router;
