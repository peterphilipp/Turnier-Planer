import { Router } from 'express';
import validate from '../middleware/validate.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';
import {
  getTeamsByGroup,
  getTeamsByTournament,
  createTeam,
  updateTeam,
  deleteTeam,
  teamSchema
} from '../controllers/team.controller.js';

const router = Router();

router.get('/', (req, res) => {
  if (req.query.tournamentId) return getTeamsByTournament(req, res);
  return getTeamsByGroup(req, res);
});
router.post('/', authenticate, requireAdmin, validate(teamSchema), createTeam);
router.patch('/:id', authenticate, requireAdmin, validate(teamSchema.partial()), updateTeam);
router.delete('/:id', authenticate, requireAdmin, deleteTeam);

export default router;
