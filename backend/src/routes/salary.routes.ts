import { Router } from 'express';
import { SalaryController } from '../controllers/salary.controller.js';
import { authenticate, requireBusinessAccess, requireRoles } from '../middlewares/auth.middleware.js';
import { UserRole } from '../types/index.js';

const router = Router();

// Semua rute manajemen gaji memerlukan autentikasi, hak akses unit usaha, dan peran Super Admin atau Admin
router.use(authenticate, requireBusinessAccess, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN));

// Summary KPI
router.get('/summary', SalaryController.getSummary);

// Manajemen Karyawan / Staf
router.get('/employees', SalaryController.getEmployees);
router.post('/employees', SalaryController.createEmployee);
router.get('/employees/:id', SalaryController.getEmployeeById);
router.get('/employees/:id/pending-deductions', SalaryController.getPendingDeductions);
router.put('/employees/:id', SalaryController.updateEmployee);
router.delete('/employees/:id', SalaryController.deleteEmployee);

// Catatan Kasbon & Potongan Staf
router.get('/deductions', SalaryController.getDeductions);
router.post('/deductions', SalaryController.createDeduction);
router.delete('/deductions/:id', SalaryController.deleteDeduction);

// Riwayat & Input Pembayaran Gaji (Payroll Run)
router.get('/payments', SalaryController.getPayments);
router.post('/payments', SalaryController.createPayment);
router.get('/payments/:id', SalaryController.getPaymentById);
router.delete('/payments/:id', SalaryController.deletePayment);

export default router;

