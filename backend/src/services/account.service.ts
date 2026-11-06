import { prisma } from '../config/database.js';
import { AccountType, NormalBalance } from '@prisma/client';

/**
 * Daftar kode akun standar sistem yang terintegrasi otomatis
 * dengan alur transaksi Kasir POS, Inventaris & Mutasi Stok, serta Laporan Keuangan Neraca/Laba Rugi.
 * Akun ini dikunci dari penghapusan demi menjaga integritas sistem akuntansi double-entry.
 */
export const SYSTEM_LOCKED_ACCOUNT_CODES = [
  '1-1001', // Kas Utama / Kas Operasional (POS & Cash Flow)
  '1-1002', // Kas Kasir
  '1-1003', // Bank BCA / Bank Utama
  '1-1004', // Piutang Usaha
  '1-1005', // Persediaan Barang Dagang
  '1-1006', // Perlengkapan
  '1-2004', // Peralatan
  '2-1001', // Hutang Usaha
  '3-1001', // Modal Pemilik / Modal Disetor
  '3-2001', // Laba Ditahan (Retained Earnings)
  '4-1001', // Pendapatan Penjualan POS
  '5-1001', // Beban Pokok Penjualan (HPP)
  '5-1002', // Pembelian Bahan Baku
  '5-2006', // Beban Perlengkapan
  '5-2007', // Beban Pemeliharaan Peralatan
  '5-4003', // Beban Selisih Stok
];

/**
 * Helper untuk mengecek apakah suatu kode akun merupakan akun sistem yang dikunci
 */
export function isAccountSystemLocked(code: string): boolean {
  if (SYSTEM_LOCKED_ACCOUNT_CODES.includes(code)) return true;
  // Header akun induk golongan (misal 1-0000, 1-1000, 2-0000, dst)
  if (code.endsWith('-0000') || code.endsWith('000')) return true;
  return false;
}

export interface CreateAccountInput {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  parentId?: number | null;
  description?: string;
}

export interface UpdateAccountInput {
  code?: string;
  name?: string;
  type?: AccountType;
  normalBalance?: NormalBalance;
  description?: string;
  isActive?: boolean;
  parentId?: number | null;
}

