import { prisma } from '../config/database.js';
import { UserRole, UserRoleType } from '../types/index.js';
import { seedCoAForBusiness } from '../utils/standardCoA.js';

export interface CreateBusinessInput {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  description?: string;
}

export interface UpdateBusinessInput {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  description?: string;
  isActive?: boolean;
}

export class BusinessService {
  /**
   * Ambil semua unit usaha yang dapat diakses pengguna
   */
  static async getAll(userId: number, role: UserRoleType, includeInactive = false) {
    const whereClause: any = {
      deletedAt: null,
      ...(!includeInactive && { isActive: true }),
    };

    if (role !== UserRole.SUPER_ADMIN) {
      whereClause.userBusinessAccess = {
        some: { userId },
      };
    }

    const businesses = await prisma.business.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            products: { where: { deletedAt: null } },
            transactions: { where: { voidedAt: null } },
            userBusinessAccess: true,
            accounts: { where: { isActive: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return businesses.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      address: b.address,
      phone: b.phone,
      description: b.description,
      isActive: b.isActive,
      createdAt: b.createdAt,
      stats: {
        totalProducts: b._count.products,
        totalTransactions: b._count.transactions,
        totalStaff: b._count.userBusinessAccess,
        totalAccounts: b._count.accounts,
      },
    }));
  }

  /**
   * Ambil detail satu unit usaha
   */
  static async getById(id: number, userId: number, role: UserRoleType) {
    if (role !== UserRole.SUPER_ADMIN) {
      const access = await prisma.userBusinessAccess.findUnique({
        where: {
          userId_businessId: { userId, businessId: id },
        },
      });
      if (!access) {
        throw new Error('Anda tidak memiliki akses ke unit usaha ini.');
      }
    }

    const business = await prisma.business.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            products: { where: { deletedAt: null } },
            transactions: { where: { voidedAt: null } },
            userBusinessAccess: true,
            accounts: { where: { isActive: true } },
          },
        },
      },
    });

    if (!business) {
      throw new Error('Unit usaha tidak ditemukan.');
    }

    return {
      id: business.id,
      name: business.name,
      code: business.code,
      address: business.address,
      phone: business.phone,
      description: business.description,
      isActive: business.isActive,
      createdAt: business.createdAt,
      stats: {
        totalProducts: business._count.products,
        totalTransactions: business._count.transactions,
        totalStaff: business._count.userBusinessAccess,
        totalAccounts: business._count.accounts,
      },
    };
  }

  /**
   * Tambah unit usaha baru dan inisialisasi CoA standar dalam satu transaksi database
   */
  static async create(data: CreateBusinessInput, creatorUserId: number) {
    if (!data.name || !data.code) {
      throw new Error('Nama unit usaha dan kode unik wajib diisi.');
    }

    const normalizedCode = data.code.trim().toUpperCase();

    // Cek duplikasi kode usaha
    const existing = await prisma.business.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw new Error(`Unit usaha dengan kode "${normalizedCode}" sudah terdaftar.`);
    }

    // Jalankan transaksi database (ACID)
    return await prisma.$transaction(async (tx) => {
      // 1. Buat unit usaha
      const newBusiness = await tx.business.create({
        data: {
          name: data.name.trim(),
          code: normalizedCode,
          address: data.address?.trim() || null,
          phone: data.phone?.trim() || null,
          description: data.description?.trim() || null,
          isActive: true,
        },
      });

      // 2. Berikan akses ke creator / superadmin
      await tx.userBusinessAccess.create({
        data: {
          userId: creatorUserId,
          businessId: newBusiness.id,
        },
      });

      // 3. Otomatis inisialisasi Chart of Accounts (CoA) standar
      const accountsCreated = await seedCoAForBusiness(newBusiness.id, tx);

      return {
        ...newBusiness,
        accountsCreated,
      };
    });
  }

  /**
   * Perbarui informasi unit usaha
   */
  static async update(id: number, data: UpdateBusinessInput) {
    const business = await prisma.business.findFirst({
      where: { id, deletedAt: null },
    });

    if (!business) {
      throw new Error('Unit usaha tidak ditemukan.');
    }

    if (data.code) {
      const normalizedCode = data.code.trim().toUpperCase();
      const existing = await prisma.business.findFirst({
        where: {
          code: normalizedCode,
          NOT: { id },
        },
      });
      if (existing) {
        throw new Error(`Kode usaha "${normalizedCode}" sudah digunakan oleh usaha lain.`);
      }
      data.code = normalizedCode;
    }

    return await prisma.business.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.code && { code: data.code }),
        ...(data.address !== undefined && { address: data.address?.trim() || null }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  /**
   * Hapus unit usaha secara soft delete
   */
  static async softDelete(id: number) {
    const business = await prisma.business.findFirst({
      where: { id, deletedAt: null },
    });

    if (!business) {
      throw new Error('Unit usaha tidak ditemukan.');
    }

    await prisma.business.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return { id, message: 'Unit usaha berhasil dinonaktifkan (soft delete).' };
  }
}
