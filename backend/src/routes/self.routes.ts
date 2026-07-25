import { Router } from 'express';
import { getAvailable, assignShift, unassignShift, getVapidPublicKey, subscribePush, rateShift } from '../controllers/self.controller.js';

const router = Router();

router.get('/available', getAvailable);
router.post('/assign', assignShift);
router.delete('/unassign/:id', unassignShift);
router.patch('/shifts/:id/rating', rateShift);
router.get('/vapid-public-key', getVapidPublicKey);
router.post('/push-subscribe', subscribePush);

export default router;
