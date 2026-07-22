import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getGroupsByTournament,
  createGroup,
  deleteGroup,
  groupSchema
} from '../controllers/group.controller.js';

const router = Router();

router.get('/:tournamentId', getGroupsByTournament);
router.post('/', validate(groupSchema), createGroup);
router.delete('/:id', deleteGroup);

export default router;
