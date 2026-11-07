import { Response } from 'express';
import { ProductService } from '../services/product.service.js';
import { sendSuccess, sendError, parsePagination } from '../utils/helpers.js';
import { AuthenticatedRequest } from '../types/index.js';

export class ProductController {
  /**
   * GET /api/products
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
      const search = req.query.search as string | undefined;
      const category = req.query.category as string | undefined;
      const lowStockOnly = req.query.lowStock === 'true';

      const result = await ProductService.getAll({
        businessId,
        category,
        search,
        lowStockOnly,
        page,
        limit,
        skip,
      });

      sendSuccess(res, result.products, 'Daftar produk berhasil diambil', 200, result.meta);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil daftar produk', 400);
    }
  }

  /**
   * GET /api/products/categories
   */
  static async getCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const categories = await ProductService.getCategories(businessId);
      sendSuccess(res, categories, 'Daftar tipe/kategori menu berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil daftar tipe menu', 400);
    }
  }

  /**
   * GET /api/products/:id
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
        sendError(res, 'ID produk tidak valid', 400);
        return;
      }
      const result = await ProductService.getById(id, businessId);
      sendSuccess(res, result, 'Detail produk berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil detail produk', 400);
    }
  }

  /**
   * POST /api/products
   */
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const result = await ProductService.create(businessId, req.body);
      sendSuccess(res, result, 'Produk baru berhasil ditambahkan', 201);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menambahkan produk', 400);
    }
  }

  /**
   * PUT /api/products/:id
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
        sendError(res, 'ID produk tidak valid', 400);
        return;
      }
      const result = await ProductService.update(id, businessId, req.body);
      sendSuccess(res, result, 'Informasi produk berhasil diperbarui');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal memperbarui produk', 400);
    }
  }

  /**
   * POST /api/products/:id/adjust-stock
   */
  static async adjustStock(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        sendError(res, 'ID produk tidak valid', 400);
        return;
      }
      const result = await ProductService.adjustStock(id, businessId, req.body);
      sendSuccess(res, result, 'Stok produk berhasil disesuaikan');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menyesuaikan stok produk', 400);
    }
  }

  /**
   * DELETE /api/products/:id
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
        sendError(res, 'ID produk tidak valid', 400);
        return;
      }
      const result = await ProductService.softDelete(id, businessId);
      sendSuccess(res, result, 'Produk berhasil dinonaktifkan');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menonaktifkan produk', 400);
    }
  }

  /**
   * GET /api/products/stock-movements
   */
  static async getMovements(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const productId = req.query.productId
        ? parseInt(String(req.query.productId), 10)
        : undefined;

      const result = await ProductService.getMovements({
        businessId,
        productId,
        page,
        limit,
        skip,
      });

      sendSuccess(res, result.movements, 'Riwayat pergerakan stok berhasil diambil', 200, result.meta);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil riwayat stok', 400);
    }
  }
}
