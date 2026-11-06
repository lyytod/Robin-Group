import { Response } from 'express';
import { BackupService } from '../services/backup.service.js';
import { sendSuccess, sendError } from '../utils/helpers.js';
import { AuthenticatedRequest } from '../types/index.js';

export class BackupController {
  /**
   * POST /api/backup/create
   */
  static async create(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await BackupService.createBackup();
      sendSuccess(res, result, 'Backup database berhasil dibuat', 201);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal membuat backup database', 500);
    }
  }

  /**
   * GET /api/backup/list
   */
  static async list(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = BackupService.listBackups();
      sendSuccess(res, result, 'Daftar backup database berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil daftar backup', 500);
    }
  }

  /**
   * GET /api/backup/download/:filename
   */
  static async download(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filename = String(req.params.filename);
      const filePath = BackupService.getBackupFilePath(filename);
      res.download(filePath, filename);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengunduh file backup', 404);
    }
  }
}
