import { Router } from 'express';
import { getShifts, deleteShift, updateShift, updateShiftSchema, updateShiftsBatch, updateShiftsBatchSchema } from '../controllers/shift.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';
import validate from '../middleware/validate.js';

const router = Router();

router.get('/', getShifts);
// Vor /:id registriert, sonst würde "batch" als :id geparst.
router.patch('/batch', authenticate, requireAdmin, validate(updateShiftsBatchSchema), updateShiftsBatch);
router.patch('/:id', authenticate, requireAdmin, validate(updateShiftSchema), updateShift);
router.delete('/:id', authenticate, requireAdmin, deleteShift);

export default router;
