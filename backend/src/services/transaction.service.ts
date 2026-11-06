import { prisma } from '../config/database.js';
import {
  TransactionType,
  PaymentMethod,
  StockMovementType,
  JournalEntryType,
  Prisma,
} from '@prisma/client';
import { calculateTotalPages, generateNomorBukti } from '../utils/helpers.js';

export interface CartItemInput {
  productId?: number;
  itemName: string;
  quantity: number | string;
  unitPrice: number | string;
  subtotal: number | string;
}

export interface CreateSaleInput {
  items: CartItemInput[];
  paymentMethod: PaymentMethod;
  discountAmount?: number | string;
  taxAmount?: number | string;
  cashPaid?: number | string;
  notes?: string;
  transactionDate?: string;
}

export interface CreateExpenseInput {
  expenseAccountId: number;
  amount: number | string;
  paymentMethod: PaymentMethod;
  notes: string;
  transactionDate?: string;
}

export class TransactionService {
  /**
   * Cari akun berdasarkan kode pada unit usaha
   */
  private static async getAccountByCode(businessId: number, code: string, tx: any) {
    const account = await tx.account.findUnique({
      where: {
        businessId_code: {
          businessId,
          code,
        },
      },
    });
    if (!account) {
      throw new Error(
        `Akun CoA dengan kode "${code}" tidak ditemukan pada unit usaha ini. Pastikan CoA telah diinisialisasi.`
      );
    }
    return account;
  }

