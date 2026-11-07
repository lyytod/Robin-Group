import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller.js';
import { authenticate, requireBusinessAccess, requireRoles } from '../middlewares/auth.middleware.js';
import { UserRole } from '../types/index.js';

const router = Router();

// Semua rute transaksi memerlukan autentikasi dan validasi akses unit usaha
router.use(authenticate);
router.use(requireBusinessAccess);

router.get('/', TransactionController.getAll);
router.get('/:id', TransactionController.getById);

// Kasir, Agent, Admin Usaha, dan Super Admin dapat menginput penjualan & pengeluaran, serta update & void struk
router.post('/sale', TransactionController.createSale);
router.post('/expense', TransactionController.createExpense);
router.put('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.KASIR, UserRole.AGENT), TransactionController.update);
router.post('/:id/void', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.KASIR, UserRole.AGENT), TransactionController.voidTransaction);

export default router;
