import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate, requireRoles } from '../middlewares/auth.middleware.js';
import { UserRole } from '../types/index.js';

const router = Router();

// Semua rute user memerlukan autentikasi
router.use(authenticate);

// Super Admin dapat melihat dan mengelola semua user
router.get('/', requireRoles(UserRole.SUPER_ADMIN), UserController.getAll);
router.get('/:id', requireRoles(UserRole.SUPER_ADMIN), UserController.getById);
router.post('/', requireRoles(UserRole.SUPER_ADMIN), UserController.create);
router.put('/:id', requireRoles(UserRole.SUPER_ADMIN), UserController.update);
router.delete('/:id', requireRoles(UserRole.SUPER_ADMIN), UserController.delete);

export default router;
