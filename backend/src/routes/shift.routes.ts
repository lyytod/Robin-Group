import { Router } from 'express';
import { ShiftController } from '../controllers/shift.controller.js';
import { authenticate, requireBusinessAccess, requireRoles } from '../middlewares/auth.middleware.js';
import { UserRole } from '../types/index.js';

const router = Router();

router.use(authenticate);
router.use(requireBusinessAccess);

// Daftar shift bisa dilihat kasir (untuk memilih shift saat absen) maupun admin
router.get('/', ShiftController.getAll);
router.get('/rules', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), ShiftController.getOperationalRule);
router.put('/rules', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), ShiftController.updateOperationalRule);
router.get('/:id', ShiftController.getById);

// Tambah, ubah, hapus shift hanya untuk Super Admin dan Admin
router.post('/', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), ShiftController.create);
router.put('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), ShiftController.update);
router.delete('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), ShiftController.delete);

export default router;

