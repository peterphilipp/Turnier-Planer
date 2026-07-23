import { Router } from 'express';
import * as ctrl from '../controllers/standings.controller.js';

const router = Router();

router.get('/:tournamentId', ctrl.getStandings);
router.post('/:tournamentId/recalculate', ctrl.recalculateStandings);

export default router;
