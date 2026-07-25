import { Router } from 'express';
import * as ctrl from '../controllers/timeslot.controller.js';
import validate from '../middleware/validate.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', ctrl.getTimeSlots);
router.get('/:id', ctrl.getTimeSlotById);
router.post('/', authenticate, requireAdmin, validate(ctrl.createTimeSlotSchema), ctrl.createTimeSlot);
router.put('/bulk', authenticate, requireAdmin, validate(ctrl.bulkUpdateTimeSlotsSchema), ctrl.bulkUpdateTimeSlots);
router.patch('/:id', authenticate, requireAdmin, validate(ctrl.timeSlotSchema.partial()), ctrl.updateTimeSlot);
router.delete('/:id', authenticate, requireAdmin, ctrl.deleteTimeSlot);

export default router;
