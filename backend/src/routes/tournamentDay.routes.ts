import { Router } from 'express';
import validate from '../middleware/validate.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  listTournamentDays, createTournamentDay, updateTournamentDay, deleteTournamentDay,
  generateShifts, clearShifts, exportDayToTemplate, tournamentDaySchema,
  updateTournamentDaySchema, tournamentIdBodySchema, exportDayToTemplateSchema
} from '../controllers/planning.controller.js';

const router = Router();

router.get('/', listTournamentDays);
router.post('/generate-shifts', authenticate, requireAdmin, validate(tournamentIdBodySchema), generateShifts);
router.post('/clear-shifts', authenticate, requireAdmin, validate(tournamentIdBodySchema), clearShifts);
router.post('/:id/export-template', authenticate, requireAdmin, validate(exportDayToTemplateSchema), exportDayToTemplate);
router.post('/', authenticate, requireAdmin, validate(tournamentDaySchema), createTournamentDay);
router.patch('/:id', authenticate, requireAdmin, validate(updateTournamentDaySchema.partial()), updateTournamentDay);
router.delete('/:id', authenticate, requireAdmin, deleteTournamentDay);

export default router;