  /**
   * Helper untuk generate Nomor Bukti unik anti-tabrakan multi-tenant & harian
   */
  private static async generateUniqueNomorBukti(
    tx: any,
    businessId: number,
    prefix: 'TRX' | 'EXP'
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

    const countToday = await tx.transaction.count({
      where: {
        businessId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    let seq = countToday + 1;
    let nomorBukti = generateNomorBukti(prefix, seq, bCode);

    while (await tx.transaction.findUnique({ where: { nomorBukti } })) {
      seq++;
      nomorBukti = generateNomorBukti(prefix, seq, bCode);
    }

    return nomorBukti;
  }

  /**
   * Helper untuk generate Nomor Jurnal unik anti-tabrakan multi-tenant & harian
   */
  private static async generateUniqueNomorJurnal(
    tx: any,
    businessId: number,
    prefix: 'JRN' | 'REV' = 'JRN'
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
   * 1. TRANSAKSI PENJUALAN (POS KASIR) DENGAN AUTO-POSTING JURNAL UMUM
   */
  static async createSale(businessId: number, userId: number, input: CreateSaleInput) {
    if (!input.items || input.items.length === 0) {
      throw new Error('Keranjang belanja kasir tidak boleh kosong.');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Hitung total amount dari item
      let calculatedTotal = new Prisma.Decimal(0);
      let totalHPP = new Prisma.Decimal(0);

      const validatedItems: {
        productId: number | null;
        itemName: string;
        quantity: Prisma.Decimal;
        unitPrice: Prisma.Decimal;
        subtotal: Prisma.Decimal;
        product?: any;
      }[] = [];

      for (const item of input.items) {
        const qty = new Prisma.Decimal(item.quantity);
        const price = new Prisma.Decimal(item.unitPrice);
        const sub = qty.times(price);

        if (qty.lessThanOrEqualTo(0)) {
          throw new Error(`Kuantitas untuk "${item.itemName}" harus lebih dari 0.`);
        }

        calculatedTotal = calculatedTotal.plus(sub);

        let productRecord = null;
        if (item.productId) {
          productRecord = await tx.product.findFirst({
            where: { id: item.productId, businessId, deletedAt: null },
          });

          if (!productRecord) {
            throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
          }

          // Menu pesanan kasir tidak memerlukan pembatasan stok
          // Hitung HPP
          const itemHPP = qty.times(productRecord.purchasePrice);
          totalHPP = totalHPP.plus(itemHPP);
        }

        validatedItems.push({
          productId: item.productId || null,
          itemName: item.itemName.trim(),
          quantity: qty,
          unitPrice: price,
          subtotal: sub,
          product: productRecord,
        });
      }

      const discount = new Prisma.Decimal(input.discountAmount ?? 0);
      const tax = new Prisma.Decimal(input.taxAmount ?? 0);
      const grandTotal = calculatedTotal.minus(discount).plus(tax);

      if (grandTotal.lessThan(0)) {
        throw new Error('Total akhir transaksi tidak boleh bernilai negatif.');
      }

      // Hitung kembalian jika pembayaran tunai
      let cashPaid: Prisma.Decimal | null = null;
      let changeAmount: Prisma.Decimal | null = null;

      if (input.paymentMethod === PaymentMethod.TUNAI) {
        if (input.cashPaid === undefined || input.cashPaid === null) {
          throw new Error('Nominal uang tunai yang dibayarkan wajib diisi.');
        }
        cashPaid = new Prisma.Decimal(input.cashPaid);
        if (cashPaid.lessThan(grandTotal)) {
          throw new Error(
            `Uang yang dibayarkan (${cashPaid}) kurang dari total tagihan (${grandTotal}).`
          );
        }
        changeAmount = cashPaid.minus(grandTotal);
      }

      // 2. Buat Nomor Bukti Unik (Format: TRX-[KODE_BISNIS-]YYYYMMDD-XXXX)
      const nomorBukti = await this.generateUniqueNomorBukti(tx, businessId, 'TRX');

      // 3. Simpan Header Transaksi
      const transaction = await tx.transaction.create({
        data: {
          businessId,
          nomorBukti,
          type: TransactionType.PEMASUKAN,
          totalAmount: calculatedTotal,
          discountAmount: discount,
          taxAmount: tax,
          grandTotal,
          paymentMethod: input.paymentMethod,
          cashPaid,
          changeAmount,
          notes: input.notes?.trim() || null,
          transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
          createdById: userId,
        },
      });

      // 4. Simpan Detail Item Transaksi & Potong Stok Produk
      for (const valItem of validatedItems) {
        await tx.transactionItem.create({
          data: {
            transactionId: transaction.id,
            productId: valItem.productId,
            itemName: valItem.itemName,
            quantity: valItem.quantity,
            unitPrice: valItem.unitPrice,
            subtotal: valItem.subtotal,
          },
        });

        // Potong stok dan catat mutasi keluar
        if (valItem.productId && valItem.product) {
          const stockBefore = valItem.product.currentStock;
          const stockAfter = stockBefore.minus(valItem.quantity);

          await tx.product.update({
            where: { id: valItem.productId },
            data: { currentStock: stockAfter },
          });

          await tx.stockMovement.create({
            data: {
              businessId,
              productId: valItem.productId,
              type: StockMovementType.KELUAR,
              quantity: valItem.quantity,
              stockBefore,
              stockAfter,
              reference: nomorBukti,
              notes: `Penjualan kasir (${nomorBukti})`,
            },
          });
        }
      }

      // 5. AUTO-POSTING JURNAL UMUM (DOUBLE-ENTRY)
      // Tentukan Akun Kas / Bank
      const paymentAccountCode =
        input.paymentMethod === PaymentMethod.TUNAI ? '1-1001' : '1-1003';
      const paymentAccount = await this.getAccountByCode(businessId, paymentAccountCode, tx);
      const salesAccount = await this.getAccountByCode(businessId, '4-1001', tx); // Pendapatan Penjualan

      const journalLines: {
        accountId: number;
        isDebit: boolean;
        amount: Prisma.Decimal;
        description: string;
      }[] = [];

      // Baris 1: Debit Kas / Bank (sebesar grandTotal yang diterima)
      journalLines.push({
        accountId: paymentAccount.id,
        isDebit: true,
        amount: grandTotal,
        description: `Penerimaan kas/bank penjualan (${nomorBukti})`,
      });

      // Baris 2: Jika ada diskon penjualan (Debit akun kontra pendapatan)
      if (discount.greaterThan(0)) {
        const discountAccount = await this.getAccountByCode(businessId, '4-1004', tx);
        journalLines.push({
          accountId: discountAccount.id,
          isDebit: true,
          amount: discount,
          description: `Diskon penjualan (${nomorBukti})`,
        });
      }

      // Baris 3: Kredit Pendapatan Penjualan (sebesar calculatedTotal kotor)
      journalLines.push({
        accountId: salesAccount.id,
        isDebit: false,
        amount: calculatedTotal,
        description: `Pendapatan penjualan barang/jasa (${nomorBukti})`,
      });

      // Baris 4: Jika ada pajak (Kredit Hutang Pajak 2-1003)
      if (tax.greaterThan(0)) {
        const taxAccount = await this.getAccountByCode(businessId, '2-1003', tx);
        journalLines.push({
          accountId: taxAccount.id,
          isDebit: false,
          amount: tax,
          description: `Pajak penjualan (${nomorBukti})`,
        });
      }

      // Baris 5 & 6: Jika ada HPP / Beban Penjualan dari barang yang terjual
      if (totalHPP.greaterThan(0)) {
        const bebanPenjualanAccount = await this.getAccountByCode(businessId, '5-1001', tx); // Beban Penjualan
        
        // Cari akun Persediaan Barang Dagangan POS (1-1008), fallback ke 1-1005 jika 1-1008 belum ada
        const merchandiseAccount =
          (await tx.account.findFirst({
            where: { businessId, code: '1-1008' },
          })) ?? (await this.getAccountByCode(businessId, '1-1005', tx));

        if (!merchandiseAccount) {
          throw new Error('Akun Persediaan Barang Dagangan (1-1008 atau 1-1005) tidak ditemukan.');
        }

        journalLines.push({
          accountId: bebanPenjualanAccount.id,
          isDebit: true,
          amount: totalHPP,
          description: `Beban penjualan barang (${nomorBukti})`,
        });

        journalLines.push({
          accountId: merchandiseAccount.id,
          isDebit: false,
          amount: totalHPP,
          description: `Pengurangan persediaan barang dagangan (${nomorBukti})`,
        });
      }

      // 6. VALIDASI DOUBLE-ENTRY BALANCE (SUM DEBIT === SUM KREDIT)
      let sumDebit = new Prisma.Decimal(0);
      let sumKredit = new Prisma.Decimal(0);

      for (const line of journalLines) {
        if (line.isDebit) {
          sumDebit = sumDebit.plus(line.amount);
        } else {
          sumKredit = sumKredit.plus(line.amount);
        }
      }

      if (!sumDebit.equals(sumKredit)) {
        throw new Error(
          `Prinsip akuntansi gagal: Jurnal tidak seimbang! Total Debit (${sumDebit}) != Total Kredit (${sumKredit}). Transaksi dibatalkan.`
        );
      }

      // 7. Simpan JournalEntry & JournalItems
      const nomorJurnal = await this.generateUniqueNomorJurnal(tx, businessId, 'JRN');

      const journal = await tx.journalEntry.create({
        data: {
          businessId,
          transactionId: transaction.id,
          nomorJurnal,
          type: JournalEntryType.PENJUALAN,
          description: `Penjualan kasir: ${nomorBukti}`,
          totalDebit: sumDebit,
          totalKredit: sumKredit,
          journalDate: transaction.transactionDate,
          createdById: userId,
          items: {
            create: journalLines.map((line) => ({
              accountId: line.accountId,
              isDebit: line.isDebit,
              amount: line.amount,
              description: line.description,
            })),
          },
        },
      });

      return {
        transactionId: transaction.id,
        nomorBukti: transaction.nomorBukti,
        grandTotal: Number(transaction.grandTotal),
        paymentMethod: transaction.paymentMethod,
        cashPaid: transaction.cashPaid ? Number(transaction.cashPaid) : null,
        changeAmount: transaction.changeAmount ? Number(transaction.changeAmount) : null,
        transactionDate: transaction.transactionDate,
        nomorJurnal: journal.nomorJurnal,
        totalDebit: Number(journal.totalDebit),
        totalKredit: Number(journal.totalKredit),
        itemCount: validatedItems.length,
      };
    });
  }

  /**
   * 2. PENGELUARAN KAS OPERASIONAL DENGAN AUTO-POSTING JURNAL UMUM
   */
  static async createExpense(businessId: number, userId: number, input: CreateExpenseInput) {
    if (!input.expenseAccountId || !input.amount || !input.notes) {
      throw new Error('Akun beban pengeluaran, nominal biaya, dan keterangan pengeluaran wajib diisi.');
    }

    const amount = new Prisma.Decimal(input.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new Error('Nominal pengeluaran harus lebih besar dari 0.');
    }

    return await prisma.$transaction(async (tx) => {
      // Verifikasi akun beban
      const expenseAccount = await tx.account.findFirst({
        where: { id: input.expenseAccountId, businessId },
      });

      if (!expenseAccount) {
        throw new Error('Akun beban pengeluaran tidak ditemukan pada unit usaha ini.');
      }

      // Verifikasi akun kas / bank sumber pembayaran
      const paymentAccountCode =
        input.paymentMethod === PaymentMethod.TUNAI ? '1-1001' : '1-1003';
      const paymentAccount = await this.getAccountByCode(businessId, paymentAccountCode, tx);

      // Buat Nomor Bukti Unik
      const nomorBukti = await this.generateUniqueNomorBukti(tx, businessId, 'EXP');

      // Simpan Transaksi Pengeluaran
      const transaction = await tx.transaction.create({
        data: {
          businessId,
          nomorBukti,
          type: TransactionType.PENGELUARAN,
          totalAmount: amount,
          discountAmount: new Prisma.Decimal(0),
          taxAmount: new Prisma.Decimal(0),
          grandTotal: amount,
          paymentMethod: input.paymentMethod,
          notes: input.notes.trim(),
          transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
          createdById: userId,
          items: {
            create: {
              itemName: `${expenseAccount.name} (${input.notes.trim()})`,
              quantity: new Prisma.Decimal(1),
              unitPrice: amount,
              subtotal: amount,
            },
          },
        },
      });

      // AUTO-POSTING JURNAL UMUM:
      // Debit: Akun Beban Terkait
      // Kredit: Akun Kas / Bank
      const nomorJurnal = await this.generateUniqueNomorJurnal(tx, businessId, 'JRN');

      const journal = await tx.journalEntry.create({
        data: {
          businessId,
          transactionId: transaction.id,
          nomorJurnal,
          type: JournalEntryType.PENGELUARAN,
          description: `Pengeluaran kas: ${expenseAccount.name} - ${input.notes.trim()}`,
          totalDebit: amount,
          totalKredit: amount,
          journalDate: transaction.transactionDate,
          createdById: userId,
          items: {
            create: [
              {
                accountId: expenseAccount.id,
                isDebit: true,
                amount,
                description: `Beban ${expenseAccount.name}: ${input.notes.trim()}`,
              },
              {
                accountId: paymentAccount.id,
                isDebit: false,
                amount,
                description: `Pengeluaran via ${paymentAccount.name} (${nomorBukti})`,
              },
            ],
          },
        },
      });

      return {
        transactionId: transaction.id,
        nomorBukti: transaction.nomorBukti,
        expenseAccountName: expenseAccount.name,
        amount: Number(transaction.grandTotal),
        paymentMethod: transaction.paymentMethod,
        notes: transaction.notes,
        nomorJurnal: journal.nomorJurnal,
      };
    });
  }

  /**
   * 3. VOID TRANSAKSI & JURNAL PEMBALIK (REVERSAL ENTRY)
   * Tidak menghapus data keuangan secara fisik (Audit Trail Compliant)
   */
  static async voidTransaction(
    id: number,
    businessId: number,
    userId: number,
    reason: string
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new Error('Alasan pembatalan (void) wajib diisi minimal 5 karakter.');
    }

    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id, businessId },
        include: {
          items: true,
          journalEntry: {
            include: {
              items: true,
            },
          },
        },
      });