export class AccountService {
  /**
   * Mengambil daftar seluruh akun CoA berdasarkan unit usaha
   */
  static async getAll(businessId: number, type?: AccountType) {
    const where: any = {
      businessId,
    };

    if (type) {
      where.type = type;
    }

    const accounts = await prisma.account.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        parent: {
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: { journalItems: true, children: true, inventoryItems: true },
        },
      },
    });

    return accounts.map((acc) => ({
      id: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      normalBalance: acc.normalBalance,
      parentId: acc.parentId,
      parent: acc.parent,
      isActive: acc.isActive,
      description: acc.description,
      hasJournalItems: acc._count.journalItems > 0,
      hasChildren: acc._count.children > 0,
      hasInventoryItems: acc._count.inventoryItems > 0,
      isLocked: isAccountSystemLocked(acc.code),
    }));
  }

  /**
   * Mengambil detail satu akun CoA
   */
  static async getById(id: number, businessId: number) {
    const account = await prisma.account.findFirst({
      where: { id, businessId },
      include: {
        parent: {
          select: { id: true, code: true, name: true },
        },
        children: {
          select: { id: true, code: true, name: true, type: true },
        },
        _count: {
          select: { journalItems: true, children: true, inventoryItems: true },
        },
      },
    });

    if (!account) {
      throw new Error('Akun akuntansi tidak ditemukan.');
    }

    return {
      ...account,
      isLocked: isAccountSystemLocked(account.code),
      hasJournalItems: account._count.journalItems > 0,
      hasChildren: account._count.children > 0,
      hasInventoryItems: account._count.inventoryItems > 0,
    };
  }

  /**
   * Membuat akun CoA baru untuk unit usaha
   */
  static async create(businessId: number, data: CreateAccountInput) {
    if (!data.code || !data.name || !data.type || !data.normalBalance) {
      throw new Error('Kode akun, nama akun, tipe akun, dan saldo normal wajib diisi.');
    }

    const cleanCode = data.code.trim();

    // Cek duplikasi kode pada unit usaha yang sama
    const existing = await prisma.account.findUnique({
      where: {
        businessId_code: {
          businessId,
          code: cleanCode,
        },
      },
    });

    if (existing) {
      throw new Error(`Akun dengan kode "${cleanCode}" sudah ada di unit usaha ini.`);
    }

    // Jika ada parentId, pastikan parent milik unit usaha yang sama
    if (data.parentId) {
      const parent = await prisma.account.findFirst({
        where: { id: data.parentId, businessId },
      });
      if (!parent) {
        throw new Error('Akun induk (parent) tidak ditemukan pada unit usaha ini.');
      }
    }

    return await prisma.account.create({
      data: {
        businessId,
        code: cleanCode,
        name: data.name.trim(),
        type: data.type,
        normalBalance: data.normalBalance,
        parentId: data.parentId || null,
        description: data.description?.trim() || null,
        isActive: true,
      },
    });
  }

  /**
   * Memperbarui informasi akun CoA
   */
  static async update(id: number, businessId: number, data: UpdateAccountInput) {
    const account = await prisma.account.findFirst({
      where: { id, businessId },
      include: {
        _count: {
          select: { journalItems: true, children: true, inventoryItems: true },
        },
      },
    });

    if (!account) {
      throw new Error('Akun akuntansi tidak ditemukan.');
    }

    const isLocked = isAccountSystemLocked(account.code);

    // Jika akun sistem terkunci, larang mengubah kode akun atau golongan tipe akun
    if (isLocked) {
      if (data.code && data.code.trim() !== account.code) {
        throw new Error(
          `Kode akun "${account.code}" adalah akun sistem yang terkunci dan tidak dapat diubah kodenya.`
        );
      }
      if (data.type && data.type !== account.type) {
        throw new Error(
          `Golongan akun "${account.code}" adalah akun sistem yang terkunci dan tidak dapat diubah tipenya.`
        );
      }
    }

    // Jika kode akun diubah pada akun kustom, cek duplikasi
    let cleanCode = account.code;
    if (data.code && data.code.trim() !== account.code) {
      cleanCode = data.code.trim();
      const existing = await prisma.account.findUnique({
        where: {
          businessId_code: {
            businessId,
            code: cleanCode,
          },
        },
      });
      if (existing && existing.id !== id) {
        throw new Error(`Akun dengan kode "${cleanCode}" sudah digunakan di unit usaha ini.`);
      }
    }

    // Jika mengubah parentId, pastikan valid dan bukan id diri sendiri
    if (data.parentId !== undefined && data.parentId !== null) {
      if (data.parentId === id) {
        throw new Error('Akun tidak dapat menjadi induk bagi dirinya sendiri.');
      }
      const parent = await prisma.account.findFirst({
        where: { id: data.parentId, businessId },
      });
      if (!parent) {
        throw new Error('Akun induk tidak ditemukan pada unit usaha ini.');
      }
    }

    return await prisma.account.update({
      where: { id },
      data: {
        code: cleanCode,
        ...(data.name && { name: data.name.trim() }),
        ...(data.type && !isLocked && { type: data.type }),
        ...(data.normalBalance && { normalBalance: data.normalBalance }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
    });
  }

  /**
   * Menghapus akun CoA (hanya untuk akun kustom yang tidak terkunci & belum memiliki transaksi)
   */
  static async delete(id: number, businessId: number) {
    const account = await prisma.account.findFirst({
      where: { id, businessId },
      include: {
        _count: {
          select: { journalItems: true, children: true, inventoryItems: true },
        },
      },
    });

    if (!account) {
      throw new Error('Akun akuntansi tidak ditemukan.');
    }

    // 1. Cek apakah akun sistem terkunci
    if (isAccountSystemLocked(account.code)) {
      throw new Error(
        `Akun "${account.code} - ${account.name}" adalah akun sistem standar yang dikunci untuk integrasi POS, inventaris, dan laporan keuangan sehingga tidak dapat dihapus.`
      );
    }

    // 2. Cek apakah memiliki transaksi jurnal umum (Prinsip Integritas Akuntansi)
    if (account._count.journalItems > 0) {
      throw new Error(
        `Akun "${account.code} - ${account.name}" telah memiliki ${account._count.journalItems} baris transaksi jurnal akuntansi. Demi menjaga jejak audit dan keseimbangan neraca, akun ini tidak boleh dihapus. Anda dapat menonaktifkan akun melalui pengaturan status aktif.`
      );
    }

    // 3. Cek apakah memiliki sub-akun
    if (account._count.children > 0) {
      throw new Error(
        `Akun "${account.code} - ${account.name}" memiliki ${account._count.children} sub-akun (child account). Hapus atau pindahkan sub-akun tersebut terlebih dahulu.`
      );
    }

    // 4. Cek apakah terhubung dengan modul inventaris
    if (account._count.inventoryItems > 0) {
      throw new Error(
        `Akun "${account.code} - ${account.name}" terhubung dengan ${account._count.inventoryItems} barang pada modul inventaris.`
      );
    }

    return await prisma.account.delete({
      where: { id },
    });
  }
}
