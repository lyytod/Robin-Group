import { Prisma, JournalEntryType, PaymentMethod } from '@prisma/client';
import { prisma } from '../config/database.js';
import { calculateTotalPages, generateNomorBukti, resolveLocalDateTime } from '../utils/helpers.js';

export interface CreateEmployeeInput {
  businessId: number;
  userId?: number;
  code: string;
  name: string;
  position: string;
  phone?: string;
  salaryType?: 'BULANAN' | 'HARIAN';
  baseSalary?: number;
  allowance?: number;
  bankName?: string;
  bankAccount?: string;
  joinDate?: string;
  notes?: string;
}

export interface UpdateEmployeeInput {
  userId?: number | null;
  code?: string;
  name?: string;
  position?: string;
  phone?: string;
  salaryType?: 'BULANAN' | 'HARIAN';
  baseSalary?: number;
  allowance?: number;
  bankName?: string;
  bankAccount?: string;
  joinDate?: string;
  isActive?: boolean;
  notes?: string;
}

export interface CreateSalaryPaymentInput {
  businessId: number;
  createdById?: number;
  userId?: number;
  employeeId: number;
  periodStart: string;
  periodEnd: string;
  paymentDate?: string;
  baseSalary: number;
  allowance?: number;
  bonus?: number;
  deductions?: number;
  paymentMethod: PaymentMethod;
  accountId: number;
  notes?: string;
}

export interface CreateEmployeeDeductionInput {
  businessId: number;
  createdById?: number;
  userId?: number;
  employeeId: number;
  amount: number;
  type?: 'KASBON' | 'POTONGAN';
  date?: string;
  notes?: string;
}

