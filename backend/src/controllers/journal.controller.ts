import { Response } from 'express';
import { JournalService } from '../services/journal.service.js';
import { sendSuccess, sendError, parsePagination } from '../utils/helpers.js';
import { AuthenticatedRequest } from '../types/index.js';
import { JournalEntryType } from '@prisma/client';

export class JournalController {
  /**
   * POST /api/journals/manual
   * Input jurnal umum manual (penyesuaian, modal, dll)
   */
  static async createManual(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId || !req.user) {
        sendError(res, 'Autentikasi dan unit usaha diperlukan.', 401);
        return;
      }
      const result = await JournalService.createManual(businessId, req.user.userId, req.body);
      sendSuccess(res, result, 'Jurnal manual berhasil dicatat dengan prinsip double-entry', 201);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menyimpan jurnal manual', 400);
    }
  }

  /**
   * GET /api/journals
   * Daftar jurnal umum
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
      const type = req.query.type as JournalEntryType | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const search = req.query.search as string | undefined;
      const sortBy = req.query.sortBy as 'date' | 'amount' | 'nomor' | undefined;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;

      const result = await JournalService.getAll({
        businessId,
        type,
        startDate,
        endDate,
        search,
        sortBy,
        sortOrder,
        page,
        limit,
        skip,
      });

      sendSuccess(res, result.journals, 'Daftar jurnal berhasil diambil', 200, result.meta);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil daftar jurnal', 400);
    }
  }

  /**
   * GET /api/journals/:id
   * Detail satu jurnal
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
        sendError(res, 'ID jurnal tidak valid.', 400);
        return;
      }

      const result = await JournalService.getById(id, businessId);
      sendSuccess(res, result, 'Detail jurnal berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil detail jurnal', 400);
    }
  }

  /**
   * PUT /api/journals/manual/:id
   * Perbarui jurnal manual
   */
  static async updateManual(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId || !req.user) {
        sendError(res, 'Autentikasi dan unit usaha diperlukan.', 401);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID jurnal tidak valid.', 400);
        return;
      }

      const result = await JournalService.updateManual(id, businessId, req.user.userId, req.body);
      sendSuccess(res, result, 'Jurnal manual berhasil diperbarui');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal memperbarui jurnal manual', 400);
    }
  }

  /**
   * DELETE /api/journals/manual/:id
   * Hapus jurnal manual
   */
  static async deleteManual(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId || !req.user) {
        sendError(res, 'Autentikasi dan unit usaha diperlukan.', 401);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID jurnal tidak valid.', 400);
        return;
      }

      const result = await JournalService.deleteManual(id, businessId, req.user.userId);
      sendSuccess(res, result, 'Jurnal manual berhasil dihapus');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menghapus jurnal manual', 400);
    }
  }

  /**
   * GET /api/journals/ledger/:accountId
   * Riwayat Buku Besar (General Ledger) per akun
   */
  static async getLedger(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const accountId = parseInt(String(req.params.accountId), 10);
      if (isNaN(accountId)) {
        sendError(res, 'ID akun tidak valid.', 400);
        return;
      }
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = await JournalService.getLedger({
        businessId,
        accountId,
        startDate,
        endDate,
      });

      sendSuccess(res, result, 'Data buku besar berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil data buku besar', 400);
    }
  }
}
