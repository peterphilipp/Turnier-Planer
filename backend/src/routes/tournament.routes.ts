import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  updateTournamentMode,
  generateMatchesForYearGroup,
  updateTournamentStatus,
  deleteTournament,
  tournamentSchema
} from '../controllers/tournament.controller.js';

const router = Router();

router.get('/', getTournaments);
router.get('/:id', getTournamentById);
router.post('/', validate(tournamentSchema), createTournament);
router.patch('/:id', updateTournament);
router.patch('/:id/status', updateTournamentStatus);
router.patch('/:id/mode', updateTournamentMode);
router.post('/:id/generate-matches', generateMatchesForYearGroup);
router.delete('/:id', deleteTournament);

export default router;
