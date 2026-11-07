import { Request } from 'express';

// Tipe standar untuk respons API
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Tipe payload JWT
export interface JwtPayload {
  userId: number;
  username: string;
  fullName: string;
  role: UserRoleType;
  businessIds: number[]; // ID usaha yang diizinkan untuk user ini
}

export interface AuthenticatedUser {
  userId: number;
  username: string;
  fullName: string;
  role: UserRoleType;
  businessIds: number[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  businessId?: number;
}

// Enum untuk peran pengguna (harus sinkron dengan Prisma schema)
export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  KASIR: 'KASIR',
  AGENT: 'AGENT',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// Enum tipe akun akuntansi
export const AccountType = {
  ASET: 'ASET',
  KEWAJIBAN: 'KEWAJIBAN',
  EKUITAS: 'EKUITAS',
  PENDAPATAN: 'PENDAPATAN',
  BEBAN: 'BEBAN',
} as const;

export type AccountTypeValue = (typeof AccountType)[keyof typeof AccountType];

// Enum tipe normal saldo akun
export const NormalBalance = {
  DEBIT: 'DEBIT',
  KREDIT: 'KREDIT',
} as const;

export type NormalBalanceType = (typeof NormalBalance)[keyof typeof NormalBalance];

// Enum tipe jurnal
export const JournalEntryType = {
  PENJUALAN: 'PENJUALAN',
  PENGELUARAN: 'PENGELUARAN',
  PENYESUAIAN: 'PENYESUAIAN',
  TRANSFER: 'TRANSFER',
  PEMBUKAAN: 'PEMBUKAAN',
  PENUTUPAN: 'PENUTUPAN',
} as const;

export type JournalEntryTypeValue =
  (typeof JournalEntryType)[keyof typeof JournalEntryType];

// Enum tipe transaksi
export const TransactionType = {
  PEMASUKAN: 'PEMASUKAN',
  PENGELUARAN: 'PENGELUARAN',
} as const;

export type TransactionTypeValue =
  (typeof TransactionType)[keyof typeof TransactionType];

// Enum metode pembayaran
export const PaymentMethod = {
  TUNAI: 'TUNAI',
  TRANSFER: 'TRANSFER',
  QRIS: 'QRIS',
  DEBIT: 'DEBIT',
  KREDIT: 'KREDIT',
} as const;

export type PaymentMethodValue =
  (typeof PaymentMethod)[keyof typeof PaymentMethod];
