import { Router } from 'express';
import validate from '../middleware/validate.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';
import {
  getVolunteers,
  createVolunteer,
  deleteVolunteer,
  updateVolunteer,
  updateVolunteerPassword,
  broadcastPush,
  volunteerSchema,
  updateVolunteerPasswordSchema,
  broadcastPushSchema
} from '../controllers/volunteer.controller.js';

const router = Router();

// Nur Admin/Organizer: Helfer-Liste (enthält personenbezogene Daten)
router.get('/', authenticate, requireAdmin, getVolunteers);

// Nur Admin/Organizer: Push Broadcast
router.post('/push-broadcast', authenticate, requireAdmin, validate(broadcastPushSchema), broadcastPush);

// Nur Admin/Organizer
router.post('/', authenticate, requireAdmin, validate(volunteerSchema), createVolunteer);
router.patch('/:id', authenticate, requireAdmin, validate(volunteerSchema.partial()), updateVolunteer);
router.patch('/:id/password', authenticate, requireAdmin, validate(updateVolunteerPasswordSchema), updateVolunteerPassword);
router.delete('/:id', authenticate, requireAdmin, deleteVolunteer);

export default router;
