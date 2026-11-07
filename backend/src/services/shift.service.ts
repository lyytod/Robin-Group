import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';

export interface CreateShiftInput {
  businessId: number;
  name: string;
  startTime: string; // "08:00"
  endTime: string;   // "16:00"
  gracePeriodMinutes?: number;
  isActive?: boolean;
}

export interface UpdateShiftInput {
  name?: string;
  startTime?: string;
  endTime?: string;
  gracePeriodMinutes?: number;
  isActive?: boolean;
}

export interface UpdateOperationalRuleInput {
  mealAllowancePerDay?: number;
  absenceDeductionPerDay?: number;
  disciplineBonusAmount?: number;
  lateDeductionPerOccurrence?: number;
  lateDeductionPerMinute?: number;
  minWorkDaysForBonus?: number;
  notes?: string;
}

export class ShiftService {
  static async getShifts(businessId: number) {
    return await prisma.shift.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { startTime: 'asc' },
    });
  }

  static async getShiftById(id: number, businessId: number) {
    const shift = await prisma.shift.findFirst({
      where: { id, businessId, deletedAt: null },
    });
    if (!shift) {
      throw new Error('Shift kerja tidak ditemukan.');
    }
    return shift;
  }

  static async createShift(data: CreateShiftInput) {
    const cleanName = data.name.trim();
    if (!cleanName) throw new Error('Nama shift wajib diisi.');
    if (!data.startTime || !data.endTime) throw new Error('Jam masuk dan jam pulang wajib diisi.');

    return await prisma.shift.create({
      data: {
        businessId: data.businessId,
        name: cleanName,
        startTime: data.startTime.trim(),
        endTime: data.endTime.trim(),
        gracePeriodMinutes: data.gracePeriodMinutes ?? 15,
        isActive: data.isActive ?? true,
      },
    });
  }

  static async updateShift(id: number, businessId: number, data: UpdateShiftInput) {
    await this.getShiftById(id, businessId);
    return await prisma.shift.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.startTime !== undefined && { startTime: data.startTime.trim() }),
        ...(data.endTime !== undefined && { endTime: data.endTime.trim() }),
        ...(data.gracePeriodMinutes !== undefined && { gracePeriodMinutes: Number(data.gracePeriodMinutes) }),
        ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) }),
      },
    });
  }

  static async deleteShift(id: number, businessId: number) {
    await this.getShiftById(id, businessId);
    return await prisma.shift.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  static async getOperationalRule(businessId: number) {
    let rule = await prisma.operationalRule.findUnique({
      where: { businessId },
    });

    if (!rule) {
      // Buat default rule jika belum ada
      rule = await prisma.operationalRule.create({
        data: {
          businessId,
          mealAllowancePerDay: new Prisma.Decimal(15000), // Default Rp 15.000 / hari hadir
          absenceDeductionPerDay: new Prisma.Decimal(50000), // Default Rp 50.000 / hari alfa (tidak hadir)
          disciplineBonusAmount: new Prisma.Decimal(10000), // Default Rp 10.000 / hari hadir tepat waktu
          lateDeductionPerOccurrence: new Prisma.Decimal(15000), // Default Rp 15.000 / kejadian terlambat
          lateDeductionPerMinute: new Prisma.Decimal(0), // Default Rp 0 / menit (bisa diatur 0 sesuai kebutuhan)
          minWorkDaysForBonus: 0, // 0 = langsung dihitung per hari tepat waktu tanpa batas minimal
          notes: 'Kebijakan uang makan kehadiran, potongan alfa, bonus kedisiplinan, dan denda keterlambatan.',
        },
      });
    }

    return {
      id: rule.id,
      businessId: rule.businessId,
      mealAllowancePerDay: Number(rule.mealAllowancePerDay ?? 0),
      absenceDeductionPerDay: Number(rule.absenceDeductionPerDay ?? 0),
      disciplineBonusAmount: Number(rule.disciplineBonusAmount),
      lateDeductionPerOccurrence: Number(rule.lateDeductionPerOccurrence),
      lateDeductionPerMinute: Number(rule.lateDeductionPerMinute),
      minWorkDaysForBonus: rule.minWorkDaysForBonus,
      notes: rule.notes,
      updatedAt: rule.updatedAt,
    };
  }

  static async updateOperationalRule(businessId: number, data: UpdateOperationalRuleInput) {
    const existing = await prisma.operationalRule.findUnique({ where: { businessId } });

    if (existing) {
      const updated = await prisma.operationalRule.update({
        where: { businessId },
        data: {
          ...(data.mealAllowancePerDay !== undefined && {
            mealAllowancePerDay: new Prisma.Decimal(data.mealAllowancePerDay),
          }),
          ...(data.absenceDeductionPerDay !== undefined && {
            absenceDeductionPerDay: new Prisma.Decimal(data.absenceDeductionPerDay),
          }),
          ...(data.disciplineBonusAmount !== undefined && {
            disciplineBonusAmount: new Prisma.Decimal(data.disciplineBonusAmount),
          }),
          ...(data.lateDeductionPerOccurrence !== undefined && {
            lateDeductionPerOccurrence: new Prisma.Decimal(data.lateDeductionPerOccurrence),
          }),
          ...(data.lateDeductionPerMinute !== undefined && {
            lateDeductionPerMinute: new Prisma.Decimal(data.lateDeductionPerMinute),
          }),
          ...(data.minWorkDaysForBonus !== undefined && {
            minWorkDaysForBonus: Number(data.minWorkDaysForBonus),
          }),
          ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
        },
      });
      return {
        id: updated.id,
        businessId: updated.businessId,
        mealAllowancePerDay: Number(updated.mealAllowancePerDay ?? 0),
        absenceDeductionPerDay: Number(updated.absenceDeductionPerDay ?? 0),
        disciplineBonusAmount: Number(updated.disciplineBonusAmount),
        lateDeductionPerOccurrence: Number(updated.lateDeductionPerOccurrence),
        lateDeductionPerMinute: Number(updated.lateDeductionPerMinute),
        minWorkDaysForBonus: updated.minWorkDaysForBonus,
        notes: updated.notes,
        updatedAt: updated.updatedAt,
      };
    } else {
      const created = await prisma.operationalRule.create({
        data: {
          businessId,
          mealAllowancePerDay: new Prisma.Decimal(data.mealAllowancePerDay ?? 15000),
          absenceDeductionPerDay: new Prisma.Decimal(data.absenceDeductionPerDay ?? 50000),
          disciplineBonusAmount: new Prisma.Decimal(data.disciplineBonusAmount ?? 10000),
          lateDeductionPerOccurrence: new Prisma.Decimal(data.lateDeductionPerOccurrence ?? 15000),
          lateDeductionPerMinute: new Prisma.Decimal(data.lateDeductionPerMinute ?? 0),
          minWorkDaysForBonus: Number(data.minWorkDaysForBonus ?? 0),
          notes: data.notes?.trim() || null,
        },
      });
      return {
        id: created.id,
        businessId: created.businessId,
        mealAllowancePerDay: Number(created.mealAllowancePerDay ?? 0),
        absenceDeductionPerDay: Number(created.absenceDeductionPerDay ?? 0),
        disciplineBonusAmount: Number(created.disciplineBonusAmount),
        lateDeductionPerOccurrence: Number(created.lateDeductionPerOccurrence),
        lateDeductionPerMinute: Number(created.lateDeductionPerMinute),
        minWorkDaysForBonus: created.minWorkDaysForBonus,
        notes: created.notes,
        updatedAt: created.updatedAt,
      };
    }
  }
}

