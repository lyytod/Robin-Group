import { Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { sendSuccess, sendError } from '../utils/helpers.js';
import { AuthenticatedRequest } from '../types/index.js';

export class AuthController {
  /**
   * POST /api/auth/login
   */
  static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      const result = await AuthService.login(username, password);
      sendSuccess(res, result, 'Login berhasil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal melakukan login', 400);
    }
  }

  /**
   * GET /api/auth/me
   */
  static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Autentikasi diperlukan', 401);
        return;
      }
      const result = await AuthService.getMe(req.user.userId);
      sendSuccess(res, result, 'Profil pengguna berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil data profil', 400);
    }
  }

  /**
   * POST /api/auth/change-password
   */
  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Autentikasi diperlukan', 401);
        return;
      }
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.user.userId, currentPassword, newPassword);
      sendSuccess(res, null, 'Kata sandi berhasil diperbarui');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengubah kata sandi', 400);
    }
  }
}
