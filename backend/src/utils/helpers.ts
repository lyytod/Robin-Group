import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '../types/index.js';

/**
 * Mengirim respons sukses standar
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Berhasil',
  statusCode = 200,
  meta?: PaginationMeta
): void {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    ...(meta && { meta }),
  };
  res.status(statusCode).json(response);
}

/**
 * Mengirim respons error standar
 */
export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  data?: unknown
): void {
  const response: ApiResponse = {
    success: false,
    message,
    ...(data !== undefined && { data }),
  };
  res.status(statusCode).json(response);
}

/**
 * Format angka ke format mata uang Rupiah
 * Contoh: 1500000 => "Rp 1.500.000"
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate nomor bukti transaksi unik
 * Format: PREFIX-[BUSINESS_CODE-]YYYYMMDD-XXXX
 * Contoh: TRX-CAFE01-20241015-0001
 */
export function generateNomorBukti(prefix: string, sequence: number, businessCode?: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  const bCode = businessCode ? `${businessCode.toUpperCase()}-` : '';
  return `${prefix}-${bCode}${year}${month}${day}-${seq}`;
}

/**
 * Format tanggal ke format Indonesia
 * Contoh: "15 Oktober 2024"
 */
export function formatTanggalIndonesia(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Hitung total halaman untuk pagination
 */
export function calculateTotalPages(total: number, limit: number): number {
  return Math.ceil(total / limit);
}

/**
 * Parse parameter pagination dari query string dengan nilai default
 */
export function parsePagination(
  page?: string,
  limit?: string
): { page: number; limit: number; skip: number } {
  const parsedPage = Math.max(1, parseInt(page ?? '1', 10));
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10)));
  const skip = (parsedPage - 1) * parsedLimit;
  return { page: parsedPage, limit: parsedLimit, skip };
}

/**
 * Konversi input tanggal menjadi objek Date dengan waktu lokal yang presisi.
 * Jika input hanya string tanggal YYYY-MM-DD tanpa jam, otomatis gabungkan dengan jam:menit:detik saat ini pada waktu lokal server/perangkat.
 */
export function resolveLocalDateTime(inputDate?: string | Date | null): Date {
  if (!inputDate) return new Date();
  if (inputDate instanceof Date) return inputDate;

  const str = String(inputDate).trim();
  if (!str) return new Date();

  // Jika format tanggal YYYY-MM-DD tanpa jam
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const now = new Date();
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

