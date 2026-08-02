import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getAvailable, assignShift, unassignShift, getVapidPublicKey, subscribePush, rateShift, getTrainerDashboard,
  assignShiftSchema, rateShiftSchema, pushSubscribeSchema
} from '../controllers/self.controller.js';

const router = Router();

router.get('/available', getAvailable);
router.get('/trainer-dashboard', getTrainerDashboard);
router.post('/assign', validate(assignShiftSchema), assignShift);
router.delete('/unassign/:id', unassignShift);
router.patch('/shifts/:id/rating', validate(rateShiftSchema), rateShift);
router.get('/vapid-public-key', getVapidPublicKey);
router.post('/push-subscribe', validate(pushSubscribeSchema), subscribePush);

export default router;