export class SalaryService {
  /**
   * Helper nomor jurnal unik
   */
  private static async generateUniqueNomorJurnal(
    tx: any,
    businessId: number,
    prefix: 'JRN' = 'JRN'
  ): Promise<string> {
    const business = await tx.business.findUnique({
      where: { id: businessId },
      select: { code: true },
    });
    const bCode = business?.code || `B${businessId}`;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const countToday = await tx.journalEntry.count({
      where: {
        businessId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    let seq = countToday + 1;
    let nomorJurnal = generateNomorBukti(prefix, seq, bCode);

    while (await tx.journalEntry.findUnique({ where: { nomorJurnal } })) {
      seq++;
      nomorJurnal = generateNomorBukti(prefix, seq, bCode);
    }

    return nomorJurnal;
  }

  /**
   * Helper nomor bukti pembayaran gaji unik
   */
  private static async generateUniquePaymentNumber(
    tx: any,
    businessId: number,
    prefix: 'PAY' = 'PAY'
  ): Promise<string> {
    const business = await tx.business.findUnique({
      where: { id: businessId },
      select: { code: true },
    });
    const bCode = business?.code || `B${businessId}`;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const countToday = await tx.salaryPayment.count({
      where: {
        businessId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    let seq = countToday + 1;
    let paymentNumber = generateNomorBukti(prefix, seq, bCode);

    while (await tx.salaryPayment.findUnique({ where: { paymentNumber } })) {
      seq++;
      paymentNumber = generateNomorBukti(prefix, seq, bCode);
    }

    return paymentNumber;
  }

  // ============================================================
  // 1. MANAJEMEN KARYAWAN / STAF
  // ============================================================

  static async getEmployees(params: {
    businessId: number;
    search?: string;
    isActive?: boolean;
    page: number;
    limit: number;
    skip: number;
  }) {
    const where: Prisma.EmployeeWhereInput = {
      businessId: params.businessId,
      deletedAt: null,
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      ...(params.search && {
        OR: [
          { name: { contains: params.search } },
          { code: { contains: params.search } },
          { position: { contains: params.search } },
          { phone: { contains: params.search } },
        ],
      }),
    };

    const [total, items] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        include: {
          user: { select: { id: true, username: true, role: true } },
          deductions: {
            where: { status: { in: ['PENDING', 'PARTIAL'] }, deletedAt: null },
            select: { remainingAmount: true },
          },
          _count: { select: { salaryPayments: { where: { deletedAt: null } } } },
        },
      }),
    ]);

    return {
      items: items.map((emp) => ({
        id: emp.id,
        businessId: emp.businessId,
        userId: emp.userId,
        code: emp.code,
        name: emp.name,
        position: emp.position,
        phone: emp.phone,
        salaryType: emp.salaryType,
        baseSalary: Number(emp.baseSalary),
        allowance: Number(emp.allowance),
        totalFixedSalary: Number(emp.baseSalary.plus(emp.allowance)),
        pendingDeductionsTotal: emp.deductions.reduce((sum, d) => sum + Number(d.remainingAmount), 0),
        bankName: emp.bankName,
        bankAccount: emp.bankAccount,
        joinDate: emp.joinDate,
        isActive: emp.isActive,
        notes: emp.notes,
        createdAt: emp.createdAt,
        totalPaymentsCount: emp._count.salaryPayments,
        user: emp.user,
      })),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: calculateTotalPages(total, params.limit),
      },
    };
  }

  static async getEmployeeById(id: number, businessId: number) {
    const emp = await prisma.employee.findFirst({
      where: { id, businessId, deletedAt: null },
      include: {
        user: { select: { id: true, username: true, fullName: true, role: true } },
        salaryPayments: {
          where: { deletedAt: null },
          orderBy: { paymentDate: 'desc' },
          take: 10,
          include: {
            account: { select: { code: true, name: true } },
            journalEntry: { select: { nomorJurnal: true } },
          },
        },
      },
    });

    if (!emp) {
      throw new Error('Data karyawan tidak ditemukan.');
    }

    return {
      id: emp.id,
      businessId: emp.businessId,
      userId: emp.userId,
      code: emp.code,
      name: emp.name,
      position: emp.position,
      phone: emp.phone,
      salaryType: emp.salaryType,
      baseSalary: Number(emp.baseSalary),
      allowance: Number(emp.allowance),
      totalFixedSalary: Number(emp.baseSalary.plus(emp.allowance)),
      bankName: emp.bankName,
      bankAccount: emp.bankAccount,
      joinDate: emp.joinDate,
      isActive: emp.isActive,
      notes: emp.notes,
      user: emp.user,
      recentPayments: emp.salaryPayments.map((p) => ({
        id: p.id,
        paymentNumber: p.paymentNumber,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        paymentDate: p.paymentDate,
        netSalary: Number(p.netSalary),
        paymentMethod: p.paymentMethod,
        accountName: p.account.name,
        nomorJurnal: p.journalEntry?.nomorJurnal || '-',
      })),
    };
  }

  static async createEmployee(data: CreateEmployeeInput) {
    const cleanCode = data.code.trim().toUpperCase();
    const existing = await prisma.employee.findFirst({
      where: { businessId: data.businessId, code: cleanCode, deletedAt: null },
    });
    if (existing) {
      throw new Error(`Karyawan dengan kode "${cleanCode}" sudah terdaftar.`);
    }

    return await prisma.employee.create({
      data: {
        businessId: data.businessId,
        userId: data.userId || null,
        code: cleanCode,
        name: data.name.trim(),
        position: data.position.trim(),
        phone: data.phone?.trim() || null,
        salaryType: data.salaryType || 'BULANAN',
        baseSalary: new Prisma.Decimal(data.baseSalary || 0),
        allowance: new Prisma.Decimal(data.allowance || 0),
        bankName: data.bankName?.trim() || null,
        bankAccount: data.bankAccount?.trim() || null,
        joinDate: data.joinDate ? resolveLocalDateTime(data.joinDate) : new Date(),
        notes: data.notes?.trim() || null,
      },
      include: {
        user: { select: { id: true, username: true, role: true } },
      },
    });
  }

  static async updateEmployee(id: number, businessId: number, data: UpdateEmployeeInput) {
    const emp = await prisma.employee.findFirst({
      where: { id, businessId, deletedAt: null },
    });
    if (!emp) {
      throw new Error('Karyawan tidak ditemukan.');
    }

    const updateData: Prisma.EmployeeUpdateInput = {};
    if (data.code) {
      const cleanCode = data.code.trim().toUpperCase();
      const existing = await prisma.employee.findFirst({
        where: { businessId, code: cleanCode, deletedAt: null, NOT: { id } },
      });
      if (existing) {
        throw new Error(`Kode karyawan "${cleanCode}" sudah digunakan.`);
      }
      updateData.code = cleanCode;
    }

    if (data.name) updateData.name = data.name.trim();
    if (data.position) updateData.position = data.position.trim();
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.salaryType) updateData.salaryType = data.salaryType;
    if (data.baseSalary !== undefined) updateData.baseSalary = new Prisma.Decimal(data.baseSalary);
    if (data.allowance !== undefined) updateData.allowance = new Prisma.Decimal(data.allowance);
    if (data.bankName !== undefined) updateData.bankName = data.bankName?.trim() || null;
    if (data.bankAccount !== undefined) updateData.bankAccount = data.bankAccount?.trim() || null;
    if (data.joinDate) updateData.joinDate = resolveLocalDateTime(data.joinDate);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    if (data.userId !== undefined) updateData.user = data.userId ? { connect: { id: data.userId } } : { disconnect: true };

    return await prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, username: true, role: true } },
      },
    });
  }

  static async deleteEmployee(id: number, businessId: number) {
    const emp = await prisma.employee.findFirst({
      where: { id, businessId, deletedAt: null },
      include: {
        _count: { select: { salaryPayments: { where: { deletedAt: null } } } },
      },
    });

    if (!emp) {
      throw new Error('Data karyawan tidak ditemukan.');
    }

    // Soft delete karyawan
    await prisma.employee.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return {
      id,
      message: `Karyawan "${emp.name}" berhasil dinonaktifkan/dihapus.`,
    };
  }

  // ============================================================
  // 2. TRANSAKSI PENGGAJIAN & SLIP GAJI
  // ============================================================

  static async getPayments(params: {
    businessId: number;
    employeeId?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
    page: number;
    limit: number;
    skip: number;
  }) {
    const where: Prisma.SalaryPaymentWhereInput = {
      businessId: params.businessId,
      deletedAt: null,
      ...(params.employeeId && { employeeId: params.employeeId }),
      ...(params.startDate || params.endDate
        ? {
            paymentDate: {
              ...(params.startDate && { gte: new Date(params.startDate) }),
              ...(params.endDate && { lte: new Date(`${params.endDate}T23:59:59.999Z`) }),
            },
          }
        : {}),
      ...(params.search && {
        OR: [
          { paymentNumber: { contains: params.search } },
          { employee: { name: { contains: params.search } } },
          { employee: { position: { contains: params.search } } },
          { notes: { contains: params.search } },
        ],
      }),
    };

    const [total, items] = await Promise.all([
      prisma.salaryPayment.count({ where }),
      prisma.salaryPayment.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          employee: { select: { id: true, code: true, name: true, position: true } },
          account: { select: { id: true, code: true, name: true } },
          journalEntry: { select: { id: true, nomorJurnal: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        businessId: p.businessId,
        employeeId: p.employeeId,
        paymentNumber: p.paymentNumber,
        employee: p.employee,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        paymentDate: p.paymentDate,
        baseSalary: Number(p.baseSalary),
        allowance: Number(p.allowance),
        bonus: Number(p.bonus),
        deductions: Number(p.deductions),
        netSalary: Number(p.netSalary),
        paymentMethod: p.paymentMethod,
        account: p.account,
        journalEntry: p.journalEntry,
        notes: p.notes,
        creator: p.createdBy.fullName,
        createdAt: p.createdAt,
      })),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: calculateTotalPages(total, params.limit),
      },
    };
  }

  static async getPaymentById(id: number, businessId: number) {
    const payment = await prisma.salaryPayment.findFirst({
      where: { id, businessId, deletedAt: null },
      include: {
        employee: true,
        account: { select: { id: true, code: true, name: true } },
        journalEntry: {
          select: {
            id: true,
            nomorJurnal: true,
            totalDebit: true,
            totalKredit: true,
            items: {
              include: {
                account: { select: { code: true, name: true } },
              },
            },
          },
        },
        createdBy: { select: { id: true, fullName: true } },
        business: { select: { id: true, name: true, code: true, address: true, phone: true } },
        settledDeductions: {
          select: {
            id: true,
            amount: true,
            paidAmount: true,
            remainingAmount: true,
            type: true,
            date: true,
            notes: true,
          },
        },
        deductionItems: {
          include: {
            deduction: {
              select: {
                id: true,
                type: true,
                date: true,
                notes: true,
                amount: true,
                paidAmount: true,
                remainingAmount: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new Error('Data pembayaran gaji tidak ditemukan.');
    }

    return {
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      business: payment.business,
      employee: {
        id: payment.employee.id,
        code: payment.employee.code,
        name: payment.employee.name,
        position: payment.employee.position,
        phone: payment.employee.phone,
        bankName: payment.employee.bankName,
        bankAccount: payment.employee.bankAccount,
      },
      periodStart: payment.periodStart,
      periodEnd: payment.periodEnd,
      paymentDate: payment.paymentDate,
      baseSalary: Number(payment.baseSalary),
      allowance: Number(payment.allowance),
      bonus: Number(payment.bonus),
      deductions: Number(payment.deductions),
      netSalary: Number(payment.netSalary),
      paymentMethod: payment.paymentMethod,
      account: payment.account,
      settledDeductions: payment.settledDeductions.map((d) => ({
        id: d.id,
        amount: Number(d.amount),
        paidAmount: Number(d.paidAmount),
        remainingAmount: Number(d.remainingAmount),
        type: d.type,
        date: d.date,
        notes: d.notes,
      })),
      appliedDeductions: payment.deductionItems.map((item) => ({
        id: item.id,
        deductionId: item.deductionId,
        amountApplied: Number(item.amountApplied),
        originalAmount: Number(item.deduction.amount),
        remainingAmount: Number(item.deduction.remainingAmount),
        type: item.deduction.type,
        date: item.deduction.date,
        notes: item.deduction.notes,
      })),
      journalEntry: payment.journalEntry
        ? {
            id: payment.journalEntry.id,
            nomorJurnal: payment.journalEntry.nomorJurnal,
            totalDebit: Number(payment.journalEntry.totalDebit),
            totalKredit: Number(payment.journalEntry.totalKredit),
            lines: payment.journalEntry.items.map((i) => ({
              accountCode: i.account.code,
              accountName: i.account.name,
              isDebit: i.isDebit,
              amount: Number(i.amount),
              description: i.description,
            })),
          }
        : null,
      notes: payment.notes,
      creator: payment.createdBy.fullName,
      createdAt: payment.createdAt,
    };
  }

  /**
   * Proses pembayaran gaji & auto-posting jurnal akuntansi (double-entry)
   */
  static async createPayment(data: CreateSalaryPaymentInput) {
    const baseSal = new Prisma.Decimal(data.baseSalary || 0);
    const allow = new Prisma.Decimal(data.allowance || 0);
    const bon = new Prisma.Decimal(data.bonus || 0);
    const ded = new Prisma.Decimal(data.deductions || 0);

    const netSalary = baseSal.plus(allow).plus(bon).minus(ded);
    if (netSalary.lessThanOrEqualTo(0)) {
      throw new Error('Total gaji bersih (Take Home Pay) harus lebih dari 0.');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Verifikasi karyawan
      const employee = await tx.employee.findFirst({
        where: { id: data.employeeId, businessId: data.businessId, deletedAt: null },
      });
      if (!employee) {
        throw new Error('Karyawan tidak ditemukan atau sudah dinonaktifkan.');
      }

      // 2. Verifikasi akun kas/bank pembayar
      const payAccount = await tx.account.findFirst({
        where: { id: data.accountId, businessId: data.businessId },
      });
      if (!payAccount) {
        throw new Error('Akun Kas/Bank pembayar tidak ditemukan.');
      }

      // 3. Resolve Akun Beban Gaji (CoA 5-2001 Beban Gaji & Upah atau fallback Beban Operasional)
      let salaryExpenseAcc = await tx.account.findFirst({
        where: { businessId: data.businessId, code: '5-2001' },
      });
      if (!salaryExpenseAcc) {
        salaryExpenseAcc = await tx.account.findFirst({
          where: {
            businessId: data.businessId,
            type: 'BEBAN',
            name: { contains: 'Gaji' },
          },
        });
      }
      if (!salaryExpenseAcc) {
        salaryExpenseAcc = await tx.account.findFirst({
          where: { businessId: data.businessId, type: 'BEBAN' },
        });
      }

      if (!salaryExpenseAcc) {
        throw new Error(
          'Akun Beban Gaji & Upah tidak ditemukan pada Bagan Akun (CoA). Harap buat akun beban gaji terlebih dahulu di menu Buku Akuntansi.'
        );
      }

      const pDate = data.paymentDate ? resolveLocalDateTime(data.paymentDate) : new Date();
      const pStart = resolveLocalDateTime(data.periodStart);
      const pEnd = resolveLocalDateTime(data.periodEnd);

      const paymentNumber = await this.generateUniquePaymentNumber(tx, data.businessId, 'PAY');
      const nomorJurnal = await this.generateUniqueNomorJurnal(tx, data.businessId, 'JRN');

      const creatorId = data.createdById || data.userId || 1;

      // 4. Auto-posting Jurnal Umum Double-Entry:
      // (D) Beban Gaji & Upah (salaryExpenseAcc)  Rp netSalary
      // (K) Kas / Bank Pembayar (payAccount)       Rp netSalary
      const journal = await tx.journalEntry.create({
        data: {
          businessId: data.businessId,
          nomorJurnal,
          type: JournalEntryType.PENGELUARAN,
          description: `Gaji Staf: ${employee.name} (${paymentNumber})`,
          totalDebit: netSalary,
          totalKredit: netSalary,
          journalDate: pDate,
          createdById: creatorId,
          items: {
            create: [
              {
                accountId: salaryExpenseAcc.id,
                isDebit: true,
                amount: netSalary,
                description: `Beban gaji ${employee.name} - Periode ${data.periodStart} s.d. ${data.periodEnd}`,
              },
              {
                accountId: payAccount.id,
                isDebit: false,
                amount: netSalary,
                description: `Pembayaran via ${payAccount.name}${data.notes ? ` - ${data.notes}` : ''}`,
              },
            ],
          },
        },
      });

      // 5. Simpan catatan pembayaran gaji & slip
      const payment = await tx.salaryPayment.create({
        data: {
          businessId: data.businessId,
          employeeId: employee.id,
          paymentNumber,
          periodStart: pStart,
          periodEnd: pEnd,
          paymentDate: pDate,
          baseSalary: baseSal,
          allowance: allow,
          bonus: bon,
          deductions: ded,
          netSalary,
          paymentMethod: data.paymentMethod,
          accountId: payAccount.id,
          journalEntryId: journal.id,
          notes: data.notes?.trim() || null,
          createdById: creatorId,
        },
        include: {
          employee: { select: { id: true, code: true, name: true, position: true } },
          account: { select: { id: true, code: true, name: true } },
          journalEntry: { select: { id: true, nomorJurnal: true } },
        },
      });

      // 6. Alokasi pemotongan kasbon secara FIFO (First-In, First-Out)
      const inputDeductions = Number(ded || 0);

      if (inputDeductions > 0) {
        // Ambil seluruh kasbon aktif (PENDING atau PARTIAL) urut dari tanggal & ID tertua
        const activeDeductions = await tx.employeeDeduction.findMany({
          where: {
            employeeId: employee.id,
            businessId: data.businessId,
            status: { in: ['PENDING', 'PARTIAL'] },
            deletedAt: null,
          },
          orderBy: [{ date: 'asc' }, { id: 'asc' }],
        });

        let unallocatedDeduction = inputDeductions;

        for (const deduction of activeDeductions) {
          if (unallocatedDeduction <= 0) break;

          const currentRemaining = Number(deduction.remainingAmount);
          if (currentRemaining <= 0) continue;

          // Nominal yang diaplikasikan ke kasbon ini
          const applied = Math.min(unallocatedDeduction, currentRemaining);
          unallocatedDeduction -= applied;

          const newPaidAmount = Number(deduction.paidAmount) + applied;
          const newRemainingAmount = Math.max(0, Number(deduction.amount) - newPaidAmount);
          const newStatus = newRemainingAmount <= 0.001 ? 'SETTLED' : 'PARTIAL';

          // 1. Simpan ke tabel rincian pemotongan kasbon
          await tx.salaryPaymentDeductionItem.create({
            data: {
              salaryPaymentId: payment.id,
              deductionId: deduction.id,
              amountApplied: new Prisma.Decimal(applied),
            },
          });

          // 2. Update status dan nominal sisa kasbon
          await tx.employeeDeduction.update({
            where: { id: deduction.id },
            data: {
              paidAmount: new Prisma.Decimal(newPaidAmount),
              remainingAmount: new Prisma.Decimal(newRemainingAmount),
              status: newStatus,
              salaryPaymentId: payment.id,
            },
          });
        }
      }

      return {
        payment,
        journal,
        message: `Pembayaran gaji ${paymentNumber} untuk ${employee.name} berhasil dicatat dan diposting ke Jurnal Akuntansi!`,
      };
    });
  }

  /**
   * Hapus transaksi pembayaran gaji & otomatis hapus jurnal akuntansi terkait
   */
  static async deletePayment(id: number, businessId: number) {
    return await prisma.$transaction(async (tx) => {
      const payment = await tx.salaryPayment.findFirst({
        where: { id, businessId },
        include: {
          employee: { select: { name: true } },
          journalEntry: { select: { id: true, nomorJurnal: true } },
        },
      });

      if (!payment) {
        throw new Error('Data pembayaran gaji tidak ditemukan.');
      }

      // Hapus jurnal akuntansi terkait jika ada
      if (payment.journalEntryId) {
        const jId = payment.journalEntryId;

        // Unlink foreign key
        await tx.salaryPayment.update({
          where: { id },
          data: { journalEntryId: null },
        });

        // Hapus baris jurnal
        await tx.journalItem.deleteMany({
          where: { journalEntryId: jId },
        });

        // Hapus header jurnal
        await tx.journalEntry.deleteMany({
          where: { id: jId },
        });
      }

      // Kembalikan kasbon/potongan yang tadinya terpotong secara proporsional sesuai nominal applied
      const deductionItems = await tx.salaryPaymentDeductionItem.findMany({
        where: { salaryPaymentId: id },
        include: { deduction: true },
      });

      for (const item of deductionItems) {
        if (item.deduction) {
          const applied = Number(item.amountApplied);
          const revertedPaid = Math.max(0, Number(item.deduction.paidAmount) - applied);
          const revertedRemaining = Math.max(0, Number(item.deduction.amount) - revertedPaid);
          const revertedStatus = revertedPaid <= 0.001 ? 'PENDING' : 'PARTIAL';

          await tx.employeeDeduction.update({
            where: { id: item.deductionId },
            data: {
              paidAmount: new Prisma.Decimal(revertedPaid),
              remainingAmount: new Prisma.Decimal(revertedRemaining),
              status: revertedStatus,
            },
          });
        }
      }

      // Hapus relasi pemotongan kasbon
      await tx.salaryPaymentDeductionItem.deleteMany({
        where: { salaryPaymentId: id },
      });

      // Lepas foreign key salaryPaymentId lama jika ada
      await tx.employeeDeduction.updateMany({
        where: { salaryPaymentId: id },
        data: {
          salaryPaymentId: null,
        },
      });

      // Hapus record pembayaran gaji
      await tx.salaryPayment.delete({
        where: { id },
      });

      return {
        id,
        message: `Pembayaran gaji ${payment.paymentNumber} (${payment.employee.name}) beserta jurnal pembukuan berhasil dihapus.`,
      };
    });
  }

  /**
   * KPI / Dashboard Summary untuk halaman Manajemen Gaji
   */
  static async getSummary(businessId: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [activeEmployeesCount, totalPaidThisMonth, paymentsCountThisMonth, activeKasbonSum] =
      await Promise.all([
        prisma.employee.count({
          where: { businessId, isActive: true, deletedAt: null },
        }),
        prisma.salaryPayment.aggregate({
          where: {
            businessId,
            deletedAt: null,
            paymentDate: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { netSalary: true },
        }),
        prisma.salaryPayment.count({
          where: {
            businessId,
            deletedAt: null,
            paymentDate: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
        prisma.employeeDeduction.aggregate({
          where: {
            businessId,
            status: { in: ['PENDING', 'PARTIAL'] },
            deletedAt: null,
          },
          _sum: { remainingAmount: true },
        }),
      ]);

    return {
      activeEmployeesCount,
      totalPaidThisMonth: Number(totalPaidThisMonth._sum.netSalary || 0),
      paymentsCountThisMonth,
      totalActiveKasbon: Number(activeKasbonSum._sum.remainingAmount || 0),
    };
  }

  // ============================================================
  // 3. CATATAN KASBON & POTONGAN KARYAWAN
  // ============================================================

  static async createDeduction(data: CreateEmployeeDeductionInput) {
    if (!data.amount || data.amount <= 0) {
      throw new Error('Jumlah kasbon / potongan harus lebih dari 0.');
    }

    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, businessId: data.businessId, deletedAt: null },
    });
    if (!employee) {
      throw new Error('Karyawan tidak ditemukan.');
    }

    const dDate = data.date ? resolveLocalDateTime(data.date) : new Date();
    const creatorId = data.createdById || data.userId || 1;
    const amountDec = new Prisma.Decimal(data.amount);

    return await prisma.employeeDeduction.create({
      data: {
        businessId: data.businessId,
        employeeId: employee.id,
        amount: amountDec,
        paidAmount: new Prisma.Decimal(0),
        remainingAmount: amountDec,
        type: data.type || 'KASBON',
        date: dDate,
        notes: data.notes?.trim() || null,
        status: 'PENDING',
        createdById: creatorId,
      },
      include: {
        employee: { select: { id: true, code: true, name: true, position: true } },
      },
    });
  }

  static async getPendingDeductionsByEmployee(employeeId: number, businessId: number) {
    const items = await prisma.employeeDeduction.findMany({
      where: {
        employeeId,
        businessId,
        status: { in: ['PENDING', 'PARTIAL'] },
        deletedAt: null,
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    });

    const totalAmount = items.reduce((sum, item) => sum + Number(item.remainingAmount), 0);

    return {
      employeeId,
      totalAmount,
      count: items.length,
      items: items.map((i) => ({
        id: i.id,
        amount: Number(i.amount),
        paidAmount: Number(i.paidAmount),
        remainingAmount: Number(i.remainingAmount),
        type: i.type,
        date: i.date,
        notes: i.notes,
        status: i.status,
      })),
    };
  }

  static async getDeductions(params: {
    businessId: number;
    employeeId?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
    skip: number;
  }) {
    let statusFilter: any = params.status;
    if (params.status === 'ACTIVE') {
      statusFilter = { in: ['PENDING', 'PARTIAL'] };
    }

    const where: Prisma.EmployeeDeductionWhereInput = {
      businessId: params.businessId,
      deletedAt: null,
      ...(params.employeeId && { employeeId: params.employeeId }),
      ...(statusFilter && { status: statusFilter }),
      ...(params.startDate || params.endDate
        ? {
            date: {
              ...(params.startDate && { gte: new Date(params.startDate) }),
              ...(params.endDate && { lte: new Date(`${params.endDate}T23:59:59.999Z`) }),
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.employeeDeduction.count({ where }),
      prisma.employeeDeduction.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { date: 'desc' },
        include: {
          employee: { select: { id: true, code: true, name: true, position: true } },
          createdBy: { select: { id: true, fullName: true } },
          salaryPayment: { select: { id: true, paymentNumber: true, paymentDate: true } },
        },
      }),
    ]);

    return {
      items: items.map((d) => ({
        id: d.id,
        businessId: d.businessId,
        employeeId: d.employeeId,
        employee: d.employee,
        amount: Number(d.amount),
        paidAmount: Number(d.paidAmount),
        remainingAmount: Number(d.remainingAmount),
        type: d.type,
        date: d.date,
        notes: d.notes,
        status: d.status,
        creator: d.createdBy.fullName,
        salaryPayment: d.salaryPayment,
        createdAt: d.createdAt,
      })),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: calculateTotalPages(total, params.limit),
      },
    };
  }

  static async deleteDeduction(id: number, businessId: number) {
    const deduction = await prisma.employeeDeduction.findFirst({
      where: { id, businessId, deletedAt: null },
      include: { employee: { select: { name: true } } },
    });

    if (!deduction) {
      throw new Error('Data kasbon / potongan tidak ditemukan.');
    }

    if (deduction.status === 'SETTLED' || Number(deduction.paidAmount) > 0) {
      throw new Error(
        'Kasbon / potongan ini sudah pernah dipotong/dicicil pada pembayaran gaji dan tidak dapat dihapus langsung.'
      );
    }

    await prisma.employeeDeduction.delete({
      where: { id },
    });

    return {
      id,
      message: `Catatan kasbon/potongan sebesar Rp ${Number(deduction.amount).toLocaleString('id-ID')} untuk ${deduction.employee.name} berhasil dihapus.`,
    };
  }
}

