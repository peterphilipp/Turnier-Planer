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
  tournamentSchema
} from '../controllers/tournament.controller.js';

const router = Router();

// ==================== Spezifische Routes (MÜSSEN vor /:id kommen!) ====================
router.post('/:id/upload-logo', authenticate, requireAdmin, uploadTournamentLogo);

// ==================== Öffentlich ====================
router.get('/', getTournaments);
router.get('/:id', getTournamentById);

// ==================== Nur Admin/Organizer ====================
router.patch('/:id/status', authenticate, requireAdmin, updateTournamentStatus);
router.patch('/:id/mode', authenticate, requireAdmin, updateTournamentMode);
router.post('/:id/generate-matches', authenticate, requireAdmin, generateMatchesForYearGroup);
router.post('/:id/generate-ko-only', authenticate, requireAdmin, generateKoOnly);
router.post('/:id/generate-ko-from-gruppen', authenticate, requireAdmin, generateKoFromGruppen);

// Catch-all: muss LETZT sein!
router.patch('/:id', authenticate, requireAdmin, updateTournament);
router.delete('/:id', authenticate, requireAdmin, deleteTournament);

export default router;
