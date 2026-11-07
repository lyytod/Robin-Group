// Tipe respons API standar dari backend
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

// User Types
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'KASIR' | 'AGENT';

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

// Business Types
export interface Business {
  id: number;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

// Account Types (CoA)
export type AccountType = 'ASET' | 'KEWAJIBAN' | 'EKUITAS' | 'PENDAPATAN' | 'BEBAN';
export type NormalBalance = 'DEBIT' | 'KREDIT';

export interface Account {
  id: number;
  businessId: number;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  parentId?: number;
  isActive: boolean;
  description?: string;
  children?: Account[];
}

// Product Types
export interface Product {
  id: number;
  businessId: number;
  code: string;
  name: string;
  category?: string;
  unit: string;
  sellingPrice: number;
  purchasePrice: number;
  currentStock: number;
  minimumStock: number;
  isActive: boolean;
  description?: string;
}

// Transaction Types
export type TransactionType = 'PEMASUKAN' | 'PENGELUARAN';
export type PaymentMethod = 'TUNAI' | 'TRANSFER' | 'QRIS' | 'DEBIT' | 'KREDIT';

export interface TransactionItem {
  id: number;
  transactionId: number;
  productId?: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Transaction {
  id: number;
  businessId: number;
  nomorBukti: string;
  type: TransactionType;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  cashPaid?: number;
  changeAmount?: number;
  notes?: string;
  transactionDate: string;
  voidedAt?: string;
  items: TransactionItem[];
}

// Journal Types
export type JournalEntryType =
  | 'PENJUALAN'
  | 'PENGELUARAN'
  | 'PENYESUAIAN'
  | 'TRANSFER'
  | 'PEMBUKAAN'
  | 'PENUTUPAN';

export interface JournalItem {
  id: number;
  journalEntryId: number;
  accountId: number;
  account?: Account;
  isDebit: boolean;
  amount: number;
  description?: string;
}

export interface JournalEntry {
  id: number;
  businessId: number;
  transactionId?: number;
  nomorJurnal: string;
  type: JournalEntryType;
  description: string;
  totalDebit: number;
  totalKredit: number;
  journalDate: string;
  isReversed: boolean;
  items: JournalItem[];
}

// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  businesses: Business[];
}

// Filter / Query Types
export interface DateRangeFilter {
  startDate: string;
  endDate: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}
