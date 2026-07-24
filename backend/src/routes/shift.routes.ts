import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
  copyShifts,
  shiftSchema
} from '../controllers/shift.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', getShifts);
router.post('/copy', authenticate, requireAdmin, copyShifts);
router.post('/', authenticate, requireAdmin, validate(shiftSchema), createShift);
router.patch('/:id', authenticate, requireAdmin, validate(shiftSchema.partial()), updateShift);
router.delete('/:id', authenticate, requireAdmin, deleteShift);

export default router;
