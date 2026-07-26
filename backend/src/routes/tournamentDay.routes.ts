import { Router } from 'express';
import validate from '../middleware/validate.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  listTournamentDays, createTournamentDay, updateTournamentDay, deleteTournamentDay,
  generateShifts, clearShifts, exportDayToTemplate, tournamentDaySchema,
  updateTournamentDaySchema, tournamentIdBodySchema, exportDayToTemplateSchema,
  getDayWorkAreas, syncDayWorkAreas, updateDayWorkAreaTargetHelpers, removeDayWorkArea,
  addDayWorkArea, dayWorkAreaTargetSchema, addDayWorkAreaSchema, getDaySlotsWithWorkAreas
} from '../controllers/planning.controller.js';

const router = Router();

router.get('/', listTournamentDays);
router.post('/generate-shifts', authenticate, requireAdmin, validate(tournamentIdBodySchema), generateShifts);
router.post('/clear-shifts', authenticate, requireAdmin, validate(tournamentIdBodySchema), clearShifts);
router.post('/:id/export-template', authenticate, requireAdmin, validate(exportDayToTemplateSchema), exportDayToTemplate);
router.post('/', authenticate, requireAdmin, validate(tournamentDaySchema), createTournamentDay);
router.patch('/:id', authenticate, requireAdmin, validate(updateTournamentDaySchema.partial()), updateTournamentDay);
router.delete('/:id', authenticate, requireAdmin, deleteTournamentDay);

// TournamentDayWorkArea-Endpunkte
router.get('/:dayId/work-areas', authenticate, requireAdmin, getDayWorkAreas);
router.post('/:dayId/sync-work-areas', authenticate, requireAdmin, syncDayWorkAreas);
// Direkte Routes für tournament-day-work-areas (für Frontend-Kompatibilität)
router.patch('/tournament-day-work-areas/:id', authenticate, requireAdmin, validate(dayWorkAreaTargetSchema.partial()), updateDayWorkAreaTargetHelpers);
router.delete('/tournament-day-work-areas/:id', authenticate, requireAdmin, removeDayWorkArea);
router.post('/day-work-areas', authenticate, requireAdmin, validate(addDayWorkAreaSchema), addDayWorkArea);

// Slots mit Arbeitsbereichen
router.get('/:dayId/slots-with-work-areas', authenticate, requireAdmin, getDaySlotsWithWorkAreas);

export default router;
