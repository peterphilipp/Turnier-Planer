import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getVolunteerShifts,
  createVolunteerShift,
  updateVolunteerShift,
  deleteVolunteerShift,
  volunteerShiftSchema
} from '../controllers/volunteerShift.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', getVolunteerShifts);
router.post('/', authenticate, requireAdmin, validate(volunteerShiftSchema), createVolunteerShift);
router.patch('/:id', authenticate, requireAdmin, validate(volunteerShiftSchema.partial()), updateVolunteerShift);
router.delete('/:id', authenticate, requireAdmin, deleteVolunteerShift);

export default router;
