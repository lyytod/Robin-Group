import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { prisma } from '../config/database.js';
import { JwtPayload, UserRole, UserRoleType } from '../types/index.js';

export interface LoginResult {
  token: string;
  user: {
    id: number;
    username: string;
    fullName: string;
    role: UserRoleType;
  };
  businesses: {
    id: number;
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
  }[];
}

export class AuthService {
  /**
   * Autentikasi pengguna & terbitkan JWT token
   */
  static async login(username: string, password: string): Promise<LoginResult> {
    if (!username || !password) {
      throw new Error('Username dan kata sandi wajib diisi.');
    }

    const user = await prisma.user.findFirst({
      where: {
        username: username.trim(),
        deletedAt: null,
      },
      include: {
        userBusinessAccess: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                code: true,
                address: true,
                phone: true,
                isActive: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('Username atau kata sandi tidak cocok.');
    }

    if (!user.isActive) {
      throw new Error('Akun Anda dinonaktifkan. Silakan hubungi Super Admin.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Username atau kata sandi tidak cocok.');
    }

    // Ambil daftar unit usaha yang dapat diakses pengguna
    let businesses: {
      id: number;
      name: string;
      code: string;
      address: string | null;
      phone: string | null;
    }[] = [];

    if (user.role === UserRole.SUPER_ADMIN) {
      const allBusinesses = await prisma.business.findMany({
        where: { isActive: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          phone: true,
        },
        orderBy: { name: 'asc' },
      });
      businesses = allBusinesses;
    } else {
      businesses = user.userBusinessAccess
        .filter((access) => access.business.isActive && access.business.deletedAt === null)
        .map((access) => ({
          id: access.business.id,
          name: access.business.name,
          code: access.business.code,
          address: access.business.address,
          phone: access.business.phone,
        }));
    }

    const businessIds = businesses.map((b) => b.id);

    // Buat JWT Token
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as UserRoleType,
      businessIds,
    };

    const token = jwt.sign(
      { ...payload },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role as UserRoleType,
      },
      businesses,
    };
  }

  /**
   * Ambil data profil pengguna yang sedang login
   */
  static async getMe(userId: number) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    let businesses;
    if (user.role === UserRole.SUPER_ADMIN) {
      businesses = await prisma.business.findMany({
        where: { isActive: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          phone: true,
        },
        orderBy: { name: 'asc' },
      });
    } else {
      const accessList = await prisma.userBusinessAccess.findMany({
        where: { userId },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              code: true,
              address: true,
              phone: true,
              isActive: true,
              deletedAt: true,
            },
          },
        },
      });

      businesses = accessList
        .filter((a) => a.business.isActive && a.business.deletedAt === null)
        .map((a) => ({
          id: a.business.id,
          name: a.business.name,
          code: a.business.code,
          address: a.business.address,
          phone: a.business.phone,
        }));
    }

    return {
      user: {
        ...user,
        role: user.role as UserRoleType,
      },
      businesses,
    };
  }

  /**
   * Ubah kata sandi pengguna
   */
  static async changePassword(
    userId: number,
    currentPass: string,
    newPass: string
  ): Promise<void> {
    if (!currentPass || !newPass) {
      throw new Error('Kata sandi saat ini dan kata sandi baru wajib diisi.');
    }

    if (newPass.length < 6) {
      throw new Error('Kata sandi baru minimal harus 6 karakter.');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isMatch) {
      throw new Error('Kata sandi saat ini salah.');
    }

    const newHash = await bcrypt.hash(newPass, config.bcrypt.saltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
  }
}
