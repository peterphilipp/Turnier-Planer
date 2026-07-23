import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getGroupsByTournament,
  createGroup,
  updateGroup,
  deleteGroup,
  groupSchema
} from '../controllers/group.controller.js';

const router = Router();

router.get('/:tournamentId', getGroupsByTournament);
router.post('/', validate(groupSchema), createGroup);
router.patch('/:id', validate(groupSchema.partial()), updateGroup);
router.delete('/:id', deleteGroup);

export default router;
