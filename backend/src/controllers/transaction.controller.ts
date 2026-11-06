import { Response } from 'express';
import { TransactionService } from '../services/transaction.service.js';
import { sendSuccess, sendError, parsePagination } from '../utils/helpers.js';
import { AuthenticatedRequest } from '../types/index.js';
import { TransactionType } from '@prisma/client';

export class TransactionController {
  /**
   * POST /api/transactions/sale
   * Input transaksi penjualan kasir (POS)
   */
  static async createSale(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId || !req.user) {
        sendError(res, 'Autentikasi dan unit usaha diperlukan.', 401);
        return;
      }
      const result = await TransactionService.createSale(businessId, req.user.userId, req.body);
      sendSuccess(res, result, 'Transaksi penjualan berhasil disimpan dan jurnal telah dicatat', 201);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menyimpan transaksi penjualan', 400);
    }
  }

  /**
   * POST /api/transactions/expense
   * Input pengeluaran kas operasional
   */
  static async createExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId || !req.user) {
        sendError(res, 'Autentikasi dan unit usaha diperlukan.', 401);
        return;
      }
      const result = await TransactionService.createExpense(businessId, req.user.userId, req.body);
      sendSuccess(res, result, 'Pengeluaran kas berhasil disimpan dan jurnal telah dicatat', 201);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menyimpan pengeluaran kas', 400);
    }
  }

  /**
   * POST /api/transactions/:id/void
   * Membatalkan transaksi & menerbitkan jurnal pembalik
   */
  static async voidTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId || !req.user) {
        sendError(res, 'Autentikasi dan unit usaha diperlukan.', 401);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID transaksi tidak valid.', 400);
        return;
      }
      const { reason } = req.body;
      const result = await TransactionService.voidTransaction(id, businessId, req.user.userId, reason);
      sendSuccess(res, result, 'Transaksi berhasil dibatalkan (void)');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal membatalkan transaksi', 400);
    }
  }

  /**
   * GET /api/transactions
   * Daftar riwayat transaksi
   */
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const { page, limit, skip } = parsePagination(
        req.query.page as string,
        req.query.limit as string
      );
      const type = req.query.type as TransactionType | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await TransactionService.getAll({
        businessId,
        type,
        startDate,
        endDate,
        search,
        page,
        limit,
        skip,
      });

      sendSuccess(res, result.transactions, 'Daftar transaksi berhasil diambil', 200, result.meta);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil daftar transaksi', 400);
    }
  }

  /**
   * GET /api/transactions/:id
   * Detail transaksi lengkap
   */
  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID transaksi tidak valid.', 400);
        return;
      }
      const result = await TransactionService.getById(id, businessId);
      sendSuccess(res, result, 'Detail transaksi berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil detail transaksi', 400);
    }
  }
}
