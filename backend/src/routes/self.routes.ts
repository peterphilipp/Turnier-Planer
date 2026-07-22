import { Router } from 'express';
import { getAvailable, assignShift, unassignShift } from '../controllers/self.controller.js';

const router = Router();

router.get('/available', getAvailable);
router.post('/assign', assignShift);
router.delete('/unassign/:id', unassignShift);

export default router;
