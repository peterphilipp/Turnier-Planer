import { Router } from 'express';
import validate from '../middleware/validate.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  listTournamentDays, createTournamentDay, updateTournamentDay, deleteTournamentDay,
  generateShifts, clearShifts, exportDayToTemplate, tournamentDaySchema
} from '../controllers/planning.controller.js';

const router = Router();

router.get('/', listTournamentDays);
router.post('/generate-shifts', authenticate, requireAdmin, generateShifts);
router.post('/clear-shifts', authenticate, requireAdmin, clearShifts);
router.post('/:id/export-template', authenticate, requireAdmin, exportDayToTemplate);
router.post('/', authenticate, requireAdmin, validate(tournamentDaySchema), createTournamentDay);
router.patch('/:id', authenticate, requireAdmin, updateTournamentDay);
router.delete('/:id', authenticate, requireAdmin, deleteTournamentDay);

export default router;
