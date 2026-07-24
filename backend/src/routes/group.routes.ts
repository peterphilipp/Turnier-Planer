import { Router } from 'express';
import validate from '../middleware/validate.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';
import {
  getGroupsByTournament,
  createGroup,
  updateGroup,
  deleteGroup,
  groupSchema
} from '../controllers/group.controller.js';

const router = Router();

router.get('/:tournamentId', getGroupsByTournament);
router.post('/', authenticate, requireAdmin, validate(groupSchema), createGroup);
router.patch('/:id', authenticate, requireAdmin, validate(groupSchema.partial()), updateGroup);
router.delete('/:id', authenticate, requireAdmin, deleteGroup);

export default router;
