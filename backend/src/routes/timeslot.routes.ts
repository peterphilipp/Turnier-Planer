import { Router } from 'express';
import * as ctrl from '../controllers/timeslot.controller.js';

const router = Router();

router.get('/', ctrl.getTimeSlots);
router.get('/:id', ctrl.getTimeSlotById);
router.post('/', ctrl.createTimeSlot);
router.patch('/:id', ctrl.updateTimeSlot);
router.delete('/:id', ctrl.deleteTimeSlot);

export default router;
