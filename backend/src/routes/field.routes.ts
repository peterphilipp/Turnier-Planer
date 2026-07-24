import { Router } from 'express';
import * as ctrl from '../controllers/field.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', ctrl.getFields);
router.get('/:id', ctrl.getFieldById);
router.post('/', authenticate, requireAdmin, ctrl.createField);
router.patch('/:id', authenticate, requireAdmin, ctrl.updateField);
router.delete('/:id', authenticate, requireAdmin, ctrl.deleteField);

export default router;
