import { Prisma, JournalEntryType } from '@prisma/client';
import { prisma } from '../config/database.js';
import { calculateTotalPages, generateNomorBukti, resolveLocalDateTime } from '../utils/helpers.js';

export interface CreateInventoryItemInput {
  businessId: number;
  userId?: number;
  code: string;
  name: string;
  category: 'BAHAN_BAKU' | 'PERLENGKAPAN' | 'PERALATAN_ASET' | 'BARANG_DAGANGAN' | 'LAINNYA';
  unit: string;
  quantity?: number;
  minimumStock?: number;
  unitPrice?: number;
  storageLocation?: string;
  condition?: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT';
  itemDate?: string;
  notes?: string;
  accountId?: number;
  offsetAccountId?: number;
}

export interface UpdateInventoryItemInput {
  code?: string;
  name?: string;
  category?: 'BAHAN_BAKU' | 'PERLENGKAPAN' | 'PERALATAN_ASET' | 'BARANG_DAGANGAN' | 'LAINNYA';
  unit?: string;
  minimumStock?: number;
  unitPrice?: number;
  storageLocation?: string;
  condition?: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT';
  itemDate?: string;
  notes?: string;
  accountId?: number | null;
}

export interface RecordInventoryMovementInput {
  businessId: number;
  userId?: number;
  itemId: number;
  type: 'MASUK' | 'KELUAR' | 'OPNAME';
  quantity: number;
  unitPrice?: number;
  offsetAccountId?: number;
  reference?: string;
  notes?: string;
  movementDate?: string;
}

export class InventoryService {
  /**
   * Helper untuk generate Nomor Jurnal unik anti-tabrakan multi-tenant & harian
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
   * Helper untuk mengonversi input tanggal menjadi objek Date dengan waktu lokal yang presisi.
   * Jika input hanya YYYY-MM-DD, otomatis gabungkan dengan jam:menit:detik saat ini pada perangkat/server.
   */
  private static resolveLocalDateTime(inputDate?: string | Date): Date {
    return resolveLocalDateTime(inputDate);
  }

  /**
   * Resolve Akun Aset / Persediaan (CoA) untuk inventaris
   */
  private static async resolveAssetAccount(
    tx: any,
    businessId: number,
    accountId?: number,
    category?: string
  ) {
    if (accountId) {
      const acc = await tx.account.findFirst({
        where: { id: accountId, businessId },
      });
      if (acc) return acc;
    }

    // Default berdasarkan kategori standar
    let targetCode = '1-1005'; // Persediaan Barang
    if (category === 'PERLENGKAPAN') {
      targetCode = '1-1006'; // Perlengkapan / Supplies
    } else if (category === 'PERALATAN_ASET') {
      targetCode = '1-2004'; // Peralatan
    }

    const defaultAcc = await tx.account.findFirst({
      where: { businessId, code: targetCode },
    });
    if (defaultAcc) return defaultAcc;

    // Fallback akun Aset pertama
    return await tx.account.findFirst({
      where: { businessId, type: 'ASET' },
    });
  }

  /**
   * Resolve Akun Pengimbang (Offset Account) untuk mutasi stok
   */
  private static async resolveOffsetAccount(
    tx: any,
    businessId: number,
    type: 'MASUK' | 'KELUAR' | 'OPNAME',
    category: string,
    offsetAccountId?: number
  ) {
    if (offsetAccountId) {
      const acc = await tx.account.findFirst({
        where: { id: offsetAccountId, businessId },
      });
      if (acc) return acc;
    }

    if (type === 'MASUK') {
      // Pembelian/Restock: Default Kas (1-1001) atau Bank (1-1003)
      const kas = await tx.account.findFirst({
        where: { businessId, code: '1-1001' },
      });
      if (kas) return kas;
      return await tx.account.findFirst({
        where: { businessId, type: 'ASET' },
      });
    } else if (type === 'KELUAR') {
      // Pemakaian Operasional: Default Beban sesuai kategori
      let targetCode = '5-1002'; // Pembelian Bahan Baku
      if (category === 'PERLENGKAPAN') {
        targetCode = '5-2006'; // Beban Perlengkapan
      } else if (category === 'PERALATAN_ASET') {
        targetCode = '5-2007'; // Beban Pemeliharaan
      } else if (category === 'BARANG_DAGANGAN') {
        targetCode = '5-1001'; // HPP
      }

      const expense = await tx.account.findFirst({
        where: { businessId, code: targetCode },
      });
      if (expense) return expense;

      return await tx.account.findFirst({
        where: { businessId, type: 'BEBAN' },
      });
    } else {
      // Opname: Default Beban Administrasi & Lain-lain (5-4003)
      const diffExpense = await tx.account.findFirst({
        where: { businessId, code: '5-4003' },
      });
      if (diffExpense) return diffExpense;
      return await tx.account.findFirst({
        where: { businessId, type: 'BEBAN' },
      });
    }
  }

