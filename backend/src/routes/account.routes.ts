import { Router } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { authenticate, requireBusinessAccess, requireRoles } from '../middlewares/auth.middleware.js';
import { UserRole } from '../types/index.js';

const router = Router();

// Semua rute accounts memerlukan autentikasi, hak akses unit usaha, dan peran Super Admin atau Admin
router.use(authenticate);
router.use(requireBusinessAccess);
router.use(requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/', AccountController.getAll);
router.get('/:id', AccountController.getById);

// Menambah, mengubah, & menghapus akun CoA
router.post('/', AccountController.create);
router.put('/:id', AccountController.update);
router.delete('/:id', AccountController.delete);

export default router;
