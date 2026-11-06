import { Router } from 'express';
import { BusinessController } from '../controllers/business.controller.js';
import { authenticate, requireRoles } from '../middlewares/auth.middleware.js';
import { UserRole } from '../types/index.js';

const router = Router();

// Semua rute business memerlukan autentikasi
router.use(authenticate);

router.get('/', BusinessController.getAll);
router.get('/:id', BusinessController.getById);

// Hanya Super Admin yang bisa menambah, mengubah, dan menghapus unit usaha
router.post('/', requireRoles(UserRole.SUPER_ADMIN), BusinessController.create);
router.put('/:id', requireRoles(UserRole.SUPER_ADMIN), BusinessController.update);
router.delete('/:id', requireRoles(UserRole.SUPER_ADMIN), BusinessController.delete);

export default router;
