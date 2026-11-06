import { Response } from 'express';
import { UserService } from '../services/user.service.js';
import { sendSuccess, sendError, parsePagination } from '../utils/helpers.js';
import { AuthenticatedRequest, UserRoleType } from '../types/index.js';

export class UserController {
  /**
   * GET /api/users
   */
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { page, limit, skip } = parsePagination(
        req.query.page as string,
        req.query.limit as string
      );
      const search = req.query.search as string | undefined;
      const role = req.query.role as UserRoleType | undefined;
      const businessId = req.query.businessId
        ? parseInt(req.query.businessId as string, 10)
        : undefined;

      const result = await UserService.getAll({
        search,
        role,
        businessId,
        page,
        limit,
        skip,
      });

      sendSuccess(res, result.users, 'Daftar pengguna berhasil diambil', 200, result.meta);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil daftar pengguna', 400);
    }
  }

  /**
   * GET /api/users/:id
   */
  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID pengguna tidak valid', 400);
        return;
      }
      const result = await UserService.getById(id);
      sendSuccess(res, result, 'Detail pengguna berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil detail pengguna', 400);
    }
  }

  /**
   * POST /api/users
   */
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await UserService.create(req.body);
      sendSuccess(res, result, 'Pengguna baru berhasil dibuat', 201);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal membuat pengguna baru', 400);
    }
  }

  /**
   * PUT /api/users/:id
   */
  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID pengguna tidak valid', 400);
        return;
      }
      const result = await UserService.update(id, req.body);
      sendSuccess(res, result, 'Informasi pengguna berhasil diperbarui');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal memperbarui pengguna', 400);
    }
  }

  /**
   * DELETE /api/users/:id (Soft delete)
   */
  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Autentikasi diperlukan', 401);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID pengguna tidak valid', 400);
        return;
      }
      const result = await UserService.softDelete(id, req.user.userId);
      sendSuccess(res, result, 'Pengguna berhasil dihapus');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menghapus pengguna', 400);
    }
  }
}
