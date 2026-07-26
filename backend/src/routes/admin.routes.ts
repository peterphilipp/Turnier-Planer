import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Alle Admin-DB-Endpoints benötigen Authentication + Admin-Rolle
router.use(authenticate);
router.use(requireAdmin);

/**
 * Exportiert die SQLite-Datenbank als Download.
 * GET /api/admin/db/dump
 */
router.get('/db/dump', adminController.dumpDatabase);

/**
 * Importiert eine SQLite-Datenbank (Base64-encoded).
 * POST /api/admin/db/import
 * Body: { database: "<base64-string>" }
 */
router.post('/db/import', adminController.importDatabase);

export default router;
