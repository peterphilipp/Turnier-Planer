import { Router } from 'express';
import * as ctrl from '../controllers/timeslot.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', ctrl.getTimeSlots);
router.get('/:id', ctrl.getTimeSlotById);
router.post('/', authenticate, requireAdmin, ctrl.createTimeSlot);
router.put('/bulk', authenticate, requireAdmin, ctrl.bulkUpdateTimeSlots);
router.patch('/:id', authenticate, requireAdmin, ctrl.updateTimeSlot);
router.delete('/:id', authenticate, requireAdmin, ctrl.deleteTimeSlot);

export default router;
