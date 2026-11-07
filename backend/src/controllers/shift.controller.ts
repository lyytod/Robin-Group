import { Response } from 'express';
import { ShiftService } from '../services/shift.service.js';
import { sendSuccess, sendError } from '../utils/helpers.js';
import { AuthenticatedRequest } from '../types/index.js';

export class ShiftController {
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const shifts = await ShiftService.getShifts(businessId);
      sendSuccess(res, shifts, 'Daftar shift berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil daftar shift', 400);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      if (!businessId || isNaN(id)) {
        sendError(res, 'ID shift dan unit usaha diperlukan.', 400);
        return;
      }
      const shift = await ShiftService.getShiftById(id, businessId);
      sendSuccess(res, shift, 'Detail shift berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil detail shift', 404);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const { name, startTime, endTime, gracePeriodMinutes, isActive } = req.body;
      const shift = await ShiftService.createShift({
        businessId,
        name,
        startTime,
        endTime,
        gracePeriodMinutes,
        isActive,
      });
      sendSuccess(res, shift, 'Shift kerja baru berhasil ditambahkan', 201);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal membuat shift kerja', 400);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      if (!businessId || isNaN(id)) {
        sendError(res, 'ID shift dan unit usaha diperlukan.', 400);
        return;
      }
      const shift = await ShiftService.updateShift(id, businessId, req.body);
      sendSuccess(res, shift, 'Shift kerja berhasil diperbarui');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal memperbarui shift kerja', 400);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      if (!businessId || isNaN(id)) {
        sendError(res, 'ID shift dan unit usaha diperlukan.', 400);
        return;
      }
      await ShiftService.deleteShift(id, businessId);
      sendSuccess(res, null, 'Shift kerja berhasil dinonaktifkan');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menghapus shift kerja', 400);
    }
  }

  static async getOperationalRule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const rule = await ShiftService.getOperationalRule(businessId);
      sendSuccess(res, rule, 'Kebijakan jam operasional berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil aturan operasional', 400);
    }
  }

  static async updateOperationalRule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const rule = await ShiftService.updateOperationalRule(businessId, req.body);
      sendSuccess(res, rule, 'Kebijakan jam operasional & bonus kedisiplinan berhasil diperbarui');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal memperbarui kebijakan operasional', 400);
    }
  }
}
