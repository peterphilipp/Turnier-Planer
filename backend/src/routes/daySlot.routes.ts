import { Router } from 'express';
import validate from '../middleware/validate.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { addDaySlot, updateDaySlot, deleteDaySlot, daySlotSchema } from '../controllers/planning.controller.js';

const router = Router();

router.post('/', authenticate, requireAdmin, validate(daySlotSchema), addDaySlot);
router.patch('/:id', authenticate, requireAdmin, validate(daySlotSchema.partial()), updateDaySlot);
router.delete('/:id', authenticate, requireAdmin, deleteDaySlot);

export default router;
