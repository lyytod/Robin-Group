import { Router } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { authenticate, requireBusinessAccess, requireRoles } from '../middlewares/auth.middleware.js';
import { UserRole } from '../types/index.js';

const router = Router();

// Rute accounts memerlukan autentikasi dan hak akses unit usaha
router.use(authenticate);
router.use(requireBusinessAccess);

// Melihat daftar akun (CoA) diizinkan untuk Super Admin, Admin, dan Agent (untuk referensi inventaris/stok)
router.get('/', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.AGENT), AccountController.getAll);
router.get('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.AGENT), AccountController.getById);

// Menambah, mengubah, & menghapus akun CoA hanya untuk Super Admin dan Admin
router.post('/', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), AccountController.create);
router.put('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), AccountController.update);
router.delete('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), AccountController.delete);

export default router;
