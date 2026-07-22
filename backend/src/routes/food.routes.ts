import { Router } from 'express';
import * as ctrl from '../controllers/food.controller.js';

const router = Router();

// Admin: Kategorien
router.get('/categories', ctrl.getCategories);
router.post('/categories', ctrl.createCategory);
router.put('/categories/:id', ctrl.updateCategory);
router.delete('/categories/:id', ctrl.deleteCategory);

// Admin: Artikel
router.get('/items', ctrl.getItems);
router.post('/items', ctrl.createItem);
router.put('/items/:id', ctrl.updateItem);
router.delete('/items/:id', ctrl.deleteItem);

// Self-Service: Spenden
router.get('/donations', ctrl.getDonations);
router.post('/donations', ctrl.createDonation);
router.delete('/donations/:id', ctrl.deleteDonation);

export default router;
