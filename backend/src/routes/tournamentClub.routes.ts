import { Router } from 'express';
import * as controller from '../controllers/tournamentClub.controller.js';

const router = Router();

router.get('/', controller.getTournamentClubs);
router.post('/', controller.addTournamentClub);
router.delete('/', controller.removeTournamentClub);

export default router;
