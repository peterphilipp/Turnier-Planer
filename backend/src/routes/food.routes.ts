import { Router } from 'express';
import * as ctrl from '../controllers/food.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';

const router = Router();

// Admin: Kategorien (geschützt)
router.get('/categories', ctrl.getCategories);
router.post('/categories', authenticate, requireAdmin, ctrl.createCategory);
router.patch('/categories/:id', authenticate, requireAdmin, ctrl.updateCategory);
router.delete('/categories/:id', authenticate, requireAdmin, ctrl.deleteCategory);

// Admin: Artikel (geschützt)
router.get('/items', ctrl.getItems);
router.post('/items', authenticate, requireAdmin, ctrl.createItem);
router.patch('/items/:id', authenticate, requireAdmin, ctrl.updateItem);
router.delete('/items/:id', authenticate, requireAdmin, ctrl.deleteItem);

// Self-Service: Spenden (nur angemeldet)
router.get('/donations', authenticate, ctrl.getDonations);
router.post('/donations', authenticate, ctrl.createDonation);
router.delete('/donations/:id', authenticate, ctrl.deleteDonation);

export default router;
