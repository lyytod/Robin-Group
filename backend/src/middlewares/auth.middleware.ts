import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { prisma } from '../config/database.js';
import { sendError } from '../utils/helpers.js';
import { AuthenticatedRequest, JwtPayload, UserRole, UserRoleType } from '../types/index.js';

/**
 * Middleware untuk memverifikasi token JWT
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Akses ditolak. Token autentikasi tidak ditemukan.', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      sendError(res, 'Token tidak valid.', 401);
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Verifikasi user di database untuk memastikan status aktif dan belum dihapus
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userBusinessAccess: {
          select: { businessId: true },
        },
      },
    });

    if (!user || !user.isActive || user.deletedAt !== null) {
      sendError(res, 'Pengguna tidak ditemukan atau akun telah dinonaktifkan.', 401);
      return;
    }

    // Ambil daftar businessId yang dapat diakses
    let businessIds: number[] = [];
    if (user.role === UserRole.SUPER_ADMIN) {
      const allBusinesses = await prisma.business.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });
      businessIds = allBusinesses.map((b) => b.id);
    } else {
      businessIds = user.userBusinessAccess.map((uba) => uba.businessId);
    }

    req.user = {
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as UserRoleType,
      businessIds,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, 'Sesi telah berakhir. Silakan login kembali.', 401);
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      sendError(res, 'Token tidak valid atau telah dimodifikasi.', 401);
      return;
    }
    sendError(res, 'Terjadi kesalahan saat memverifikasi autentikasi.', 500);
  }
}

/**
 * Middleware untuk membatasi akses berdasarkan peran pengguna (Role-Based Access Control)
 */
export function requireRoles(...allowedRoles: UserRoleType[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Autentikasi diperlukan.', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Akses ditolak. Anda tidak memiliki izin untuk melakukan tindakan ini. Diperlukan peran: ${allowedRoles.join(', ')}`,
        403
      );
      return;
    }

    next();
  };
}

/**
 * Middleware untuk memastikan pengguna memiliki akses ke unit usaha tertentu (Multi-Tenancy Guard)
 */
export function requireBusinessAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    sendError(res, 'Autentikasi diperlukan.', 401);
    return;
  }

  // Cari businessId dari header, query, params, atau body
  const headerId = req.headers['x-business-id'];
  const rawId =
    (typeof headerId === 'string' ? headerId : undefined) ||
    (typeof req.query.businessId === 'string' ? req.query.businessId : undefined) ||
    req.params.businessId ||
    req.body?.businessId;

  if (!rawId) {
    sendError(res, 'Parameter unit usaha (business_id) diperlukan.', 400);
    return;
  }

  const businessId = parseInt(String(rawId), 10);
  if (isNaN(businessId) || businessId <= 0) {
    sendError(res, 'Format ID unit usaha tidak valid.', 400);
    return;
  }

  // Super Admin memiliki akses ke seluruh unit usaha
  if (req.user.role === UserRole.SUPER_ADMIN) {
    req.businessId = businessId;
    next();
    return;
  }

  // Periksa apakah user memiliki akses ke businessId ini
  if (!req.user.businessIds.includes(businessId)) {
    sendError(res, 'Akses ditolak. Anda tidak memiliki izin untuk unit usaha ini.', 403);
    return;
  }

  req.businessId = businessId;
  next();
}
