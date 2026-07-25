import { Router } from 'express';
import * as controller from '../controllers/tournamentClub.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';
import validate from '../middleware/validate.js';

const router = Router();

router.get('/', controller.getTournamentClubs);
router.post('/', authenticate, requireAdmin, validate(controller.addTournamentClubSchema), controller.addTournamentClub);
router.delete('/', authenticate, requireAdmin, controller.removeTournamentClub);

export default router;
