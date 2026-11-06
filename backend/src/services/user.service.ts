import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { config } from '../config/config.js';
import { UserRole, UserRoleType } from '../types/index.js';
import { calculateTotalPages } from '../utils/helpers.js';

export interface CreateUserInput {
  username: string;
  password: string;
  fullName: string;
  role: UserRoleType;
  businessIds?: number[];
}

export interface UpdateUserInput {
  fullName?: string;
  role?: UserRoleType;
  password?: string;
  isActive?: boolean;
  businessIds?: number[];
}

export class UserService {
  /**
   * Ambil daftar seluruh pengguna dengan filter & pagination
   */
  static async getAll(params: {
    search?: string;
    role?: UserRoleType;
    businessId?: number;
    page: number;
    limit: number;
    skip: number;
  }) {
    const where: any = {
      deletedAt: null,
    };

    if (params.search) {
      where.OR = [
        { username: { contains: params.search } },
        { fullName: { contains: params.search } },
      ];
    }

    if (params.role) {
      where.role = params.role;
    }

    if (params.businessId) {
      where.userBusinessAccess = {
        some: { businessId: params.businessId },
      };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          userBusinessAccess: {
            include: {
              business: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedUsers = users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role as UserRoleType,
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      businesses: u.userBusinessAccess.map((access) => access.business),
    }));

    return {
      users: formattedUsers,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: calculateTotalPages(total, params.limit),
      },
    };
  }

  /**
   * Ambil detail satu pengguna
   */
  static async getById(id: number) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userBusinessAccess: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                code: true,
                address: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as UserRoleType,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      businesses: user.userBusinessAccess.map((access) => access.business),
    };
  }

  /**
   * Buat pengguna baru & beri akses unit usaha
   */
  static async create(data: CreateUserInput) {
    if (!data.username || !data.password || !data.fullName || !data.role) {
      throw new Error('Username, kata sandi, nama lengkap, dan peran pengguna wajib diisi.');
    }

    const cleanUsername = data.username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      throw new Error('Username minimal 3 karakter.');
    }

    if (data.password.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter.');
    }

    // Cek duplikasi username
    const existing = await prisma.user.findFirst({
      where: { username: cleanUsername, deletedAt: null },
    });

    if (existing) {
      throw new Error(`Username "${cleanUsername}" sudah digunakan.`);
    }

    const passwordHash = await bcrypt.hash(data.password, config.bcrypt.saltRounds);

    return await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: cleanUsername,
          passwordHash,
          fullName: data.fullName.trim(),
          role: data.role as any,
          isActive: true,
        },
      });

      // Tambahkan akses ke unit usaha jika ditentukan
      if (data.businessIds && data.businessIds.length > 0) {
        await tx.userBusinessAccess.createMany({
          data: data.businessIds.map((bId) => ({
            userId: newUser.id,
            businessId: bId,
          })),
        });
      }

      return {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role as UserRoleType,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
      };
    });
  }

  /**
   * Perbarui informasi pengguna
   */
  static async update(id: number, data: UpdateUserInput) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    return await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (data.fullName) updateData.fullName = data.fullName.trim();
      if (data.role) updateData.role = data.role as any;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.password && data.password.trim() !== '') {
        if (data.password.length < 6) {
          throw new Error('Kata sandi minimal 6 karakter.');
        }
        updateData.passwordHash = await bcrypt.hash(data.password, config.bcrypt.saltRounds);
      }

      const updatedUser = await tx.user.update({
        where: { id },
        data: updateData,
      });

      // Update daftar akses unit usaha jika disediakan
      if (data.businessIds !== undefined) {
        await tx.userBusinessAccess.deleteMany({
          where: { userId: id },
        });

        if (data.businessIds.length > 0) {
          await tx.userBusinessAccess.createMany({
            data: data.businessIds.map((bId) => ({
              userId: id,
              businessId: bId,
            })),
          });
        }
      }

      return {
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        role: updatedUser.role as UserRoleType,
        isActive: updatedUser.isActive,
        updatedAt: updatedUser.updatedAt,
      };
    });
  }

  /**
   * Hapus pengguna secara soft delete
   */
  static async softDelete(id: number, requestingUserId: number) {
    if (id === requestingUserId) {
      throw new Error('Anda tidak dapat menghapus akun Anda sendiri.');
    }

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    // Pastikan tidak menghapus satu-satunya Super Admin
    if (user.role === UserRole.SUPER_ADMIN) {
      const superAdminCount = await prisma.user.count({
        where: { role: UserRole.SUPER_ADMIN, deletedAt: null },
      });
      if (superAdminCount <= 1) {
        throw new Error('Tidak dapat menghapus satu-satunya Super Admin di sistem.');
      }
    }

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return { id, message: 'Pengguna berhasil dihapus (soft delete).' };
  }
}
