import { AttendanceStatus, Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import { prisma } from '../config/database.js';
import { calculateTotalPages, resolveLocalDateTime } from '../utils/helpers.js';
import { ShiftService } from './shift.service.js';

export interface ClockInInput {
  businessId: number;
  employeeId: number;
  shiftId?: number;
  photo?: string;
  notes?: string;
  createdById?: number;
  customTime?: string;
}

export interface ClockOutInput {
  businessId: number;
  employeeId: number;
  photo?: string;
  notes?: string;
  customTime?: string;
}

export interface ManualAttendanceInput {
  businessId: number;
  employeeId: number;
  date: string;
  status: AttendanceStatus;
  notes?: string;
  createdById?: number;
  shiftId?: number;
}

export interface BatchLeaveInput {
  businessId: number;
  employeeId: number;
  dates: string[];
  status: AttendanceStatus;
  notes?: string;
  createdById?: number;
}

export interface SyncAutomaticAlfaParams {
  businessId: number;
  startDate?: string;
  endDate?: string;
  employeeId?: number;
  createdById?: number;
}

export interface UpdateAttendanceStatusInput {
  id: number;
  businessId: number;
  status: AttendanceStatus;
  notes?: string;
  createdById?: number;
}

export interface GetAttendanceParams {
  businessId: number;
  startDate?: string;
  endDate?: string;
  employeeId?: number;
  status?: AttendanceStatus;
  page?: number;
  limit?: number;
  skip?: number;
}

export class AttendanceService {
  /**
   * Ambil seluruh staf aktif untuk kebutuhan pemilihan presensi di Kios Absen
   */
  static async getEmployees(businessId: number) {
    return await prisma.employee.findMany({
      where: {
        businessId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        position: true,
        phone: true,
        salaryType: true,
        isActive: true,
      },
    });
  }

  /**
   * Helper parsing tanggal konsisten UTC midnight untuk kolom MySQL DATE (@db.Date)
   */
  private static parseDateOnly(dateInput?: string | Date): Date {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      const [y, m, d] = dateInput.slice(0, 10).split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    }
    const d = dateInput instanceof Date ? dateInput : (dateInput ? resolveLocalDateTime(dateInput) : new Date());
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
  }

  /**
   * Helper format waktu HH:mm
   */
  private static formatTime(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  /**
   * Absen Masuk (Clock In) dengan verifikasi foto selfie & kalkulasi keterlambatan
   */
  static async clockIn(data: ClockInInput) {
    const now = data.customTime ? resolveLocalDateTime(data.customTime) : new Date();
    const today = this.parseDateOnly(now);

    // 1. Verifikasi karyawan
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, businessId: data.businessId, deletedAt: null },
    });
    if (!employee) {
      throw new Error('Karyawan tidak ditemukan atau sudah tidak aktif.');
    }

    // 2. Cek apakah sudah ada catatan absen hari ini
    const existing = await prisma.attendance.findFirst({
      where: {
        businessId: data.businessId,
        employeeId: data.employeeId,
        date: today,
        deletedAt: null,
      },
      include: { shift: true },
    });

    if (existing && existing.clockInTime) {
      const timeStr = this.formatTime(existing.clockInTime);
      throw new Error(`Karyawan "${employee.name}" sudah melakukan absen masuk hari ini pada pukul ${timeStr}.`);
    }

    // 3. Tentukan shift kerja
    let shift = null;
    if (data.shiftId) {
      shift = await prisma.shift.findFirst({
        where: { id: data.shiftId, businessId: data.businessId, deletedAt: null },
      });
    } else {
      shift = await prisma.shift.findFirst({
        where: { businessId: data.businessId, isActive: true, deletedAt: null },
        orderBy: { startTime: 'asc' },
      });
    }

    // 4. Hitung keterlambatan berdasarkan jam masuk shift + toleransi (grace period)
    let lateMinutes = 0;
    let isLate = false;
    let status: AttendanceStatus = AttendanceStatus.HADIR;

    if (shift && shift.startTime) {
      const [startHour, startMin] = shift.startTime.split(':').map(Number);
      const gracePeriod = shift.gracePeriodMinutes || 0;
      const expectedTimeMinutes = startHour * 60 + startMin + gracePeriod;
      const actualTimeMinutes = now.getHours() * 60 + now.getMinutes();

      if (actualTimeMinutes > expectedTimeMinutes) {
        // Keterlambatan dihitung dari menit yang melebihi batas toleransi (grace period)
        // Contoh: Shift 08:00, toleransi 15 mnt (batas 08:15), masuk 08:17 => lateMinutes = 497 - 495 = 2 menit
        lateMinutes = actualTimeMinutes - expectedTimeMinutes;
        isLate = true;
        status = AttendanceStatus.TERLAMBAT;
      }
    }

    // 5. Simpan catatan absensi (Upsert jika sebelumnya ada draft izin/alfa)
    let record;
    if (existing) {
      record = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          shiftId: shift?.id || null,
          clockInTime: now,
          clockInPhoto: data.photo || null,
          clockInNotes: data.notes?.trim() || null,
          status,
          lateMinutes,
          isLate,
          createdById: data.createdById || null,
        },
        include: { employee: true, shift: true },
      });
    } else {
      record = await prisma.attendance.create({
        data: {
          businessId: data.businessId,
          employeeId: data.employeeId,
          shiftId: shift?.id || null,
          date: today,
          clockInTime: now,
          clockInPhoto: data.photo || null,
          clockInNotes: data.notes?.trim() || null,
          status,
          lateMinutes,
          isLate,
          createdById: data.createdById || null,
        },
        include: { employee: true, shift: true },
      });
    }

    return {
      ...record,
      clockInTimeFormatted: this.formatTime(now),
      shiftName: shift?.name || 'Reguler',
      isLate,
      lateMinutes,
    };
  }

  /**
   * Absen Pulang (Clock Out) dengan verifikasi foto selfie & kalkulasi pulang awal
   */
  static async clockOut(data: ClockOutInput) {
    const now = data.customTime ? resolveLocalDateTime(data.customTime) : new Date();
    const today = this.parseDateOnly(now);

    // 1. Cari absensi hari ini
    const existing = await prisma.attendance.findFirst({
      where: {
        businessId: data.businessId,
        employeeId: data.employeeId,
        date: today,
        deletedAt: null,
      },
      include: { employee: true, shift: true },
    });

    if (!existing || !existing.clockInTime) {
      throw new Error('Karyawan belum melakukan absen masuk untuk hari ini.');
    }

    if (existing.clockOutTime) {
      const timeStr = this.formatTime(existing.clockOutTime);
      throw new Error(`Karyawan "${existing.employee.name}" sudah melakukan absen pulang hari ini pada pukul ${timeStr}.`);
    }

    // 2. Hitung pulang awal jika shift memiliki endTime
    let earlyMinutes = 0;
    if (existing.shift && existing.shift.endTime) {
      const [endHour, endMin] = existing.shift.endTime.split(':').map(Number);
      const shiftEndMinutes = endHour * 60 + endMin;
      const actualMinutes = now.getHours() * 60 + now.getMinutes();

      if (actualMinutes < shiftEndMinutes) {
        earlyMinutes = shiftEndMinutes - actualMinutes;
      }
    }

    // 3. Update absensi
    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        clockOutTime: now,
        clockOutPhoto: data.photo || null,
        clockOutNotes: data.notes?.trim() || null,
        earlyMinutes,
      },
      include: { employee: true, shift: true },
    });

    return {
      ...updated,
      clockOutTimeFormatted: this.formatTime(now),
      earlyMinutes,
    };
  }

  /**
   * Input Absensi Manual (Khusus Admin untuk Izin, Sakit, Alfa, atau Koreksi)
   */
  static async manualEntry(data: ManualAttendanceInput) {
    const targetDate = this.parseDateOnly(data.date);

    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, businessId: data.businessId, deletedAt: null },
    });
    if (!employee) {
      throw new Error('Karyawan tidak ditemukan.');
    }

    const existing = await prisma.attendance.findFirst({
      where: {
        businessId: data.businessId,
        employeeId: data.employeeId,
        date: targetDate,
      },
    });

    if (existing) {
      return await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: data.status,
          shiftId: data.shiftId || existing.shiftId,
          clockInNotes: data.notes?.trim() || existing.clockInNotes,
          createdById: data.createdById || existing.createdById,
          deletedAt: null,
        },
        include: { employee: true, shift: true },
      });
    }

    return await prisma.attendance.create({
      data: {
        businessId: data.businessId,
        employeeId: data.employeeId,
        shiftId: data.shiftId || null,
        date: targetDate,
        status: data.status,
        clockInNotes: data.notes?.trim() || null,
        createdById: data.createdById || null,
      },
      include: { employee: true, shift: true },
    });
  }

  /**
   * Catat Jadwal Libur / Cuti / Izin / Sakit sekaligus (Single or Multi-Dates)
   */
  static async recordBatchLeave(data: BatchLeaveInput) {
    if (!data.dates || data.dates.length === 0) {
      throw new Error('Pilih setidaknya satu tanggal untuk dicatat.');
    }

    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, businessId: data.businessId, deletedAt: null },
    });
    if (!employee) {
      throw new Error('Karyawan tidak ditemukan.');
    }

    const results = [];
    for (const dStr of data.dates) {
      const targetDate = this.parseDateOnly(dStr);
      const existing = await prisma.attendance.findFirst({
        where: {
          businessId: data.businessId,
          employeeId: data.employeeId,
          date: targetDate,
        },
      });

      if (existing) {
        const updated = await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: data.status,
            clockInNotes: data.notes?.trim() || existing.clockInNotes,
            createdById: data.createdById || existing.createdById,
            deletedAt: null,
          },
        });
        results.push(updated);
      } else {
        const created = await prisma.attendance.create({
          data: {
            businessId: data.businessId,
            employeeId: data.employeeId,
            date: targetDate,
            status: data.status,
            clockInNotes: data.notes?.trim() || null,
            createdById: data.createdById || null,
          },
        });
        results.push(created);
      }
    }

    return {
      count: results.length,
      employeeName: employee.name,
      status: data.status,
      dates: data.dates,
      message: `${results.length} hari ${data.status} berhasil dicatat untuk ${employee.name}.`,
    };
  }

  /**
   * Otomatisasi Status Alfa untuk Hari-Hari Lampau:
   * Menemukan hari di masa lampau (kemarin dan sebelumnya) di mana staf aktif
   * TIDAK memiliki catatan presensi masuk dan TIDAK memiliki jadwal libur/cuti/izin.
   */
  static async syncAutomaticAlfa(params: SyncAutomaticAlfaParams) {
    const today = this.parseDateOnly();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Rentang sinkronisasi: default 30 hari ke belakang sampai kemarin
    let startLimit: Date;
    if (params.startDate) {
      startLimit = this.parseDateOnly(params.startDate);
    } else {
      startLimit = new Date(today);
      startLimit.setDate(startLimit.getDate() - 30);
    }

    let endLimit = yesterday;
    if (params.endDate) {
      const parsedEnd = this.parseDateOnly(params.endDate);
      if (parsedEnd < endLimit) {
        endLimit = parsedEnd;
      }
    }

    if (endLimit < startLimit) {
      return { createdCount: 0, message: 'Tidak ada hari lampau yang perlu disinkronkan.' };
    }

    // Ambil karyawan aktif
    const employees = await prisma.employee.findMany({
      where: {
        businessId: params.businessId,
        isActive: true,
        deletedAt: null,
        ...(params.employeeId && { id: Number(params.employeeId) }),
      },
      select: { id: true, name: true, joinDate: true },
    });

    // Ambil semua data absensi yang sudah ada dalam rentang tersebut
    const existingAttendances = await prisma.attendance.findMany({
      where: {
        businessId: params.businessId,
        date: { gte: startLimit, lte: endLimit },
        deletedAt: null,
        ...(params.employeeId && { employeeId: Number(params.employeeId) }),
      },
      select: { employeeId: true, date: true, status: true },
    });

    const attSet = new Set<string>();
    for (const att of existingAttendances) {
      const dStr = att.date.toISOString().slice(0, 10);
      attSet.add(`${att.employeeId}_${dStr}`);
    }

    const newAlfaRecords: Prisma.AttendanceCreateManyInput[] = [];

    // Loop setiap karyawan
    for (const emp of employees) {
      const empJoin = this.parseDateOnly(emp.joinDate);
      const effectiveStart = empJoin > startLimit ? empJoin : startLimit;

      const curr = new Date(effectiveStart);
      while (curr <= endLimit) {
        const dStr = curr.toISOString().slice(0, 10);
        const key = `${emp.id}_${dStr}`;

        if (!attSet.has(key)) {
          // Karyawan tidak ada catatan absen masuk, tidak ada jadwal libur, tidak ada izin/sakit -> ALFA!
          newAlfaRecords.push({
            businessId: params.businessId,
            employeeId: emp.id,
            date: new Date(curr),
            status: AttendanceStatus.ALFA,
            clockInNotes: 'Otomatis: Tidak hadir tanpa jadwal libur/izin',
            createdById: params.createdById || null,
          });
          attSet.add(key);
        }

        curr.setDate(curr.getDate() + 1);
      }
    }

    if (newAlfaRecords.length > 0) {
      await prisma.attendance.createMany({
        data: newAlfaRecords,
        skipDuplicates: true,
      });
    }

    return {
      createdCount: newAlfaRecords.length,
      startRange: startLimit.toISOString().slice(0, 10),
      endRange: endLimit.toISOString().slice(0, 10),
      message: `${newAlfaRecords.length} catatan Alfa otomatis berhasil dicatat untuk staf yang tidak hadir tanpa keterangan/libur.`,
    };
  }

  /**
   * Revisi / Ubah Status Absensi (Misal dari ALFA Otomatis diubah ke SAKIT/IZIN/LIBUR)
   */
  static async updateAttendanceStatus(params: UpdateAttendanceStatusInput) {
    const existing = await prisma.attendance.findFirst({
      where: { id: params.id, businessId: params.businessId, deletedAt: null },
      include: { employee: true },
    });
    if (!existing) {
      throw new Error('Data absensi tidak ditemukan.');
    }

    return await prisma.attendance.update({
      where: { id: params.id },
      data: {
        status: params.status,
        ...(params.notes !== undefined && { clockInNotes: params.notes.trim() || null }),
        ...(params.createdById && { createdById: params.createdById }),
      },
      include: { employee: true, shift: true },
    });
  }

  /**
   * Hapus catatan absensi / presensi / jadwal libur
   */
  static async deleteAttendance(id: number, businessId: number) {
    const existing = await prisma.attendance.findFirst({
      where: { id, businessId },
    });
    if (!existing) {
      throw new Error('Data absensi tidak ditemukan.');
    }

    return await prisma.attendance.delete({
      where: { id },
    });
  }

  /**
   * Status kehadiran seluruh karyawan hari ini (untuk Kios Absensi & monitoring kasir)
   */
  static async getTodayStatus(businessId: number) {
    const today = this.parseDateOnly();

    const [employees, todayAttendances, shifts] = await Promise.all([
      prisma.employee.findMany({
        where: { businessId, isActive: true, deletedAt: null },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          position: true,
          phone: true,
        },
      }),
      prisma.attendance.findMany({
        where: { businessId, date: today, deletedAt: null },
        include: { shift: true },
      }),
      prisma.shift.findMany({
        where: { businessId, isActive: true, deletedAt: null },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    const attMap = new Map<number, any>();
    for (const att of todayAttendances) {
      attMap.set(att.employeeId, att);
    }

    const list = employees.map((emp) => {
      const att = attMap.get(emp.id);
      return {
        employee: emp,
        attendanceId: att?.id || null,
        hasClockedIn: Boolean(att?.clockInTime),
        clockInTime: att?.clockInTime || null,
        clockInPhoto: att?.clockInPhoto || null,
        clockInNotes: att?.clockInNotes || null,
        hasClockedOut: Boolean(att?.clockOutTime),
        clockOutTime: att?.clockOutTime || null,
        clockOutPhoto: att?.clockOutPhoto || null,
        clockOutNotes: att?.clockOutNotes || null,
        status: att ? att.status : 'BELUM_ABSEN',
        isLate: att?.isLate || false,
        lateMinutes: att?.lateMinutes || 0,
        earlyMinutes: att?.earlyMinutes || 0,
        shift: att?.shift || null,
      };
    });

    const summary = {
      totalEmployees: employees.length,
      presentCount: todayAttendances.filter((a) => a.clockInTime).length,
      lateCount: todayAttendances.filter((a) => a.status === AttendanceStatus.TERLAMBAT || a.isLate).length,
      onTimeCount: todayAttendances.filter((a) => a.status === AttendanceStatus.HADIR).length,
      izinCount: todayAttendances.filter((a) => a.status === AttendanceStatus.IZIN).length,
      sakitCount: todayAttendances.filter((a) => a.status === AttendanceStatus.SAKIT).length,
      alfaCount: todayAttendances.filter((a) => a.status === AttendanceStatus.ALFA).length,
      liburCount: todayAttendances.filter((a) => a.status === AttendanceStatus.LIBUR).length,
      cutiCount: todayAttendances.filter((a) => a.status === AttendanceStatus.CUTI).length,
      notAttendedCount: employees.length - todayAttendances.length,
    };

    return {
      date: today,
      shifts,
      summary,
      items: list,
    };
  }

  /**
   * Riwayat Absensi dengan filter rentang tanggal, status, karyawan & pagination
   */
  static async getAll(params: GetAttendanceParams) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = params.skip || (page - 1) * limit;

    const where: Prisma.AttendanceWhereInput = {
      businessId: params.businessId,
      deletedAt: null,
      ...(params.employeeId && { employeeId: Number(params.employeeId) }),
      ...(params.status && { status: params.status }),
      ...(params.startDate || params.endDate
        ? {
            date: {
              ...(params.startDate && { gte: this.parseDateOnly(params.startDate) }),
              ...(params.endDate && { lte: this.parseDateOnly(params.endDate) }),
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { clockInTime: 'desc' }],
        include: {
          employee: {
            select: { id: true, code: true, name: true, position: true, phone: true },
          },
          shift: {
            select: { id: true, name: true, startTime: true, endTime: true },
          },
          createdBy: {
            select: { id: true, fullName: true },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: calculateTotalPages(total, limit),
      },
    };
  }

  /**
   * Rekapitulasi absensi & integrasi kalkulasi bonus disiplin / potongan keterlambatan untuk Penggajian
   */
  static async getMonthlySummary(params: {
    businessId: number;
    employeeId?: number;
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
  }) {
    let startDate: Date;
    let endDate: Date;

    if (params.startDate && params.endDate) {
      startDate = this.parseDateOnly(params.startDate);
      endDate = this.parseDateOnly(params.endDate);
    } else {
      const now = new Date();
      const y = params.year || now.getFullYear();
      const m = params.month !== undefined ? params.month - 1 : now.getMonth();
      startDate = new Date(y, m, 1);
      endDate = new Date(y, m + 1, 0);
    }

    // Jalankan sinkronisasi otomatis Alfa untuk hari-hari lampau yang tidak tercatat presensi atau libur
    try {
      await this.syncAutomaticAlfa({
        businessId: params.businessId,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        employeeId: params.employeeId,
      });
    } catch (e) {
      // Lanjutkan rekapitulasi meskipun sinkronisasi background mengalami kendala minor
    }

    // Ambil aturan operasional unit usaha
    const rule = await ShiftService.getOperationalRule(params.businessId);

    // Ambil semua absensi dalam rentang tanggal
    const attendances = await prisma.attendance.findMany({
      where: {
        businessId: params.businessId,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
        ...(params.employeeId && { employeeId: Number(params.employeeId) }),
      },
      include: {
        employee: { select: { id: true, code: true, name: true, position: true } },
        shift: true,
      },
      orderBy: { date: 'asc' },
    });

    // Ambil data karyawan
    const employees = await prisma.employee.findMany({
      where: {
        businessId: params.businessId,
        deletedAt: null,
        ...(params.employeeId && { id: Number(params.employeeId) }),
      },
      select: {
        id: true,
        code: true,
        name: true,
        position: true,
        baseSalary: true,
        monthlyDayOffQuota: true,
      },
      orderBy: { name: 'asc' },
    });

    const empRecapMap = new Map<number, any>();
    for (const emp of employees) {
      empRecapMap.set(emp.id, {
        employee: emp,
        totalPresent: 0,
        onTimeCount: 0,
        lateCount: 0,
        totalLateMinutes: 0,
        earlyLeaveCount: 0,
        izinCount: 0,
        sakitCount: 0,
        alfaCount: 0,
        liburCount: 0,
        cutiCount: 0,
        monthlyDayOffQuota: emp.monthlyDayOffQuota ?? 4,
        remainingDayOffQuota: emp.monthlyDayOffQuota ?? 4,
        isEligibleForDisciplineBonus: false,
        disciplineBonusAmount: 0,
        lateDeductionAmount: 0,
      });
    }

    for (const att of attendances) {
      const recap = empRecapMap.get(att.employeeId);
      if (!recap) continue;

      if (att.status === AttendanceStatus.HADIR) {
        recap.totalPresent++;
        recap.onTimeCount++;
      } else if (att.status === AttendanceStatus.TERLAMBAT || att.isLate) {
        recap.totalPresent++;
        recap.lateCount++;

        // Hitung menit keterlambatan yang melebihi batas toleransi shift
        let effectiveLateMinutes = att.lateMinutes || 0;
        if (att.clockInTime && att.shift?.startTime) {
          const clockIn = new Date(att.clockInTime);
          const [startHour, startMin] = att.shift.startTime.split(':').map(Number);
          const gracePeriod = att.shift.gracePeriodMinutes || 0;
          const expectedMinutes = startHour * 60 + startMin + gracePeriod;
          const actualMinutes = clockIn.getHours() * 60 + clockIn.getMinutes();
          if (actualMinutes > expectedMinutes) {
            effectiveLateMinutes = actualMinutes - expectedMinutes;
          } else {
            effectiveLateMinutes = 0;
          }
        }
        recap.totalLateMinutes += effectiveLateMinutes;
      } else if (att.status === AttendanceStatus.PULANG_AWAL) {
        recap.totalPresent++;
        recap.earlyLeaveCount++;
      } else if (att.status === AttendanceStatus.IZIN) {
        recap.izinCount++;
      } else if (att.status === AttendanceStatus.SAKIT) {
        recap.sakitCount++;
      } else if (att.status === AttendanceStatus.ALFA) {
        recap.alfaCount++;
      } else if (att.status === AttendanceStatus.LIBUR) {
        recap.liburCount++;
      } else if (att.status === AttendanceStatus.CUTI) {
        recap.cutiCount++;
      }
    }

    // Hitung bonus dan potongan berdasarkan aturan
    const recaps = Array.from(empRecapMap.values()).map((recap) => {
      // Sisa kuota libur bulanan
      recap.remainingDayOffQuota = Math.max(0, (recap.monthlyDayOffQuota || 4) - recap.liburCount);
      // Bonus Disiplin dihitung per hari staf hadir tepat waktu (onTimeCount * disciplineBonusAmount)
      // Jika minWorkDaysForBonus > 0, pastikan mencapai syarat kehadiran; jika 0, langsung berlaku.
      const minDaysRequired = rule.minWorkDaysForBonus || 0;
      const meetsMinDays = minDaysRequired === 0 || recap.totalPresent >= minDaysRequired;
      const dailyBonusRate = Number(rule.disciplineBonusAmount) || 0;

      const isEligible = meetsMinDays && recap.onTimeCount > 0;
      const totalBonus = isEligible ? recap.onTimeCount * dailyBonusRate : 0;

      // Potongan keterlambatan = (Jumlah telat * per kejadian) + (Total menit telat * per menit)
      // Jika denda per menit diset ke 0, maka denda keterlambatan per menit otomatis Rp 0
      const dedPerOccurrence = Number(rule.lateDeductionPerOccurrence) || 0;
      const dedPerMinute = Number(rule.lateDeductionPerMinute) || 0;
      const totalDeduction = recap.lateCount * dedPerOccurrence + recap.totalLateMinutes * dedPerMinute;

      // Uang makan per hari: hanya didapat jika karyawan hadir (terlepas tepat waktu atau telat).
      // Jika izin, sakit, atau alfa (tidak hadir) maka TIDAK mendapatkan uang makan hari tersebut.
      const mealAllowanceRate = Number(rule.mealAllowancePerDay) || 0;
      const mealAllowanceAmount = recap.totalPresent * mealAllowanceRate;

      // Potongan gaji pokok jika karyawan tidak hadir (alfa)
      const absenceDeductionRate = Number(rule.absenceDeductionPerDay) || 0;
      const absenceDeductionAmount = recap.alfaCount * absenceDeductionRate;

      return {
        ...recap,
        dailyBonusRate,
        isEligibleForDisciplineBonus: isEligible,
        disciplineBonusAmount: totalBonus,
        lateDeductionAmount: totalDeduction,
        mealAllowanceRate,
        mealAllowanceAmount,
        absenceDeductionRate,
        absenceDeductionAmount,
      };
    });

    return {
      period: {
        startDate,
        endDate,
      },
      rule,
      recaps,
    };
  }

  /**
   * Export Laporan Absensi ke Excel (2 Sheet: Riwayat Absensi & Rekapitulasi Karyawan)
   */
  static async exportExcel(params: {
    businessId: number;
    startDate?: string;
    endDate?: string;
    employeeId?: number;
  }): Promise<Buffer> {
    const business = await prisma.business.findUnique({
      where: { id: params.businessId },
      select: { name: true, code: true },
    });

    const summaryData = await this.getMonthlySummary(params);
    const attendanceRecords = await this.getAll({
      businessId: params.businessId,
      startDate: params.startDate,
      endDate: params.endDate,
      employeeId: params.employeeId,
      limit: 5000,
      page: 1,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = `Robin Group - ${business?.name || 'Sistem'}`;
    workbook.created = new Date();

    // ==========================================
    // SHEET 1: RIWAYAT ABSENSI
    // ==========================================
    const sheet1 = workbook.addWorksheet('Riwayat Absensi');
    sheet1.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Tanggal', key: 'date', width: 14 },
      { header: 'Jam Masuk', key: 'clockIn', width: 12 },
      { header: 'Jam Pulang', key: 'clockOut', width: 12 },
      { header: 'Kode Staf', key: 'code', width: 14 },
      { header: 'Nama Staf', key: 'name', width: 24 },
      { header: 'Jabatan', key: 'position', width: 18 },
      { header: 'Shift', key: 'shift', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Menit Telat', key: 'lateMinutes', width: 14 },
      { header: 'Pulang Awal (Mnt)', key: 'earlyMinutes', width: 16 },
      { header: 'Catatan', key: 'notes', width: 25 },
    ];

    // Style Header Sheet 1
    const headerRow1 = sheet1.getRow(1);
    headerRow1.height = 26;
    headerRow1.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    let rowIdx = 1;
    for (const item of attendanceRecords.items) {
      const dateStr = item.date ? item.date.toISOString().slice(0, 10) : '-';
      const clockInStr = item.clockInTime ? this.formatTime(new Date(item.clockInTime)) : '-';
      const clockOutStr = item.clockOutTime ? this.formatTime(new Date(item.clockOutTime)) : '-';

      const row = sheet1.addRow({
        no: rowIdx++,
        date: dateStr,
        clockIn: clockInStr,
        clockOut: clockOutStr,
        code: item.employee.code,
        name: item.employee.name,
        position: item.employee.position,
        shift: item.shift?.name || 'Reguler',
        status: item.status,
        lateMinutes: item.lateMinutes || 0,
        earlyMinutes: item.earlyMinutes || 0,
        notes: item.clockInNotes || item.clockOutNotes || '-',
      });

      row.alignment = { vertical: 'middle' };
      if (item.status === AttendanceStatus.TERLAMBAT) {
        row.getCell('status').font = { color: { argb: 'FFDC2626' }, bold: true };
      } else if (item.status === AttendanceStatus.HADIR) {
        row.getCell('status').font = { color: { argb: 'FF16A34A' }, bold: true };
      } else if (item.status === AttendanceStatus.LIBUR) {
        row.getCell('status').font = { color: { argb: 'FF4F46E5' }, bold: true };
      } else if (item.status === AttendanceStatus.CUTI) {
        row.getCell('status').font = { color: { argb: 'FF0284C7' }, bold: true };
      } else if (item.status === AttendanceStatus.ALFA) {
        row.getCell('status').font = { color: { argb: 'FF991B1B' }, bold: true };
      }
    }

    // ==========================================
    // SHEET 2: REKAPITULASI KARYAWAN & GAJI
    // ==========================================
    const sheet2 = workbook.addWorksheet('Rekapitulasi Karyawan');
    sheet2.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Kode Staf', key: 'code', width: 14 },
      { header: 'Nama Staf', key: 'name', width: 24 },
      { header: 'Jabatan', key: 'position', width: 18 },
      { header: 'Total Hadir', key: 'totalPresent', width: 12 },
      { header: 'Tepat Waktu', key: 'onTime', width: 12 },
      { header: 'Terlambat', key: 'late', width: 12 },
      { header: 'Total Menit Telat', key: 'totalLateMinutes', width: 16 },
      { header: 'Libur (Off)', key: 'libur', width: 12 },
      { header: 'Cuti', key: 'cuti', width: 10 },
      { header: 'Izin', key: 'izin', width: 10 },
      { header: 'Sakit', key: 'sakit', width: 10 },
      { header: 'Alfa', key: 'alfa', width: 10 },
      { header: 'Bonus Tepat Waktu (Rp)', key: 'bonus', width: 20 },
      { header: 'Potongan Terlambat (Rp)', key: 'deduction', width: 20 },
      { header: 'Uang Makan (Rp)', key: 'mealAllowance', width: 18 },
      { header: 'Potongan Alfa (Rp)', key: 'absenceDeduction', width: 18 },
    ];

    const headerRow2 = sheet2.getRow(1);
    headerRow2.height = 26;
    headerRow2.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F766E' },
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    let empIdx = 1;
    for (const recap of summaryData.recaps) {
      const row = sheet2.addRow({
        no: empIdx++,
        code: recap.employee.code,
        name: recap.employee.name,
        position: recap.employee.position,
        totalPresent: recap.totalPresent,
        onTime: recap.onTimeCount,
        late: recap.lateCount,
        totalLateMinutes: recap.totalLateMinutes,
        libur: recap.liburCount,
        cuti: recap.cutiCount,
        izin: recap.izinCount,
        sakit: recap.sakitCount,
        alfa: recap.alfaCount,
        bonus: recap.disciplineBonusAmount,
        deduction: recap.lateDeductionAmount,
        mealAllowance: recap.mealAllowanceAmount,
        absenceDeduction: recap.absenceDeductionAmount,
      });

      row.alignment = { vertical: 'middle' };
      row.getCell('bonus').numFmt = '#,##0';
      row.getCell('deduction').numFmt = '#,##0';
      row.getCell('mealAllowance').numFmt = '#,##0';
      row.getCell('absenceDeduction').numFmt = '#,##0';

      if (recap.isEligibleForDisciplineBonus) {
        row.getCell('bonus').font = { color: { argb: 'FF16A34A' }, bold: true };
      }
      if (recap.lateDeductionAmount > 0) {
        row.getCell('deduction').font = { color: { argb: 'FFDC2626' }, bold: true };
      }
      if (recap.absenceDeductionAmount > 0) {
        row.getCell('absenceDeduction').font = { color: { argb: 'FF991B1B' }, bold: true };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
