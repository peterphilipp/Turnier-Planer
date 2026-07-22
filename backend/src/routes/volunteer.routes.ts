import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getVolunteers,
  createVolunteer,
  deleteVolunteer,
  updateVolunteer,
  updateVolunteerPassword,
  volunteerSchema
} from '../controllers/volunteer.controller.js';

const router = Router();

router.get('/', getVolunteers);
router.post('/', validate(volunteerSchema), createVolunteer);
router.patch('/:id', validate(volunteerSchema.partial()), updateVolunteer);
router.patch('/:id/password', updateVolunteerPassword);
router.delete('/:id', deleteVolunteer);

export default router;
