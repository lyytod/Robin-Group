import { prisma } from '../config/database.js';
import { JournalEntryType, NormalBalance, Prisma } from '@prisma/client';
import { calculateTotalPages, generateNomorBukti, resolveLocalDateTime } from '../utils/helpers.js';

export interface ManualJournalLineInput {
  accountId: number;
  isDebit: boolean;
  amount: number | string;
  description?: string;
}

export interface CreateManualJournalInput {
  type: JournalEntryType;
  description: string;
  journalDate?: string;
  items: ManualJournalLineInput[];
}

export class JournalService {
  /**
   * 1. INPUT JURNAL UMUM MANUAL (PENYESUAIAN, TRANSFER, PENYUSUTAN, MODAL)
   * Wajib memastikan Double-Entry (Debit === Kredit)
   */
  static async createManual(
    businessId: number,
    userId: number,
    input: CreateManualJournalInput
  ) {
    if (!input.description || !input.items || input.items.length < 2) {
      throw new Error('Keterangan jurnal dan minimal 2 baris akun (Debit & Kredit) wajib diisi.');
    }

    return await prisma.$transaction(async (tx) => {
      let sumDebit = new Prisma.Decimal(0);
      let sumKredit = new Prisma.Decimal(0);

      const validatedLines: {
        accountId: number;
        isDebit: boolean;
        amount: Prisma.Decimal;
        description: string;
      }[] = [];

      for (const item of input.items) {
        const amt = new Prisma.Decimal(item.amount);
        if (amt.lessThanOrEqualTo(0)) {
          throw new Error('Nominal jurnal harus lebih besar dari 0.');
        }

        const account = await tx.account.findFirst({
          where: { id: item.accountId, businessId },
        });

        if (!account) {
          throw new Error(`Akun dengan ID ${item.accountId} tidak ditemukan.`);
        }

        if (item.isDebit) {
          sumDebit = sumDebit.plus(amt);
        } else {
          sumKredit = sumKredit.plus(amt);
        }

        validatedLines.push({
          accountId: item.accountId,
          isDebit: item.isDebit,
          amount: amt,
          description: item.description?.trim() || input.description.trim(),
        });
      }

      // Validasi keseimbangan akuntansi double-entry
      if (!sumDebit.equals(sumKredit)) {
        throw new Error(
          `Prinsip akuntansi gagal: Total Debit (${sumDebit}) tidak sama dengan Total Kredit (${sumKredit}). Jurnal wajib seimbang.`
        );
      }

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
      let nomorJurnal = generateNomorBukti('JRN', seq, bCode);

      while (await tx.journalEntry.findUnique({ where: { nomorJurnal } })) {
        seq++;
        nomorJurnal = generateNomorBukti('JRN', seq, bCode);
      }

      const journal = await tx.journalEntry.create({
        data: {
          businessId,
          nomorJurnal,
          type: input.type || JournalEntryType.PENYESUAIAN,
          description: input.description.trim(),
          totalDebit: sumDebit,
          totalKredit: sumKredit,
          journalDate: resolveLocalDateTime(input.journalDate),
          createdById: userId,
          items: {
            create: validatedLines.map((line) => ({
              accountId: line.accountId,
              isDebit: line.isDebit,
              amount: line.amount,
              description: line.description,
            })),
          },
        },
        include: {
          items: {
            include: {
              account: { select: { code: true, name: true } },
            },
          },
        },
      });

      return {
        id: journal.id,
        nomorJurnal: journal.nomorJurnal,
        type: journal.type,
        description: journal.description,
        totalDebit: Number(journal.totalDebit),
        totalKredit: Number(journal.totalKredit),
        journalDate: journal.journalDate,
        lines: journal.items.map((line) => ({
          accountCode: line.account.code,
          accountName: line.account.name,
          isDebit: line.isDebit,
          amount: Number(line.amount),
          description: line.description,
        })),
      };
    });
  }

