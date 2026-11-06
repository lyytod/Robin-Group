import { Response } from 'express';
import { ReportService } from '../services/report.service.js';
import { sendSuccess, sendError } from '../utils/helpers.js';
import { AuthenticatedRequest } from '../types/index.js';

export class ReportController {
  /**
   * GET /api/reports/income-statement
   */
  static async getIncomeStatement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId; // Jika Super Admin konsolidasi, bisa undefined
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = await ReportService.getIncomeStatement({
        businessId,
        startDate,
        endDate,
      });

      sendSuccess(res, result, 'Laporan laba rugi berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal memuat laporan laba rugi', 400);
    }
  }

  /**
   * GET /api/reports/balance-sheet
   */
  static async getBalanceSheet(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      const asOfDate = req.query.asOfDate as string | undefined;

      const result = await ReportService.getBalanceSheet({
        businessId,
        asOfDate,
      });

      sendSuccess(res, result, 'Laporan neraca berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal memuat laporan neraca', 400);
    }
  }

  /**
   * GET /api/reports/cash-flow
   */
  static async getCashFlow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = await ReportService.getCashFlow({
        businessId,
        startDate,
        endDate,
      });

      sendSuccess(res, result, 'Laporan arus kas berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal memuat laporan arus kas', 400);
    }
  }

  /**
   * GET /api/reports/dashboard
   */
  static async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      const result = await ReportService.getDashboardSummary(businessId);
      sendSuccess(res, result, 'Data dashboard berhasil diambil');
    } catch (error: any) {
      sendError(res, error.message || 'Gagal memuat data dashboard', 400);
    }
  }

  /**
   * GET /api/reports/export/excel
   */
  static async exportExcel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const businessId = req.businessId;
      const type = (req.query.type as string) === 'BALANCE_SHEET' ? 'BALANCE_SHEET' : 'INCOME_STATEMENT';
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const asOfDate = req.query.asOfDate as string | undefined;

      const buffer = await ReportService.exportExcel(type, {
        businessId,
        startDate,
        endDate,
        asOfDate,
      });

      const filename = `Laporan_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      sendError(res, error.message || 'Gagal mengekspor laporan ke Excel', 400);
    }
  }
}
