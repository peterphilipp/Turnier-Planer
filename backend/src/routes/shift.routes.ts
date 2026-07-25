import { Router } from 'express';
import { getShifts, deleteShift, updateShift } from '../controllers/shift.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', getShifts);
router.patch('/:id', authenticate, requireAdmin, updateShift);
router.delete('/:id', authenticate, requireAdmin, deleteShift);

export default router;
