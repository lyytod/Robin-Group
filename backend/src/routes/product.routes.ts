import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { authenticate, requireBusinessAccess, requireRoles } from '../middlewares/auth.middleware.js';
import { UserRole } from '../types/index.js';

const router = Router();

// Semua rute produk memerlukan autentikasi & validasi akses unit usaha
router.use(authenticate);
router.use(requireBusinessAccess);

router.get('/stock-movements', ProductController.getMovements);
router.get('/', ProductController.getAll);
router.get('/:id', ProductController.getById);

// Menambah, mengedit, menghapus produk, & penyesuaian stok hanya untuk Super Admin dan Admin Usaha
router.post('/:id/adjust-stock', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), ProductController.adjustStock);
router.post('/', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), ProductController.create);
router.put('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), ProductController.update);
router.delete('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), ProductController.delete);

export default router;
