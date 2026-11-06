import { Response } from 'express';
import { BusinessService } from '../services/business.service.js';
import { sendSuccess, sendError } from '../utils/helpers.js';
import { AuthenticatedRequest } from '../types/index.js';

export class BusinessController {
  /**
   * GET /api/businesses
   */
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Autentikasi diperlukan', 401);
        return;
      }
      const includeInactive = req.query.includeInactive === 'true';
      const result = await BusinessService.getAll(req.user.userId, req.user.role, includeInactive);
      sendSuccess(res, result, 'Daftar unit usaha berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil daftar unit usaha', 400);
    }
  }

  /**
   * GET /api/businesses/:id
   */
  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Autentikasi diperlukan', 401);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID unit usaha tidak valid', 400);
        return;
      }
      const result = await BusinessService.getById(id, req.user.userId, req.user.role);
      sendSuccess(res, result, 'Detail unit usaha berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil detail unit usaha', 400);
    }
  }

  /**
   * POST /api/businesses
   */
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Autentikasi diperlukan', 401);
        return;
      }
      const result = await BusinessService.create(req.body, req.user.userId);
      sendSuccess(res, result, 'Unit usaha berhasil dibuat dan akun CoA standar telah diinisialisasi', 201);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal membuat unit usaha baru', 400);
    }
  }

  /**
   * PUT /api/businesses/:id
   */
  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID unit usaha tidak valid', 400);
        return;
      }
      const result = await BusinessService.update(id, req.body);
      sendSuccess(res, result, 'Informasi unit usaha berhasil diperbarui');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal memperbarui unit usaha', 400);
    }
  }

  /**
   * DELETE /api/businesses/:id (Soft delete)
   */
  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID unit usaha tidak valid', 400);
        return;
      }
      const result = await BusinessService.softDelete(id);
      sendSuccess(res, result, 'Unit usaha berhasil dinonaktifkan');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menghapus unit usaha', 400);
    }
  }
}
