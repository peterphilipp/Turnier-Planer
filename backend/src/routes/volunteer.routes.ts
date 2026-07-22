import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getVolunteers,
  createVolunteer,
  deleteVolunteer,
  volunteerSchema
} from '../controllers/volunteer.controller.js';

const router = Router();

router.get('/', getVolunteers);
router.post('/', validate(volunteerSchema), createVolunteer);
router.delete('/:id', deleteVolunteer);

export default router;
