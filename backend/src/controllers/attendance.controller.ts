import { Response } from 'express';
import { AttendanceService } from '../services/attendance.service.js';
import { sendSuccess, sendError, parsePagination } from '../utils/helpers.js';
import { AuthenticatedRequest } from '../types/index.js';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceController {
  /**
   * GET /api/attendance/employees (Dapat diakses oleh Kasir, Admin, Super Admin)
   */
  static async getEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const employees = await AttendanceService.getEmployees(businessId);
      sendSuccess(res, employees, 'Daftar staf aktif untuk absensi berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil data staf', 400);
    }
  }

  /**
   * POST /api/attendance/clock-in
   */
  static async clockIn(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const { employeeId, shiftId, photo, notes, customTime } = req.body;
      if (!employeeId) {
        sendError(res, 'Karyawan wajib dipilih.', 400);
        return;
      }

      const result = await AttendanceService.clockIn({
        businessId,
        employeeId: Number(employeeId),
        shiftId: shiftId ? Number(shiftId) : undefined,
        photo,
        notes,
        createdById: req.user?.userId,
        customTime,
      });

      sendSuccess(
        res,
        result,
        result.isLate
          ? `Absen masuk berhasil dicatat. Status: TERLAMBAT (${result.lateMinutes} menit).`
          : 'Absen masuk berhasil dicatat. Status: HADIR TEPAT WAKTU.',
        201
      );
    } catch (error: any) {
      sendError(res, error.message || 'Gagal melakukan absen masuk', 400);
    }
  }

  /**
   * POST /api/attendance/clock-out
   */
  static async clockOut(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const { employeeId, photo, notes, customTime } = req.body;
      if (!employeeId) {
        sendError(res, 'Karyawan wajib dipilih.', 400);
        return;
      }

      const result = await AttendanceService.clockOut({
        businessId,
        employeeId: Number(employeeId),
        photo,
        notes,
        customTime,
      });

      sendSuccess(res, result, 'Absen pulang berhasil dicatat. Terima kasih atas kerja keras Anda hari ini!');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal melakukan absen pulang', 400);
    }
  }

  /**
   * POST /api/attendance/manual
   */
  static async manualEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }
      const { employeeId, date, status, notes, shiftId } = req.body;
      if (!employeeId || !date || !status) {
        sendError(res, 'Karyawan, tanggal, dan status kehadiran wajib diisi.', 400);
        return;
      }

      const result = await AttendanceService.manualEntry({
        businessId,
        employeeId: Number(employeeId),
        date,
        status: status as AttendanceStatus,
        notes,
        createdById: req.user?.userId,
        shiftId: shiftId ? Number(shiftId) : undefined,
      });

      sendSuccess(res, result, `Kehadiran manual (${status}) berhasil dicatat.`);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mencatat kehadiran manual', 400);
    }
  }

  /**
   * GET /api/attendance/today
   */
  static async getTodayStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }

      const data = await AttendanceService.getTodayStatus(businessId);
      sendSuccess(res, data, 'Status kehadiran hari ini berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil status kehadiran hari ini', 400);
    }
  }

  /**
   * GET /api/attendance
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
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
      const status = req.query.status as AttendanceStatus | undefined;

      const result = await AttendanceService.getAll({
        businessId,
        startDate,
        endDate,
        employeeId,
        status,
        page,
        limit,
        skip,
      });

      sendSuccess(res, result.items, 'Riwayat absensi berhasil diambil', 200, result.meta);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengambil riwayat absensi', 400);
    }
  }

  /**
   * GET /api/attendance/summary
   */
  static async getMonthlySummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }

      const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const month = req.query.month ? Number(req.query.month) : undefined;
      const year = req.query.year ? Number(req.query.year) : undefined;

      const summary = await AttendanceService.getMonthlySummary({
        businessId,
        employeeId,
        startDate,
        endDate,
        month,
        year,
      });

      sendSuccess(res, summary, 'Rekapitulasi absensi & kedisiplinan berhasil dihitung');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menghitung rekapitulasi absensi', 400);
    }
  }

  /**
   * GET /api/attendance/export-excel
   */
  static async exportExcel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }

      const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const buffer = await AttendanceService.exportExcel({
        businessId,
        startDate,
        endDate,
        employeeId,
      });

      const filename = `Laporan_Absensi_${new Date().toISOString().slice(0, 10)}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengekspor laporan absensi', 400);
    }
  }

  /**
   * POST /api/attendance/leave (Catat hari libur/cuti/izin dalam jumlah multi tanggal sekaligus)
   */
  static async recordBatchLeave(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }

      const { employeeId, dates, status, notes } = req.body;
      if (!employeeId || !Array.isArray(dates) || dates.length === 0 || !status) {
        sendError(res, 'Karyawan, daftar tanggal, dan status wajib diisi.', 400);
        return;
      }

      const result = await AttendanceService.recordBatchLeave({
        businessId,
        employeeId: Number(employeeId),
        dates,
        status: status as AttendanceStatus,
        notes,
        createdById: req.user?.userId,
      });

      sendSuccess(res, result, result.message, 201);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mencatat jadwal libur/cuti karyawan', 400);
    }
  }

  /**
   * POST /api/attendance/sync-alfa (Sinkronisasi otomatis ketidakhadiran lampau menjadi Alfa)
   */
  static async syncAutomaticAlfa(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }

      const { startDate, endDate, employeeId } = req.body;
      const result = await AttendanceService.syncAutomaticAlfa({
        businessId,
        startDate,
        endDate,
        employeeId: employeeId ? Number(employeeId) : undefined,
        createdById: req.user?.userId,
      });

      sendSuccess(res, result, result.message);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menyinkronkan data alfa otomatis', 400);
    }
  }

  /**
   * PUT /api/attendance/:id/status (Revisi/Ubah status absensi, misal Alfa diubah ke Sakit/Libur)
   */
  static async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }

      const id = Number(req.params.id);
      const { status, notes } = req.body;
      if (!id || !status) {
        sendError(res, 'ID absensi dan status baru wajib ditentukan.', 400);
        return;
      }

      const result = await AttendanceService.updateAttendanceStatus({
        id,
        businessId,
        status: status as AttendanceStatus,
        notes,
        createdById: req.user?.userId,
      });

      sendSuccess(res, result, 'Status absensi berhasil diperbarui.');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal memperbarui status absensi', 400);
    }
  }

  /**
   * DELETE /api/attendance/:id (Hapus catatan absensi / jadwal libur manual)
   */
  static async deleteAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      if (!businessId) {
        sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
        return;
      }

      const id = Number(req.params.id);
      if (!id) {
        sendError(res, 'ID absensi wajib ditentukan.', 400);
        return;
      }

      await AttendanceService.deleteAttendance(id, businessId);
      sendSuccess(res, null, 'Catatan absensi / jadwal libur berhasil dihapus.');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal menghapus catatan absensi', 400);
    }
  }
}