      if (!transaction) {
        throw new Error('Transaksi tidak ditemukan.');
      }

      if (transaction.voidedAt !== null) {
        throw new Error('Transaksi ini sudah pernah dibatalkan (sudah divoid sebelumnya).');
      }

      // 1. Tandai transaksi sebagai VOID
      const updatedTrx = await tx.transaction.update({
        where: { id },
        data: {
          voidedAt: new Date(),
          voidReason: reason.trim(),
        },
      });

      // 2. Kembalikan stok barang jika ini adalah transaksi penjualan
      if (transaction.type === TransactionType.PEMASUKAN) {
        for (const item of transaction.items) {
          if (item.productId) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
            });

            if (product) {
              const stockBefore = product.currentStock;
              const stockAfter = stockBefore.plus(item.quantity);

              await tx.product.update({
                where: { id: item.productId },
                data: { currentStock: stockAfter },
              });

              await tx.stockMovement.create({
                data: {
                  businessId,
                  productId: item.productId,
                  type: StockMovementType.RETUR,
                  quantity: item.quantity,
                  stockBefore,
                  stockAfter,
                  reference: `VOID-${transaction.nomorBukti}`,
                  notes: `Pengembalian stok akibat transaksi divoid: ${reason.trim()}`,
                },
              });
            }
          }
        }
      }

      // 3. Buat Jurnal Pembalik (Reversal Entry) jika ada jurnal terkait
      if (transaction.journalEntry) {
        const originalJournal = transaction.journalEntry;

        // Tandai jurnal lama sebagai isReversed
        await tx.journalEntry.update({
          where: { id: originalJournal.id },
          data: { isReversed: true },
        });

        // Balikkan seluruh baris jurnal (Debit jadi Kredit, Kredit jadi Debit)
        const reversalLines = originalJournal.items.map((item) => ({
          accountId: item.accountId,
          isDebit: !item.isDebit, // Membalikkan posisi debit/kredit
          amount: item.amount,
          description: `[PEMBALIK] ${item.description || ''}`,
        }));

        const nomorReversal = await this.generateUniqueNomorJurnal(tx, businessId, 'REV');

        await tx.journalEntry.create({
          data: {
            businessId,
            nomorJurnal: nomorReversal,
            type: JournalEntryType.PENYESUAIAN,
            description: `Jurnal Pembalik atas transaksi ${transaction.nomorBukti} (Alasan: ${reason.trim()})`,
            totalDebit: originalJournal.totalDebit,
            totalKredit: originalJournal.totalKredit,
            journalDate: new Date(),
            reversedFromId: originalJournal.id,
            createdById: userId,
            items: {
              create: reversalLines,
            },
          },
        });
      }

      return {
        id: updatedTrx.id,
        nomorBukti: updatedTrx.nomorBukti,
        voidedAt: updatedTrx.voidedAt,
        voidReason: updatedTrx.voidReason,
        message: 'Transaksi berhasil dibatalkan dan jurnal pembalik telah dicatat.',
      };
    });
  }

  /**
   * 4. AMBIL DAFTAR TRANSAKSI
   */
  static async getAll(params: {
    businessId: number;
    type?: TransactionType;
    startDate?: string;
    endDate?: string;
    search?: string;
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
        { nomorBukti: { contains: params.search } },
        { notes: { contains: params.search } },
      ];
    }

    if (params.startDate || params.endDate) {
      where.transactionDate = {};
      if (params.startDate) {
        where.transactionDate.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        where.transactionDate.lte = end;
      }
    }

    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { transactionDate: 'desc' },
        include: {
          createdBy: { select: { id: true, fullName: true, username: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        nomorBukti: t.nomorBukti,
        type: t.type,
        totalAmount: Number(t.totalAmount),
        discountAmount: Number(t.discountAmount),
        taxAmount: Number(t.taxAmount),
        grandTotal: Number(t.grandTotal),
        paymentMethod: t.paymentMethod,
        cashPaid: t.cashPaid ? Number(t.cashPaid) : null,
        changeAmount: t.changeAmount ? Number(t.changeAmount) : null,
        notes: t.notes,
        transactionDate: t.transactionDate,
        isVoided: t.voidedAt !== null,
        voidedAt: t.voidedAt,
        voidReason: t.voidReason,
        cashier: t.createdBy.fullName,
        itemCount: t._count.items,
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
   * 5. DETAIL TRANSAKSI LENGKAP DENGAN ITEM & JURNAL
   */
  static async getById(id: number, businessId: number) {
    const transaction = await prisma.transaction.findFirst({
      where: { id, businessId },
      include: {
        createdBy: { select: { id: true, fullName: true, username: true } },
        items: true,
        journalEntry: {
          include: {
            items: {
              include: {
                account: {
                  select: { id: true, code: true, name: true, type: true },
                },
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new Error('Transaksi tidak ditemukan.');
    }

    return {
      id: transaction.id,
      nomorBukti: transaction.nomorBukti,
      type: transaction.type,
      totalAmount: Number(transaction.totalAmount),
      discountAmount: Number(transaction.discountAmount),
      taxAmount: Number(transaction.taxAmount),
      grandTotal: Number(transaction.grandTotal),
      paymentMethod: transaction.paymentMethod,
      cashPaid: transaction.cashPaid ? Number(transaction.cashPaid) : null,
      changeAmount: transaction.changeAmount ? Number(transaction.changeAmount) : null,
      notes: transaction.notes,
      transactionDate: transaction.transactionDate,
      isVoided: transaction.voidedAt !== null,
      voidedAt: transaction.voidedAt,
      voidReason: transaction.voidReason,
      cashier: transaction.createdBy.fullName,
      items: transaction.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        itemName: i.itemName,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
      journal: transaction.journalEntry
        ? {
            id: transaction.journalEntry.id,
            nomorJurnal: transaction.journalEntry.nomorJurnal,
            type: transaction.journalEntry.type,
            description: transaction.journalEntry.description,
            totalDebit: Number(transaction.journalEntry.totalDebit),
            totalKredit: Number(transaction.journalEntry.totalKredit),
            isReversed: transaction.journalEntry.isReversed,
            lines: transaction.journalEntry.items.map((l) => ({
              id: l.id,
              accountCode: l.account.code,
              accountName: l.account.name,
              isDebit: l.isDebit,
              amount: Number(l.amount),
              description: l.description,
            })),
          }
        : null,
    };
  }
}
