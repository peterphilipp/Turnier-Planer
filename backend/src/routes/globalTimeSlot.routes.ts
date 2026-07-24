import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getGlobalTimeSlots,
  createGlobalTimeSlot,
  updateGlobalTimeSlot,
  deleteGlobalTimeSlot,
  globalTimeSlotSchema
} from '../controllers/globalTimeSlot.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', getGlobalTimeSlots);
router.post('/', authenticate, requireAdmin, validate(globalTimeSlotSchema), createGlobalTimeSlot);
router.patch('/:id', authenticate, requireAdmin, validate(globalTimeSlotSchema.partial()), updateGlobalTimeSlot);
router.delete('/:id', authenticate, requireAdmin, deleteGlobalTimeSlot);

export default router;
