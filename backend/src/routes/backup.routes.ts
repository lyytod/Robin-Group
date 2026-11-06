import { Router } from 'express';
import { BackupController } from '../controllers/backup.controller.js';
import { authenticate, requireRoles } from '../middlewares/auth.middleware.js';
import { UserRole } from '../types/index.js';

const router = Router();

// Backup & restore hanya diizinkan untuk Super Admin (Pemilik Usaha)
router.use(authenticate);
router.use(requireRoles(UserRole.SUPER_ADMIN));

router.post('/create', BackupController.create);
router.get('/list', BackupController.list);
router.get('/download/:filename', BackupController.download);

export default router;
