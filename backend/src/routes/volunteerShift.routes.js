import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getVolunteerShifts,
  createVolunteerShift,
  updateVolunteerShift,
  deleteVolunteerShift,
  volunteerShiftSchema
} from '../controllers/volunteerShift.controller.js';

const router = Router();

router.get('/', getVolunteerShifts);
router.post('/', validate(volunteerShiftSchema), createVolunteerShift);
router.patch('/:id', validate(volunteerShiftSchema.partial()), updateVolunteerShift);
router.delete('/:id', deleteVolunteerShift);

export default router;
