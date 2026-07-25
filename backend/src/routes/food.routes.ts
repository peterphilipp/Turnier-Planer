import { Router } from 'express';
import * as ctrl from '../controllers/food.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { foodCategorySchema, foodItemSchema, createFoodDonationSchema } from '../controllers/food.controller.js';

const router = Router();

// Admin: Kategorien (geschützt)
router.get('/categories', ctrl.getCategories);
router.post('/categories', authenticate, requireAdmin, validate(foodCategorySchema), ctrl.createCategory);
router.patch('/categories/:id', authenticate, requireAdmin, validate(foodCategorySchema.partial()), ctrl.updateCategory);
router.delete('/categories/:id', authenticate, requireAdmin, ctrl.deleteCategory);

// Admin: Artikel (geschützt)
router.get('/items', ctrl.getItems);
router.post('/items', authenticate, requireAdmin, validate(foodItemSchema), ctrl.createItem);
router.patch('/items/:id', authenticate, requireAdmin, validate(foodItemSchema.partial()), ctrl.updateItem);
router.delete('/items/:id', authenticate, requireAdmin, ctrl.deleteItem);

// Self-Service: Spenden (nur angemeldet)
router.get('/donations', authenticate, ctrl.getDonations);
router.post('/donations', authenticate, validate(createFoodDonationSchema), ctrl.createDonation);
router.delete('/donations/:id', authenticate, ctrl.deleteDonation);

// Admin/Organisator: alle Spenden eines Turniers (Dienstplan-Detailansicht)
router.get('/donations/all', authenticate, requireAdmin, ctrl.getAllDonations);

export default router;
