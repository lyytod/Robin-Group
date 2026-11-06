import { Router } from 'express';
import { JournalController } from '../controllers/journal.controller.js';
import { authenticate, requireBusinessAccess, requireRoles } from '../middlewares/auth.middleware.js';
import { UserRole } from '../types/index.js';

const router = Router();

// Semua rute jurnal memerlukan autentikasi, hak akses unit usaha, dan peran Super Admin atau Admin
router.use(authenticate);
router.use(requireBusinessAccess);
router.use(requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/', JournalController.getAll);
router.get('/ledger/:accountId', JournalController.getLedger);
router.get('/:id', JournalController.getById);

// Input jurnal manual dapat dilakukan oleh Super Admin dan Admin Usaha
router.post('/manual', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), JournalController.createManual);

// Update dan delete jurnal: Admin dapat mengelola jurnal manual, Super Admin dapat mengelola semua jurnal (termasuk penjualan)
router.put('/manual/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), JournalController.updateManual);
router.delete('/manual/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), JournalController.deleteManual);
router.put('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), JournalController.updateManual);
router.delete('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), JournalController.deleteManual);

export default router;
