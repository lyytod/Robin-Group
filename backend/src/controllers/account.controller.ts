import { Response } from 'express';
import { AccountService } from '../services/account.service.js';
import { sendSuccess, sendError } from '../utils/helpers.js';
import { AuthenticatedRequest } from '../types/index.js';
import { AccountType } from '@prisma/client';

export class AccountController {
  /**
   * GET /api/accounts
   */
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const type = req.query.type as AccountType | undefined;
      const result = await AccountService.getAll(businessId, type);
      sendSuccess(res, result, 'Daftar akun akuntansi berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil daftar akun', 400);
    }
  }

  /**
   * GET /api/accounts/:id
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
        sendError(res, 'ID akun tidak valid', 400);
        return;
      }
      const result = await AccountService.getById(id, businessId);
      sendSuccess(res, result, 'Detail akun akuntansi berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil detail akun', 400);
    }
  }

  /**
   * POST /api/accounts
   */
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const result = await AccountService.create(businessId, req.body);
      sendSuccess(res, result, 'Akun akuntansi baru berhasil dibuat', 201);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal membuat akun akuntansi', 400);
    }
  }

  /**
   * PUT /api/accounts/:id
   */
  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID akun tidak valid', 400);
        return;
      }
      const result = await AccountService.update(id, businessId, req.body);
      sendSuccess(res, result, 'Akun akuntansi berhasil diperbarui');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal memperbarui akun akuntansi', 400);
    }
  }

  /**
   * DELETE /api/accounts/:id
   */
  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID akun tidak valid', 400);
        return;
      }
      await AccountService.delete(id, businessId);
      sendSuccess(res, null, 'Akun akuntansi berhasil dihapus');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menghapus akun akuntansi', 400);
    }
  }
}
