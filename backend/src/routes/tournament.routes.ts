import { Router } from 'express';
import validate from '../middleware/validate.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';
import {
  getTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  updateTournamentMode,
  generateMatchesForYearGroup,
  generateKoOnly,
  generateKoFromGruppen,
  uploadTournamentLogo,
  updateTournamentStatus,
  deleteTournament,
  tournamentSchema,
  updateTournamentSchema,
  tournamentStatusSchema,
  tournamentModeSchema,
  uploadLogoSchema,
  generateMatchesSchema
} from '../controllers/tournament.controller.js';

const router = Router();

// ==================== Spezifische Routes (MÜSSEN vor /:id kommen!) ====================
router.post('/:id/upload-logo', authenticate, requireAdmin, validate(uploadLogoSchema), uploadTournamentLogo);

// ==================== Öffentlich ====================
router.get('/', getTournaments);
router.get('/:id', getTournamentById);

// ==================== Nur Admin/Organizer ====================
router.post('/', authenticate, requireAdmin, validate(tournamentSchema), createTournament);
router.patch('/:id/status', authenticate, requireAdmin, validate(tournamentStatusSchema), updateTournamentStatus);
router.patch('/:id/mode', authenticate, requireAdmin, validate(tournamentModeSchema), updateTournamentMode);
router.post('/:id/generate-matches', authenticate, requireAdmin, validate(generateMatchesSchema), generateMatchesForYearGroup);
router.post('/:id/generate-ko-only', authenticate, requireAdmin, validate(generateMatchesSchema), generateKoOnly);
router.post('/:id/generate-ko-from-gruppen', authenticate, requireAdmin, validate(generateMatchesSchema), generateKoFromGruppen);

// Catch-all: muss LETZT sein!
router.patch('/:id', authenticate, requireAdmin, validate(updateTournamentSchema), updateTournament);
router.delete('/:id', authenticate, requireAdmin, deleteTournament);

export default router;
