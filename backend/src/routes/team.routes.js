import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  createTeam,
  updateTeam,
  deleteTeam,
  teamSchema
} from '../controllers/team.controller.js';

const router = Router();

router.post('/', validate(teamSchema), createTeam);
router.patch('/:id', validate(teamSchema.partial()), updateTeam);
router.delete('/:id', deleteTeam);

export default router;
