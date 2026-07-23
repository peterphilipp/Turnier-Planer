import { Router } from 'express';
import validate from '../middleware/validate.js';
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
router.post('/', validate(teamSchema), createTeam);
router.patch('/:id', validate(teamSchema.partial()), updateTeam);
router.delete('/:id', deleteTeam);

export default router;
