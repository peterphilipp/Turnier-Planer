import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  updateTournamentStatus,
  deleteTournament,
  tournamentSchema
} from '../controllers/tournament.controller.js';

const router = Router();

router.get('/', getTournaments);
router.get('/:id', getTournamentById);
router.post('/', validate(tournamentSchema), createTournament);
router.patch('/:id', validate(tournamentSchema.partial()), updateTournament);
router.patch('/:id/status', updateTournamentStatus);
router.delete('/:id', deleteTournament);

export default router;
