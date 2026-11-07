import { Router, Response, NextFunction } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { AuthenticatedRequest, UserRole } from '../types/index.js';
import { sendError } from '../utils/helpers.js';

const router = Router();

// Middleware fleksibel untuk laporan: Super Admin bisa konsolidasi tanpa businessId,
// sedangkan Admin/Kasir wajib memiliki businessId yang valid
function reportAccessMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    sendError(res, 'Autentikasi diperlukan', 401);
    return;
  }

  // Kasir dan Agent tidak memiliki akses ke laporan keuangan atau dashboard analitik
  if (req.user.role === UserRole.KASIR || req.user.role === UserRole.AGENT) {
    sendError(res, 'Akses ditolak: Pengguna dengan peran Kasir atau Agent tidak diizinkan mengakses laporan keuangan.', 403);
    return;
  }

  // Cek apakah parameter request secara eksplisit meminta konsolidasi seluruh unit usaha
  const isConsolidated =
    req.query.consolidated === 'true' ||
    req.query.businessId === 'all' ||
    req.headers['x-consolidated'] === 'true';

  if (isConsolidated) {
    if (req.user.role !== UserRole.SUPER_ADMIN) {
      sendError(res, 'Akses ditolak: Hanya Super Admin yang dapat mengakses laporan konsolidasi seluruh usaha.', 403);
      return;
    }
    req.businessId = undefined; // Undefined = Konsolidasi Seluruh Usaha
    next();
    return;
  }

  // Jika bukan konsolidasi, prioritaskan query parameter businessId jika dikirimkan oleh pemanggil
  const queryBizId = req.query.businessId;
  const rawId =
    (typeof queryBizId === 'string' && queryBizId !== '' && queryBizId !== 'all' ? queryBizId : undefined) ||
    req.body?.businessId ||
    req.headers['x-business-id'];

  if (rawId) {
    const businessId = parseInt(String(rawId), 10);
    if (!isNaN(businessId) && businessId > 0) {
      if (req.user.role !== UserRole.SUPER_ADMIN && !req.user.businessIds.includes(businessId)) {
        sendError(res, 'Akses ditolak untuk unit usaha ini.', 403);
        return;
      }
      req.businessId = businessId;
    }
  } else if (req.user.role !== UserRole.SUPER_ADMIN) {
    // Jika bukan Super Admin dan tidak menyediakan businessId, otomatis gunakan unit usaha pertamanya
    if (req.user.businessIds.length > 0) {
      req.businessId = req.user.businessIds[0];
    } else {
      sendError(res, 'Anda tidak ditugaskan pada unit usaha manapun.', 403);
      return;
    }
  }

  next();
}

router.use(authenticate);
router.use(reportAccessMiddleware);

router.get('/dashboard', ReportController.getDashboard);
router.get('/sales', ReportController.getSalesReport);
router.get('/export/sales-excel', ReportController.exportSalesExcel);
router.get('/income-statement', ReportController.getIncomeStatement);
router.get('/balance-sheet', ReportController.getBalanceSheet);
router.get('/cash-flow', ReportController.getCashFlow);
router.get('/export/excel', ReportController.exportExcel);

export default router;