  /**
   * Ambil daftar seluruh barang inventaris per unit usaha
   */
  static async getAll(params: {
    businessId: number;
    search?: string;
    category?: string;
    lowStock?: boolean;
    page: number;
    limit: number;
    skip: number;
  }) {
    const where: any = {
      businessId: params.businessId,
      deletedAt: null,
    };

    if (params.search) {
      where.OR = [
        { code: { contains: params.search } },
        { name: { contains: params.search } },
        { storageLocation: { contains: params.search } },
      ];
    }

    if (params.category) {
      where.category = params.category;
    }

    if (params.lowStock) {
      where.quantity = {
        lte: prisma.inventoryItem.fields.minimumStock,
      };
    }

    const [total, items, allItemsForStats] = await Promise.all([
      prisma.inventoryItem.count({ where }),
      prisma.inventoryItem.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        include: {
          account: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
            },
          },
          movements: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.inventoryItem.findMany({
        where: { businessId: params.businessId, deletedAt: null },
        select: {
          quantity: true,
          unitPrice: true,
          minimumStock: true,
          category: true,
        },
      }),
    ]);

    // Hitung total nilai stok fisik
    let totalStockValue = new Prisma.Decimal(0);
    let lowStockCount = 0;
    const categoriesSet = new Set<string>();

    for (const it of allItemsForStats) {
      const itemVal = it.quantity.times(it.unitPrice);
      totalStockValue = totalStockValue.plus(itemVal);
      if (it.quantity.lessThanOrEqualTo(it.minimumStock)) {
        lowStockCount++;
      }
      categoriesSet.add(it.category);
    }

    const formattedItems = items.map((i) => {
      const qty = Number(i.quantity);
      const price = Number(i.unitPrice);
      return {
        id: i.id,
        businessId: i.businessId,
        code: i.code,
        name: i.name,
        category: i.category,
        unit: i.unit,
        quantity: qty,
        minimumStock: Number(i.minimumStock),
        unitPrice: price,
        totalValue: Number(i.quantity.times(i.unitPrice)),
        storageLocation: i.storageLocation || '-',
        condition: i.condition,
        itemDate: i.itemDate,
        notes: i.notes || '',
        isLowStock: i.quantity.lessThanOrEqualTo(i.minimumStock),
        account: i.account
          ? {
              id: i.account.id,
              code: i.account.code,
              name: i.account.name,
              type: i.account.type,
            }
          : null,
        lastMovement: i.movements[0]
          ? {
              type: i.movements[0].type,
              quantity: Number(i.movements[0].quantity),
              date: i.movements[0].movementDate,
            }
          : null,
      };
    });