  /**
   * 2. DAFTAR JURNAL UMUM
   */
  static async getAll(params: {
    businessId: number;
    type?: JournalEntryType;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: 'date' | 'amount' | 'nomor';
    sortOrder?: 'asc' | 'desc';
    page: number;
    limit: number;
    skip: number;
  }) {
    const where: any = {
      businessId: params.businessId,
    };

    if (params.type) {
      where.type = params.type;
    }

    if (params.search) {
      where.OR = [
        { nomorJurnal: { contains: params.search } },
        { description: { contains: params.search } },
      ];
    }

    if (params.startDate || params.endDate) {
      where.journalDate = {};
      if (params.startDate) {
        where.journalDate.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        where.journalDate.lte = end;
      }
    }

    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
    let orderBy: any = { journalDate: sortOrder };
    if (params.sortBy === 'amount') {
      orderBy = { totalDebit: sortOrder };
    } else if (params.sortBy === 'nomor') {
      orderBy = { nomorJurnal: sortOrder };
    }

    const [total, journals] = await Promise.all([
      prisma.journalEntry.count({ where }),
      prisma.journalEntry.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy,
        include: {
          createdBy: { select: { fullName: true } },
          inventoryMovement: { select: { id: true } },
          items: {
            include: {
              account: { select: { code: true, name: true } },
            },
          },
        },
      }),
    ]);

    return {
      journals: journals.map((j) => ({
        id: j.id,
        nomorJurnal: j.nomorJurnal,
        type: j.type,
        description: j.description,
        totalDebit: Number(j.totalDebit),
        totalKredit: Number(j.totalKredit),
        journalDate: j.journalDate,
        isReversed: j.isReversed,
        reversedFromId: j.reversedFromId,
        transactionId: j.transactionId,
        isManual: !j.transactionId,
        creator: j.createdBy.fullName,
        lines: j.items.map((item) => ({
          id: item.id,
          accountId: item.accountId,
          accountCode: item.account.code,
          accountName: item.account.name,
          isDebit: item.isDebit,
          amount: Number(item.amount),
          description: item.description,
        })),
      })),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: calculateTotalPages(total, params.limit),
      },
    };
  }

  /**
   * 2b. DETAIL JURNAL UMUM BERDASARKAN ID
   */
  static async getById(id: number, businessId: number) {
    const journal = await prisma.journalEntry.findFirst({
      where: { id, businessId },
      include: {
        createdBy: { select: { fullName: true } },
        inventoryMovement: { select: { id: true } },
        items: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
    });

    if (!journal) {
      throw new Error('Jurnal tidak ditemukan.');
    }

    return {
      id: journal.id,
      nomorJurnal: journal.nomorJurnal,
      type: journal.type,
      description: journal.description,
      totalDebit: Number(journal.totalDebit),
      totalKredit: Number(journal.totalKredit),
      journalDate: journal.journalDate,
      isReversed: journal.isReversed,
      reversedFromId: journal.reversedFromId,
      transactionId: journal.transactionId,
      isManual: !journal.transactionId,
      creator: journal.createdBy.fullName,
      lines: journal.items.map((line) => ({
        id: line.id,
        accountId: line.accountId,
        accountCode: line.account.code,
        accountName: line.account.name,
        accountType: line.account.type,
        isDebit: line.isDebit,
        amount: Number(line.amount),
        description: line.description,
      })),
    };
  }

  /**
   * 2c. UPDATE JURNAL MANUAL
   * Hanya jurnal manual (tanpa relasi POS dan tanpa relasi mutasi inventaris) yang dapat diedit
   */
  static async updateManual(
    id: number,
    businessId: number,
    _userId: number,
    input: CreateManualJournalInput
  ) {
    const existing = await prisma.journalEntry.findFirst({
      where: { id },
      include: { inventoryMovement: { select: { id: true } } },
    });

    if (!existing) {
      throw new Error('Data jurnal tidak ditemukan.');
    }

    const user = await prisma.user.findUnique({
      where: { id: _userId },
      select: { role: true },
    });
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const isAdmin = user?.role === 'ADMIN';

    if (!isSuperAdmin && !isAdmin) {
      throw new Error('Akses ditolak: Hanya Admin dan Super Admin yang memiliki wewenang untuk mengubah jurnal.');
    }

    // Jika jurnal berasal dari transaksi kasir POS, HANYA Super Admin yang boleh mengubah
    if (existing.transactionId && !isSuperAdmin) {
      throw new Error('Akses ditolak: Jurnal penjualan kasir hanya dapat diubah oleh Super Admin.');
    }

    if (existing.businessId !== businessId && !isSuperAdmin) {
      throw new Error('Akses ditolak: Jurnal bukan milik unit usaha aktif Anda.');
    }

    if (existing.isReversed) {
      throw new Error('Jurnal yang telah dibatalkan / dibalikkan tidak dapat diedit.');
    }

    if (!input.description || !input.items || input.items.length < 2) {
      throw new Error('Keterangan jurnal dan minimal 2 baris akun (Debit & Kredit) wajib diisi.');
    }

    return await prisma.$transaction(async (tx) => {
      let sumDebit = new Prisma.Decimal(0);
      let sumKredit = new Prisma.Decimal(0);

      const validatedLines: {
        accountId: number;
        isDebit: boolean;
        amount: Prisma.Decimal;
        description: string;
      }[] = [];

      for (const item of input.items) {
        const amt = new Prisma.Decimal(item.amount);
        if (amt.lessThanOrEqualTo(0)) {
          throw new Error('Nominal jurnal harus lebih besar dari 0.');
        }

        const account = await tx.account.findFirst({
          where: { id: item.accountId, businessId: existing.businessId },
        });

        if (!account) {
          throw new Error(`Akun dengan ID ${item.accountId} tidak ditemukan.`);
        }

        if (item.isDebit) {
          sumDebit = sumDebit.plus(amt);
        } else {
          sumKredit = sumKredit.plus(amt);
        }

        validatedLines.push({
          accountId: item.accountId,
          isDebit: item.isDebit,
          amount: amt,
          description: item.description?.trim() || input.description.trim(),
        });
      }

      // Validasi keseimbangan akuntansi double-entry
      if (!sumDebit.equals(sumKredit)) {
        throw new Error(
          `Prinsip akuntansi gagal: Total Debit (${sumDebit}) tidak sama dengan Total Kredit (${sumKredit}). Jurnal wajib seimbang.`
        );
      }

      // Hapus baris lama
      await tx.journalItem.deleteMany({
        where: { journalEntryId: id },
      });

      // Update header dan masukkan baris baru
      const updated = await tx.journalEntry.update({
        where: { id },
        data: {
          type: input.type || existing.type,
          description: input.description.trim(),
          totalDebit: sumDebit,
          totalKredit: sumKredit,
          journalDate: input.journalDate ? resolveLocalDateTime(input.journalDate) : existing.journalDate,
          items: {
            create: validatedLines.map((line) => ({
              accountId: line.accountId,
              isDebit: line.isDebit,
              amount: line.amount,
              description: line.description,
            })),
          },
        },
        include: {
          items: {
            include: {
              account: { select: { code: true, name: true } },
            },
          },
        },
      });

      return {
        id: updated.id,
        nomorJurnal: updated.nomorJurnal,
        type: updated.type,
        description: updated.description,
        totalDebit: Number(updated.totalDebit),
        totalKredit: Number(updated.totalKredit),
        journalDate: updated.journalDate,
        lines: updated.items.map((line) => ({
          accountCode: line.account.code,
          accountName: line.account.name,
          isDebit: line.isDebit,
          amount: Number(line.amount),
          description: line.description,
        })),
      };
    });
  }

  /**
   * 2d. HAPUS JURNAL MANUAL
   * Hanya jurnal manual tanpa transaksi POS dan tanpa mutasi inventaris yang dapat dihapus
   */
  static async deleteManual(id: number, businessId: number, _userId: number) {
    const existing = await prisma.journalEntry.findFirst({
      where: { id },
      include: {
        inventoryMovement: { select: { id: true } },
        reversalOf: { select: { id: true } },
      },
    });

    if (!existing) {
      throw new Error('Data jurnal tidak ditemukan.');
    }

    const user = await prisma.user.findUnique({
      where: { id: _userId },
      select: { role: true },
    });
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const isAdmin = user?.role === 'ADMIN';

    if (!isSuperAdmin && !isAdmin) {
      throw new Error('Akses ditolak: Hanya Admin dan Super Admin yang memiliki wewenang untuk menghapus jurnal.');
    }

    // Jika jurnal berasal dari transaksi kasir POS, HANYA Super Admin yang boleh menghapus
    if (existing.transactionId && !isSuperAdmin) {
      throw new Error('Akses ditolak: Jurnal penjualan kasir hanya dapat dihapus oleh Super Admin.');
    }

    if (existing.businessId !== businessId && !isSuperAdmin) {
      throw new Error('Akses ditolak: Jurnal bukan milik unit usaha aktif Anda.');
    }

    return await prisma.$transaction(async (tx) => {
      // Jika jurnal terikat transaksi kasir POS, sinkronkan status transaksi dan kembalikan stok
      if (existing.transactionId) {
        const trx = await tx.transaction.findUnique({
          where: { id: existing.transactionId },
          include: { items: true },
        });

        if (trx && !trx.voidedAt) {
          // Kembalikan stok produk jika transaksi penjualan
          if (trx.type === 'PEMASUKAN') {
            for (const it of trx.items) {
              if (it.productId) {
                const prod = await tx.product.findUnique({ where: { id: it.productId } });
                if (prod) {
                  const stockBefore = prod.currentStock;
                  const stockAfter = stockBefore.plus(it.quantity);
                  await tx.product.update({
                    where: { id: it.productId },
                    data: { currentStock: stockAfter },
                  });
                  await tx.stockMovement.create({
                    data: {
                      businessId,
                      productId: it.productId,
                      type: 'RETUR',
                      quantity: it.quantity,
                      stockBefore,
                      stockAfter,
                      reference: `DEL-${trx.nomorBukti}`,
                      notes: `Pengembalian stok karena jurnal penjualan dihapus oleh Super Admin`,
                    },
                  });
                }
              }
            }
          }

          // Tandai transaksi kasir sebagai voided agar dashboard dan laporan kasir sinkron
          await tx.transaction.update({
            where: { id: existing.transactionId },
            data: {
              voidedAt: new Date(),
              voidReason: 'Jurnal transaksi dihapus oleh Super Admin',
            },
          });
        }
      }

      // Jika memiliki jurnal pembalik atau dijadikan referensi, putuskan relasi reversedFromId
      if (existing.reversalOf && existing.reversalOf.length > 0) {
        await tx.journalEntry.updateMany({
          where: { reversedFromId: id },
          data: { reversedFromId: null },
        });
      }

      // Jika terikat mutasi inventaris, putuskan relasi terlebih dahulu agar tidak terkena constraint foreign key
      if (existing.inventoryMovement) {
        await tx.inventoryMovement.update({
          where: { id: existing.inventoryMovement.id },
          data: { journalEntryId: null },
        });
      }

      // Hapus baris detail jurnal terlebih dahulu
      await tx.journalItem.deleteMany({
        where: { journalEntryId: id },
      });

      // Hapus header jurnal
      await tx.journalEntry.delete({
        where: { id },
      });

      return {
        id,
        nomorJurnal: existing.nomorJurnal,
        message: `Jurnal ${existing.nomorJurnal} berhasil dihapus.`,
      };
    });
  }

  /**
   * 3. BUKU BESAR (GENERAL LEDGER) PER AKUN
   * Menghitung saldo awal, mutasi debit/kredit, dan saldo berjalan
   */
  static async getLedger(params: {
    businessId: number;
    accountId: number;
    startDate?: string;
    endDate?: string;
  }) {
    const account = await prisma.account.findFirst({
      where: { id: params.accountId, businessId: params.businessId },
    });

    if (!account) {
      throw new Error('Akun akuntansi tidak ditemukan.');
    }

    const isDebitNormal = account.normalBalance === NormalBalance.DEBIT;

    // 1. Hitung Saldo Awal (sebelum startDate jika ada)
    let initialBalance = new Prisma.Decimal(0);

    if (params.startDate) {
      const start = new Date(params.startDate);
      const priorItems = await prisma.journalItem.findMany({
        where: {
          accountId: params.accountId,
          journalEntry: {
            businessId: params.businessId,
            journalDate: { lt: start },
          },
        },
        select: {
          isDebit: true,
          amount: true,
        },
      });

      for (const item of priorItems) {
        if (isDebitNormal) {
          initialBalance = item.isDebit
            ? initialBalance.plus(item.amount)
            : initialBalance.minus(item.amount);
        } else {
          initialBalance = !item.isDebit
            ? initialBalance.plus(item.amount)
            : initialBalance.minus(item.amount);
        }
      }
    }

    // 2. Ambil mutasi dalam periode
    const whereJournal: any = {
      businessId: params.businessId,
    };

    if (params.startDate || params.endDate) {
      whereJournal.journalDate = {};
      if (params.startDate) {
        whereJournal.journalDate.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        whereJournal.journalDate.lte = end;
      }
    }

    const items = await prisma.journalItem.findMany({
      where: {
        accountId: params.accountId,
        journalEntry: whereJournal,
      },
      orderBy: {
        journalEntry: {
          journalDate: 'asc',
        },
      },
      include: {
        journalEntry: {
          select: {
            id: true,
            nomorJurnal: true,
            journalDate: true,
            description: true,
            type: true,
          },
        },
      },
    });

    // 3. Hitung saldo berjalan baris demi baris
    let runningBalance = initialBalance;
    let totalDebitMutation = new Prisma.Decimal(0);
    let totalKreditMutation = new Prisma.Decimal(0);

    const mutations = items.map((item) => {
      const debitAmount = item.isDebit ? item.amount : new Prisma.Decimal(0);
      const kreditAmount = !item.isDebit ? item.amount : new Prisma.Decimal(0);

      totalDebitMutation = totalDebitMutation.plus(debitAmount);
      totalKreditMutation = totalKreditMutation.plus(kreditAmount);

      if (isDebitNormal) {
        runningBalance = runningBalance.plus(debitAmount).minus(kreditAmount);
      } else {
        runningBalance = runningBalance.plus(kreditAmount).minus(debitAmount);
      }

      return {
        id: item.id,
        journalId: item.journalEntry.id,
        nomorJurnal: item.journalEntry.nomorJurnal,
        journalDate: item.journalEntry.journalDate,
        description: item.description || item.journalEntry.description,
        debit: Number(debitAmount),
        kredit: Number(kreditAmount),
        balance: Number(runningBalance),
      };
    });

    return {
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        normalBalance: account.normalBalance,
      },
      initialBalance: Number(initialBalance),
      totalDebit: Number(totalDebitMutation),
      totalKredit: Number(totalKreditMutation),
      closingBalance: Number(runningBalance),
      mutations,
    };
  }
}
