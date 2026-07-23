import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getMatchesByTournament,
  createMatch,
  updateMatch,
  advanceKO,
  deleteMatch,
  matchSchema
} from '../controllers/match.controller.js';

const router = Router();

router.get('/:tournamentId', getMatchesByTournament);
router.post('/', validate(matchSchema), createMatch);
router.patch('/:id', validate(matchSchema.partial()), updateMatch);
router.delete('/:id', deleteMatch);
router.post('/:id/advance', advanceKO);

export default router;