    return {
      items: formattedItems,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: calculateTotalPages(total, params.limit),
      },
      stats: {
        totalItems: allItemsForStats.length,
        totalStockValue: Number(totalStockValue),
        lowStockCount,
        totalCategories: categoriesSet.size,
        categoryCount: categoriesSet.size,
      },
    };
  }

  /**
   * Ambil detail satu barang inventaris beserta riwayat pergerakan stok
   */
  static async getById(id: number, businessId: number) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id, businessId, deletedAt: null },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        movements: {
          take: 50,
          orderBy: { movementDate: 'desc' },
          include: {
            journalEntry: {
              select: {
                id: true,
                nomorJurnal: true,
                totalDebit: true,
                totalKredit: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw new Error('Barang inventaris tidak ditemukan.');
    }

    return {
      id: item.id,
      businessId: item.businessId,
      code: item.code,
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: Number(item.quantity),
      minimumStock: Number(item.minimumStock),
      unitPrice: Number(item.unitPrice),
      totalValue: Number(item.quantity.times(item.unitPrice)),
      storageLocation: item.storageLocation,
      condition: item.condition,
      itemDate: item.itemDate,
      notes: item.notes,
      account: item.account
        ? {
            id: item.account.id,
            code: item.account.code,
            name: item.account.name,
            type: item.account.type,
          }
        : null,
      movements: item.movements.map((m) => ({
        id: m.id,
        type: m.type,
        quantity: Number(m.quantity),
        stockBefore: Number(m.stockBefore),
        stockAfter: Number(m.stockAfter),
        unitPrice: m.unitPrice ? Number(m.unitPrice) : null,
        reference: m.reference,
        notes: m.notes,
        movementDate: m.movementDate,
        createdAt: m.createdAt,
        journalEntry: m.journalEntry
          ? {
              id: m.journalEntry.id,
              nomorJurnal: m.journalEntry.nomorJurnal,
              totalDebit: Number(m.journalEntry.totalDebit),
              totalKredit: Number(m.journalEntry.totalKredit),
            }
          : null,
      })),
    };
  }

  /**
   * Tambah barang inventaris baru terintegrasi Akuntansi CoA & Auto-Posting Saldo Awal
   */
  static async create(data: CreateInventoryItemInput) {
    if (!data.code || !data.name || !data.unit) {
      throw new Error('Kode barang, nama barang, dan satuan wajib diisi.');
    }

    const cleanCode = data.code.trim().toUpperCase();

    // Cek duplikasi kode
    const existing = await prisma.inventoryItem.findFirst({
      where: {
        businessId: data.businessId,
        code: cleanCode,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new Error(`Barang dengan kode "${cleanCode}" sudah terdaftar pada unit usaha ini.`);
    }

    const initialQty =
      data.quantity !== undefined ? new Prisma.Decimal(data.quantity) : new Prisma.Decimal(0);
    const unitPrice =
      data.unitPrice !== undefined ? new Prisma.Decimal(data.unitPrice) : new Prisma.Decimal(0);
    const minStock =
      data.minimumStock !== undefined ? new Prisma.Decimal(data.minimumStock) : new Prisma.Decimal(0);

    return await prisma.$transaction(async (tx) => {
      // 1. Resolve akun aset / CoA
      const assetAcc = await this.resolveAssetAccount(
        tx,
        data.businessId,
        data.accountId,
        data.category
      );

      const finalItemDate = this.resolveLocalDateTime(data.itemDate);

      const newItem = await tx.inventoryItem.create({
        data: {
          businessId: data.businessId,
          accountId: assetAcc?.id || null,
          code: cleanCode,
          name: data.name.trim(),
          category: data.category || 'BAHAN_BAKU',
          unit: data.unit.trim().toUpperCase(),
          quantity: initialQty,
          minimumStock: minStock,
          unitPrice,
          storageLocation: data.storageLocation?.trim() || null,
          condition: data.condition || 'BAIK',
          itemDate: finalItemDate,
          notes: data.notes?.trim() || null,
        },
        include: {
          account: true,
        },
      });

      // 2. Catat mutasi saldo awal dan auto-posting jurnal jika jumlah > 0 & harga > 0
      if (initialQty.greaterThan(0)) {
        const totalValue = initialQty.times(unitPrice);
        let journalEntryId: number | null = null;

        if (totalValue.greaterThan(0) && assetAcc) {
          // Cari akun pengimbang (default: Modal Awal 3-1001 atau Kas 1-1001)
          let offsetAcc: any = null;
          if (data.offsetAccountId) {
            offsetAcc = await tx.account.findFirst({
              where: { id: data.offsetAccountId, businessId: data.businessId },
            });
          }
          if (!offsetAcc) {
            offsetAcc = await tx.account.findFirst({
              where: { businessId: data.businessId, code: '3-1001' }, // Modal Awal
            });
          }
          if (!offsetAcc) {
            offsetAcc = await tx.account.findFirst({
              where: { businessId: data.businessId, code: '1-1001' }, // Kas
            });
          }

          if (offsetAcc) {
            const nomorJurnal = await this.generateUniqueNomorJurnal(tx, data.businessId, 'JRN');
            const journal = await tx.journalEntry.create({
              data: {
                businessId: data.businessId,
                nomorJurnal,
                type: JournalEntryType.PEMBUKAAN,
                description: `Saldo Awal Inventaris: ${newItem.name} (${initialQty} ${newItem.unit})`,
                totalDebit: totalValue,
                totalKredit: totalValue,
                journalDate: newItem.itemDate,
                createdById: data.userId || 1,
                items: {
                  create: [
                    {
                      accountId: assetAcc.id,
                      isDebit: true,
                      amount: totalValue,
                      description: `Saldo awal persediaan ${newItem.name}`,
                    },
                    {
                      accountId: offsetAcc.id,
                      isDebit: false,
                      amount: totalValue,
                      description: `Pengimbang saldo awal inventaris via ${offsetAcc.name}`,
                    },
                  ],
                },
              },
            });
            journalEntryId = journal.id;
          }
        }

        await tx.inventoryMovement.create({
          data: {
            businessId: data.businessId,
            itemId: newItem.id,
            journalEntryId,
            type: 'MASUK',
            quantity: initialQty,
            stockBefore: new Prisma.Decimal(0),
            stockAfter: initialQty,
            unitPrice,
            reference: 'SALDO-AWAL',
            notes: 'Pencatatan saldo awal barang inventaris',
            movementDate: newItem.itemDate,
          },
        });
      }

      return newItem;
    });
  }

  /**
   * Ubah data barang inventaris
   */
  static async update(id: number, businessId: number, data: UpdateInventoryItemInput) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id, businessId, deletedAt: null },
    });

    if (!item) {
      throw new Error('Barang inventaris tidak ditemukan.');
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name.trim();
    if (data.code) {
      const cleanCode = data.code.trim().toUpperCase();
      const existing = await prisma.inventoryItem.findFirst({
        where: {
          businessId,
          code: cleanCode,
          NOT: { id },
          deletedAt: null,
        },
      });
      if (existing) {
        throw new Error(`Kode barang "${cleanCode}" sudah digunakan.`);
      }
      updateData.code = cleanCode;
    }
    if (data.category) updateData.category = data.category;
    if (data.unit) updateData.unit = data.unit.trim().toUpperCase();
    if (data.minimumStock !== undefined)
      updateData.minimumStock = new Prisma.Decimal(data.minimumStock);
    if (data.unitPrice !== undefined) updateData.unitPrice = new Prisma.Decimal(data.unitPrice);
    if (data.storageLocation !== undefined)
      updateData.storageLocation = data.storageLocation?.trim() || null;
    if (data.condition) updateData.condition = data.condition;
    if (data.itemDate) updateData.itemDate = this.resolveLocalDateTime(data.itemDate);
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;
    if (data.accountId !== undefined) updateData.accountId = data.accountId || null;

    return await prisma.inventoryItem.update({
      where: { id },
      data: updateData,
      include: {
        account: true,
      },
    });
  }

  /**
   * Catat mutasi stok fisik (Stok Masuk, Stok Keluar, Stock Opname)
   * Otomatis memotong/menambah stok fisik dan auto-posting jurnal akuntansi (double-entry)
   */
  static async recordMovement(data: RecordInventoryMovementInput) {
    if (!data.quantity || data.quantity <= 0) {
      throw new Error('Jumlah mutasi stok harus lebih dari 0.');
    }

    return await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findFirst({
        where: { id: data.itemId, businessId: data.businessId, deletedAt: null },
      });

      if (!item) {
        throw new Error('Barang inventaris tidak ditemukan.');
      }

      const movementQty = new Prisma.Decimal(data.quantity);
      const stockBefore = item.quantity;
      let stockAfter = stockBefore;

      if (data.type === 'MASUK') {
        stockAfter = stockBefore.plus(movementQty);
      } else if (data.type === 'KELUAR') {
        if (stockBefore.lessThan(movementQty)) {
          throw new Error(
            `Stok fisik tidak mencukupi untuk dikeluarkan. Sisa stok saat ini: ${stockBefore} ${item.unit}.`
          );
        }
        stockAfter = stockBefore.minus(movementQty);
      } else if (data.type === 'OPNAME') {
        // Stock opname menetapkan jumlah fisik baru
        stockAfter = movementQty;
      }

      const unitPrice =
        data.unitPrice !== undefined ? new Prisma.Decimal(data.unitPrice) : item.unitPrice;

      // 1. Update jumlah stok fisik barang secara otomatis
      const updatedItem = await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          quantity: stockAfter,
          ...(data.unitPrice !== undefined && { unitPrice }),
        },
      });

      // 2. AUTO-POSTING JURNAL UMUM DOUBLE-ENTRY KE LAPORAN KEUANGAN
      let journalEntryId: number | null = null;
      const assetAcc = await this.resolveAssetAccount(
        tx,
        data.businessId,
        item.accountId || undefined,
        item.category
      );

      const mDate = this.resolveLocalDateTime(data.movementDate);

      if (assetAcc) {
        if (data.type === 'KELUAR') {
          // Mutasi Keluar: Pengurangan stok & pencatatan beban operasional
          const totalAmount = movementQty.times(unitPrice);
          if (totalAmount.greaterThan(0)) {
            const expenseAcc = await this.resolveOffsetAccount(
              tx,
              data.businessId,
              'KELUAR',
              item.category,
              data.offsetAccountId
            );

            if (expenseAcc) {
              const nomorJurnal = await this.generateUniqueNomorJurnal(tx, data.businessId, 'JRN');
              const journal = await tx.journalEntry.create({
                data: {
                  businessId: data.businessId,
                  nomorJurnal,
                  type: JournalEntryType.PENYESUAIAN,
                  description: `Pemakaian/Stok Keluar: ${item.name} (${movementQty} ${item.unit})`,
                  totalDebit: totalAmount,
                  totalKredit: totalAmount,
                  journalDate: mDate,
                  createdById: data.userId || 1,
                  items: {
                    create: [
                      {
                        accountId: expenseAcc.id,
                        isDebit: true,
                        amount: totalAmount,
                        description: `Beban pemakaian ${item.name}${data.notes ? ` - ${data.notes}` : ''}`,
                      },
                      {
                        accountId: assetAcc.id,
                        isDebit: false,
                        amount: totalAmount,
                        description: `Pengurangan persediaan fisik ${item.name}`,
                      },
                    ],
                  },
                },
              });
              journalEntryId = journal.id;
            }
          }
        } else if (data.type === 'MASUK') {
          // Mutasi Masuk: Penambahan stok & pengurangan kas / penambahan hutang
          const totalAmount = movementQty.times(unitPrice);
          if (totalAmount.greaterThan(0)) {
            const payAcc = await this.resolveOffsetAccount(
              tx,
              data.businessId,
              'MASUK',
              item.category,
              data.offsetAccountId
            );

            if (payAcc) {
              const nomorJurnal = await this.generateUniqueNomorJurnal(tx, data.businessId, 'JRN');
              const journal = await tx.journalEntry.create({
                data: {
                  businessId: data.businessId,
                  nomorJurnal,
                  type: JournalEntryType.PENYESUAIAN,
                  description: `Stok Masuk / Pengadaan: ${item.name} (${movementQty} ${item.unit})`,
                  totalDebit: totalAmount,
                  totalKredit: totalAmount,
                  journalDate: mDate,
                  createdById: data.userId || 1,
                  items: {
                    create: [
                      {
                        accountId: assetAcc.id,
                        isDebit: true,
                        amount: totalAmount,
                        description: `Penambahan aset persediaan ${item.name}`,
                      },
                      {
                        accountId: payAcc.id,
                        isDebit: false,
                        amount: totalAmount,
                        description: `Pembayaran via ${payAcc.name}${data.notes ? ` - ${data.notes}` : ''}`,
                      },
                    ],
                  },
                },
              });
              journalEntryId = journal.id;
            }
          }
        } else if (data.type === 'OPNAME') {
          const delta = stockAfter.minus(stockBefore);
          if (!delta.isZero()) {
            const diffAmount = delta.abs().times(unitPrice);
            if (diffAmount.greaterThan(0)) {
              const nomorJurnal = await this.generateUniqueNomorJurnal(tx, data.businessId, 'JRN');
              if (delta.isNegative()) {
                // Fisik kurang: Beban Selisih (Debit), Aset Persediaan (Kredit)
                const expenseAcc = await this.resolveOffsetAccount(
                  tx,
                  data.businessId,
                  'OPNAME',
                  item.category,
                  data.offsetAccountId
                );
                if (expenseAcc) {
                  const journal = await tx.journalEntry.create({
                    data: {
                      businessId: data.businessId,
                      nomorJurnal,
                      type: JournalEntryType.PENYESUAIAN,
                      description: `Stock Opname (Selisih Kurang): ${item.name} (-${delta.abs()} ${item.unit})`,
                      totalDebit: diffAmount,
                      totalKredit: diffAmount,
                      journalDate: mDate,
                      createdById: data.userId || 1,
                      items: {
                        create: [
                          {
                            accountId: expenseAcc.id,
                            isDebit: true,
                            amount: diffAmount,
                            description: `Beban selisih opname ${item.name}`,
                          },
                          {
                            accountId: assetAcc.id,
                            isDebit: false,
                            amount: diffAmount,
                            description: `Koreksi penurunan stok fisik ${item.name}`,
                          },
                        ],
                      },
                    },
                  });
                  journalEntryId = journal.id;
                }
              } else {
                // Fisik lebih: Aset Persediaan (Debit), Pendapatan Lain-lain (Kredit)
                const incomeAcc =
                  (await tx.account.findFirst({
                    where: { businessId: data.businessId, code: '4-1003' }, // Pendapatan Lain-lain
                  })) ||
                  (await tx.account.findFirst({
                    where: { businessId: data.businessId, type: 'PENDAPATAN' },
                  }));

                if (incomeAcc) {
                  const journal = await tx.journalEntry.create({
                    data: {
                      businessId: data.businessId,
                      nomorJurnal,
                      type: JournalEntryType.PENYESUAIAN,
                      description: `Stock Opname (Selisih Lebih): ${item.name} (+${delta} ${item.unit})`,
                      totalDebit: diffAmount,
                      totalKredit: diffAmount,
                      journalDate: mDate,
                      createdById: data.userId || 1,
                      items: {
                        create: [
                          {
                            accountId: assetAcc.id,
                            isDebit: true,
                            amount: diffAmount,
                            description: `Koreksi kenaikan stok fisik ${item.name}`,
                          },
                          {
                            accountId: incomeAcc.id,
                            isDebit: false,
                            amount: diffAmount,
                            description: `Pendapatan selisih opname ${item.name}`,
                          },
                        ],
                      },
                    },
                  });
                  journalEntryId = journal.id;
                }
              }
            }
          }
        }
      }

      // 3. Catat kartu stok / pergerakan
      const movement = await tx.inventoryMovement.create({
        data: {
          businessId: data.businessId,
          itemId: item.id,
          journalEntryId,
          type: data.type,
          quantity: movementQty,
          stockBefore,
          stockAfter,
          unitPrice,
          reference: data.reference?.trim() || null,
          notes: data.notes?.trim() || null,
          movementDate: mDate,
        },
      });

      return {
        item: updatedItem,
        movement,
      };
    });
  }

  /**
   * Ambil riwayat kartu stok per barang
   */
  static async getMovements(itemId: number, businessId: number) {
    const movements = await prisma.inventoryMovement.findMany({
      where: { itemId, businessId },
      include: {
        journalEntry: {
          select: {
            id: true,
            nomorJurnal: true,
            totalDebit: true,
            totalKredit: true,
          },
        },
      },
      orderBy: { movementDate: 'desc' },
    });

    return {
      movements: movements.map((m) => ({
        id: m.id,
        businessId: m.businessId,
        itemId: m.itemId,
        type: m.type,
        quantity: Number(m.quantity),
        stockBefore: Number(m.stockBefore),
        stockAfter: Number(m.stockAfter),
        unitPrice: m.unitPrice ? Number(m.unitPrice) : null,
        reference: m.reference,
        notes: m.notes,
        movementDate: m.movementDate,
        createdAt: m.createdAt,
        journalEntry: m.journalEntry
          ? {
              id: m.journalEntry.id,
              nomorJurnal: m.journalEntry.nomorJurnal,
              totalDebit: Number(m.journalEntry.totalDebit),
              totalKredit: Number(m.journalEntry.totalKredit),
            }
          : null,
      })),
    };
  }

  /**
   * Hapus barang inventaris (Soft delete) dan otomatis menghapus seluruh pencatatan jurnal umum terkait
   */
  static async softDelete(id: number, businessId: number) {
    return await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findFirst({
        where: { id, businessId, deletedAt: null },
      });

      if (!item) {
        throw new Error('Barang inventaris tidak ditemukan.');
      }

      // 1. Ambil seluruh mutasi stok barang ini
      const movements = await tx.inventoryMovement.findMany({
        where: { itemId: id, businessId },
        select: { id: true, journalEntryId: true },
      });

      const movementJournalIds = movements
        .map((m) => m.journalEntryId)
        .filter((jid): jid is number => jid !== null && jid !== undefined);

      // 2. Temukan seluruh jurnal umum yang terkait dengan inventaris ini
      const linkedJournals = await tx.journalEntry.findMany({
        where: {
          businessId,
          OR: [
            { id: { in: movementJournalIds } },
            { inventoryMovement: { itemId: id } },
            {
              AND: [
                { type: JournalEntryType.PEMBUKAAN },
                { description: { startsWith: `Saldo Awal Inventaris: ${item.name} (` } },
              ],
            },
            {
              AND: [
                { type: JournalEntryType.PENYESUAIAN },
                {
                  OR: [
                    { description: { startsWith: `Pemakaian/Stok Keluar: ${item.name} (` } },
                    { description: { startsWith: `Stok Masuk / Pengadaan: ${item.name} (` } },
                    { description: { startsWith: `Stock Opname (Selisih Kurang): ${item.name} (` } },
                    { description: { startsWith: `Stock Opname (Selisih Lebih): ${item.name} (` } },
                  ],
                },
              ],
            },
          ],
        },
        select: { id: true, nomorJurnal: true },
      });

      const allJournalIds = Array.from(
        new Set([...movementJournalIds, ...linkedJournals.map((j) => j.id)])
      );

      // 3. Putuskan referensi reversal jika ada jurnal pembalik
      if (allJournalIds.length > 0) {
        await tx.journalEntry.updateMany({
          where: { reversedFromId: { in: allJournalIds } },
          data: { reversedFromId: null },
        });

        // 4. Putuskan hubungan inventoryMovement dengan journalEntry agar tidak melanggar foreign key
        await tx.inventoryMovement.updateMany({
          where: {
            OR: [
              { itemId: id },
              { journalEntryId: { in: allJournalIds } },
            ],
          },
          data: { journalEntryId: null },
        });

        // 5. Hapus detail baris debit & kredit (journal_items)
        await tx.journalItem.deleteMany({
          where: { journalEntryId: { in: allJournalIds } },
        });

        // 6. Hapus header jurnal umum (journal_entries)
        await tx.journalEntry.deleteMany({
          where: { id: { in: allJournalIds } },
        });
      }

      // 7. Hapus riwayat kartu stok (inventory_movements) barang ini
      await tx.inventoryMovement.deleteMany({
        where: { itemId: id },
      });

      // 8. Soft-delete barang inventaris
      await tx.inventoryItem.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      return {
        id,
        deletedJournalCount: allJournalIds.length,
        message:
          allJournalIds.length > 0
            ? `Barang inventaris "${item.name}" beserta ${allJournalIds.length} pencatatan jurnal terkait berhasil dihapus.`
            : `Barang inventaris "${item.name}" berhasil dihapus.`,
      };
    });
  }
}
