import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller.js';
import { authenticate, requireBusinessAccess, requireRoles } from '../middlewares/auth.middleware.js';
import { UserRole } from '../types/index.js';

const router = Router();

// Semua rute inventaris memerlukan autentikasi, hak akses unit usaha, dan peran Super Admin atau Admin
router.use(authenticate, requireBusinessAccess, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/', InventoryController.getAll);
router.post('/', InventoryController.create);
router.post('/movement', InventoryController.recordMovement);
router.get('/:id', InventoryController.getById);
router.put('/:id', InventoryController.update);
router.get('/:id/movements', InventoryController.getMovements);
router.delete('/:id', InventoryController.delete);

export default router;
