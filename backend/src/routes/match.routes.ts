import { Router } from 'express';
import validate from '../middleware/validate.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';
import {
  getMatchesByTournament,
  createMatch,
  updateMatch,
  resetMatch,
  toggleCompleted,
  assignKOTeams,
  deleteMatch,
  matchSchema
} from '../controllers/match.controller.js';

const router = Router();

// Öffentlich: Spielplan ansehen
router.get('/:tournamentId', getMatchesByTournament);

// Nur Admin/Organizer
router.post('/', authenticate, requireAdmin, validate(matchSchema), createMatch);
router.patch('/:id', authenticate, requireAdmin, validate(matchSchema.partial()), updateMatch);
router.delete('/:id', authenticate, requireAdmin, deleteMatch);
router.post('/assign-ko-teams', authenticate, requireAdmin, assignKOTeams);
router.post('/:id/reset', authenticate, requireAdmin, resetMatch);
router.patch('/:id/toggle-completed', authenticate, requireAdmin, toggleCompleted);

export default router;
