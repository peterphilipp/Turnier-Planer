import { Router } from 'express';
import validate from '../middleware/validate.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  listTournamentWorkAreas, syncTournamentWorkAreas, updateTournamentWorkArea,
  tournamentWorkAreaUpdateSchema, tournamentWorkAreaSyncSchema
} from '../controllers/planning.controller.js';

const router = Router();

router.get('/', listTournamentWorkAreas);
router.post('/sync', authenticate, requireAdmin, validate(tournamentWorkAreaSyncSchema), syncTournamentWorkAreas);
router.patch('/:id', authenticate, requireAdmin, validate(tournamentWorkAreaUpdateSchema.partial()), updateTournamentWorkArea);

export default router;
