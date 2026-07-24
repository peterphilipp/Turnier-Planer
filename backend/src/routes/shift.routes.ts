import { Router } from 'express';
import { getShifts, deleteShift } from '../controllers/shift.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', getShifts);
router.delete('/:id', authenticate, requireAdmin, deleteShift);

export default router;
