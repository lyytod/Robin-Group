import { Response } from 'express';
import { InventoryService } from '../services/inventory.service.js';
import { sendSuccess, sendError, parsePagination } from '../utils/helpers.js';
import { AuthenticatedRequest } from '../types/index.js';

export class InventoryController {
  /**
   * GET /api/inventory
   */
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const category = req.query.category as string | undefined;
      const lowStock = req.query.lowStock === 'true';

      const result = await InventoryService.getAll({
        businessId: req.businessId,
        search,
        category,
        lowStock,
        page,
        limit,
        skip,
      });

      sendSuccess(
        res,
        { items: result.items, stats: result.stats },
        'Daftar barang inventaris berhasil diambil',
        200,
        result.meta
      );
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil data inventaris', 400);
    }
  }

  /**
   * GET /api/inventory/:id
   */
  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID barang tidak valid', 400);
        return;
      }

      const result = await InventoryService.getById(id, req.businessId);
      sendSuccess(res, result, 'Detail barang inventaris berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil detail inventaris', 400);
    }
  }

  /**
   * POST /api/inventory
   */
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }

      const result = await InventoryService.create({
        ...req.body,
        businessId: req.businessId,
        userId: req.user?.userId,
      });

      sendSuccess(res, result, 'Barang inventaris berhasil ditambahkan', 201);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menambahkan barang inventaris', 400);
    }
  }

  /**
   * PUT /api/inventory/:id
   */
  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID barang tidak valid', 400);
        return;
      }

      const result = await InventoryService.update(id, req.businessId, req.body);
      sendSuccess(res, result, 'Data barang inventaris berhasil diperbarui');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal memperbarui barang inventaris', 400);
    }
  }

  /**
   * POST /api/inventory/movement
   */
  static async recordMovement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }

      const result = await InventoryService.recordMovement({
        ...req.body,
        businessId: req.businessId,
        userId: req.user?.userId,
      });

      sendSuccess(res, result, 'Mutasi stok berhasil dicatat', 201);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mencatat mutasi stok', 400);
    }
  }

  /**
   * GET /api/inventory/:id/movements
   */
  static async getMovements(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID barang tidak valid', 400);
        return;
      }

      const result = await InventoryService.getMovements(id, req.businessId);
      sendSuccess(res, result, 'Riwayat mutasi stok berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil riwayat mutasi stok', 400);
    }
  }

  /**
   * DELETE /api/inventory/:id
   */
  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.businessId) {
        sendError(res, 'Unit usaha aktif diperlukan', 400);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID barang tidak valid', 400);
        return;
      }

      const result = await InventoryService.softDelete(id, req.businessId);
      sendSuccess(res, result, 'Barang inventaris berhasil dihapus');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menghapus barang inventaris', 400);
    }
  }
}
