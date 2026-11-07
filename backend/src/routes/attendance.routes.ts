import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller.js';
import { authenticate, requireBusinessAccess, requireRoles } from '../middlewares/auth.middleware.js';
import { UserRole } from '../types/index.js';

const router = Router();

router.use(authenticate);
router.use(requireBusinessAccess);

// Akses untuk Kios Absensi & Pegawai (Bisa dioperasikan oleh Kasir, Admin, Super Admin)
router.get('/employees', AttendanceController.getEmployees);
router.post('/clock-in', AttendanceController.clockIn);
router.post('/clock-out', AttendanceController.clockOut);
router.get('/today', AttendanceController.getTodayStatus);
router.get('/summary', AttendanceController.getMonthlySummary);
router.get('/', AttendanceController.getAll);

// Ekspor Excel, Input Absensi Manual, Jadwal Libur & Sinkronisasi Alfa (Khusus Admin & Super Admin)
router.get('/export-excel', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), AttendanceController.exportExcel);
router.post('/manual', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), AttendanceController.manualEntry);
router.post('/leave', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), AttendanceController.recordBatchLeave);
router.post('/sync-alfa', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), AttendanceController.syncAutomaticAlfa);
router.put('/:id/status', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), AttendanceController.updateStatus);
router.delete('/:id', requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN), AttendanceController.deleteAttendance);

export default router;

