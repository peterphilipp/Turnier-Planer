import { Router } from 'express';
import * as ctrl from '../controllers/standings.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/:tournamentId', ctrl.getStandings);
router.post('/:tournamentId/recalculate', authenticate, requireAdmin, ctrl.recalculateStandings);

export default router;
