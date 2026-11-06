import { Response } from 'express';
import { SalaryService } from '../services/salary.service.js';
import { sendSuccess, sendError, parsePagination } from '../utils/helpers.js';
import { AuthenticatedRequest } from '../types/index.js';

export class SalaryController {
  /**
   * GET /api/salaries/summary
   */
  static async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }
      const data = await SalaryService.getSummary(req.businessId);
      sendSuccess(res, data, 'Ringkasan gaji berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil ringkasan gaji', 400);
    }
  }

  // ============================================================
  // KARYAWAN / STAF
  // ============================================================

  /**
   * GET /api/salaries/employees
   */
  static async getEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }

      const { page, limit, skip } = parsePagination(
        req.query.page as string,
        req.query.limit as string
      );
      const search = req.query.search as string | undefined;
      const isActive =
        req.query.isActive === 'true'
          ? true
          : req.query.isActive === 'false'
            ? false
            : undefined;

      const result = await SalaryService.getEmployees({
        businessId: req.businessId,
        search,
        isActive,
        page,
        limit,
        skip,
      });

      sendSuccess(res, result.items, 'Daftar karyawan berhasil diambil', 200, result.meta);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil data karyawan', 400);
    }
  }

  /**
   * GET /api/salaries/employees/:id
   */
  static async getEmployeeById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID karyawan tidak valid', 400);
        return;
      }

      const result = await SalaryService.getEmployeeById(id, req.businessId);
      sendSuccess(res, result, 'Detail karyawan berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil detail karyawan', 400);
    }
  }

  /**
   * POST /api/salaries/employees
   */
  static async createEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }

      const result = await SalaryService.createEmployee({
        ...req.body,
        businessId: req.businessId,
      });

      sendSuccess(res, result, 'Data karyawan berhasil ditambahkan', 201);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menambahkan karyawan', 400);
    }
  }

  /**
   * PUT /api/salaries/employees/:id
   */
  static async updateEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID karyawan tidak valid', 400);
        return;
      }

      const result = await SalaryService.updateEmployee(id, req.businessId, req.body);
      sendSuccess(res, result, 'Data karyawan berhasil diperbarui');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal memperbarui data karyawan', 400);
    }
  }

  /**
   * DELETE /api/salaries/employees/:id
   */
  static async deleteEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID karyawan tidak valid', 400);
        return;
      }

      const result = await SalaryService.deleteEmployee(id, req.businessId);
      sendSuccess(res, result, result.message);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menghapus karyawan', 400);
    }
  }

  // ============================================================
  // PEMBAYARAN GAJI (PAYROLL)
  // ============================================================

  /**
   * GET /api/salaries/payments
   */
  static async getPayments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }

      const { page, limit, skip } = parsePagination(
        req.query.page as string,
        req.query.limit as string
      );
      const search = req.query.search as string | undefined;
      const employeeId = req.query.employeeId
        ? parseInt(String(req.query.employeeId), 10)
        : undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = await SalaryService.getPayments({
        businessId: req.businessId,
        employeeId,
        startDate,
        endDate,
        search,
        page,
        limit,
        skip,
      });

      sendSuccess(res, result.items, 'Daftar pembayaran gaji berhasil diambil', 200, result.meta);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil riwayat pembayaran gaji', 400);
    }
  }

  /**
   * GET /api/salaries/payments/:id
   */
  static async getPaymentById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID pembayaran tidak valid', 400);
        return;
      }

      const result = await SalaryService.getPaymentById(id, req.businessId);
      sendSuccess(res, result, 'Detail slip gaji berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil detail pembayaran gaji', 400);
    }
  }

  /**
   * POST /api/salaries/payments
   */
  static async createPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }

      const result = await SalaryService.createPayment({
        ...req.body,
        businessId: req.businessId,
        createdById: req.user?.userId || 1,
      });

      sendSuccess(res, result.payment, result.message, 201);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal memproses pembayaran gaji', 400);
    }
  }

  /**
   * DELETE /api/salaries/payments/:id
   */
  static async deletePayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID pembayaran tidak valid', 400);
        return;
      }

      const result = await SalaryService.deletePayment(id, req.businessId);
      sendSuccess(res, result, result.message);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menghapus pembayaran gaji', 400);
    }
  }

  // ============================================================
  // CATATAN KASBON & POTONGAN
  // ============================================================

  /**
   * GET /api/salaries/deductions
   */
  static async getDeductions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }

      const { page, limit, skip } = parsePagination(
        req.query.page as string,
        req.query.limit as string
      );
      const employeeId = req.query.employeeId
        ? parseInt(String(req.query.employeeId), 10)
        : undefined;
      const status = req.query.status as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = await SalaryService.getDeductions({
        businessId: req.businessId,
        employeeId,
        status,
        startDate,
        endDate,
        page,
        limit,
        skip,
      });

      sendSuccess(res, result.items, 'Daftar kasbon/potongan berhasil diambil', 200, result.meta);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil data kasbon/potongan', 400);
    }
  }

  /**
   * GET /api/salaries/employees/:id/pending-deductions
   */
  static async getPendingDeductions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }
      const employeeId = parseInt(String(req.params.id), 10);
      if (isNaN(employeeId)) {
        sendError(res, 'ID karyawan tidak valid', 400);
        return;
      }

      const result = await SalaryService.getPendingDeductionsByEmployee(employeeId, req.businessId);
      sendSuccess(res, result, 'Data akumulasi kasbon pending berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil data kasbon pending', 400);
    }
  }

  /**
   * POST /api/salaries/deductions
   */
  static async createDeduction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }

      const result = await SalaryService.createDeduction({
        ...req.body,
        businessId: req.businessId,
        createdById: req.user?.userId || 1,
      });

      sendSuccess(res, result, 'Catatan kasbon / potongan berhasil disimpan', 201);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menyimpan catatan kasbon/potongan', 400);
    }
  }

  /**
   * DELETE /api/salaries/deductions/:id
   */
  static async deleteDeduction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID tidak valid', 400);
        return;
      }

      const result = await SalaryService.deleteDeduction(id, req.businessId);
      sendSuccess(res, result, result.message);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menghapus kasbon/potongan', 400);
    }
  }
}

