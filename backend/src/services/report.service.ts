import { prisma } from '../config/database.js';
import { AccountType, NormalBalance, Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';

export class ReportService {
  /**
   * Menghitung saldo akun dari journal_items yang valid (bukan void/dibalikkan)
   */
  private static calculateAccountBalance(
    normalBalance: NormalBalance,
    debitSum: Prisma.Decimal,
    kreditSum: Prisma.Decimal
  ): Prisma.Decimal {
    if (normalBalance === NormalBalance.DEBIT) {
      return debitSum.minus(kreditSum);
    } else {
      return kreditSum.minus(debitSum);
    }
  }

  /**
   * Menggabungkan item akun yang memiliki kode sama (untuk konsolidasi multi-cabang/unit)
   */
  private static aggregateItemsByCode(items: { code: string; name: string; amount: number }[]) {
    const map = new Map<string, { code: string; name: string; amount: number }>();
    for (const it of items) {
      const existing = map.get(it.code);
      if (existing) {
        existing.amount = Number((existing.amount + it.amount).toFixed(2));
      } else {
        map.set(it.code, { ...it });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }

  /**
   * 1. LAPORAN LABA RUGI (INCOME STATEMENT / PROFIT & LOSS)
   * Menghitung Laba Kotor dan Laba Bersih berdasarkan periode tertentu
   * Mendukung filter per unit usaha maupun konsolidasi seluruh unit usaha
   */
  static async getIncomeStatement(params: {
    businessId?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const journalDateFilter: any = {};
    if (params.startDate) {
      journalDateFilter.gte = new Date(params.startDate);
    }
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      journalDateFilter.lte = end;
    }

    const whereJournal: any = {
      isReversed: false, // Tidak menghitung jurnal yang telah dibatalkan
    };

    if (params.businessId) {
      whereJournal.businessId = params.businessId;
    }

    if (params.startDate || params.endDate) {
      whereJournal.journalDate = journalDateFilter;
    }

    // Ambil seluruh akun Pendapatan (4) dan Beban (5)
    const accountWhere: any = {
      type: { in: [AccountType.PENDAPATAN, AccountType.BEBAN] },
    };
    if (params.businessId) {
      accountWhere.businessId = params.businessId;
    }

    const accounts = await prisma.account.findMany({
      where: accountWhere,
      orderBy: { code: 'asc' },
      include: {
        journalItems: {
          where: {
            journalEntry: whereJournal,
          },
          select: {
            isDebit: true,
            amount: true,
          },
        },
      },
    });

    let totalGrossRevenue = new Prisma.Decimal(0);
    let totalDiscountAndReturns = new Prisma.Decimal(0);
    let totalHPP = new Prisma.Decimal(0);
    let totalOperationalExpenses = new Prisma.Decimal(0);

    const revenueItems: { code: string; name: string; amount: number }[] = [];
    const contraRevenueItems: { code: string; name: string; amount: number }[] = [];
    const hppItems: { code: string; name: string; amount: number }[] = [];
    const operationalExpenseItems: { code: string; name: string; amount: number }[] = [];

    for (const acc of accounts) {
      let debit = new Prisma.Decimal(0);
      let kredit = new Prisma.Decimal(0);

      for (const item of acc.journalItems) {
        if (item.isDebit) debit = debit.plus(item.amount);
        else kredit = kredit.plus(item.amount);
      }

      const balance = this.calculateAccountBalance(acc.normalBalance, debit, kredit);
      const numBalance = Number(balance);

      if (numBalance === 0) continue;

      if (acc.type === AccountType.PENDAPATAN) {
        // Cek jika akun kontra (Diskon / Retur dengan saldo normal DEBIT)
        if (acc.normalBalance === NormalBalance.DEBIT) {
          totalDiscountAndReturns = totalDiscountAndReturns.plus(balance);
          contraRevenueItems.push({ code: acc.code, name: acc.name, amount: numBalance });
        } else {
          totalGrossRevenue = totalGrossRevenue.plus(balance);
          revenueItems.push({ code: acc.code, name: acc.name, amount: numBalance });
        }
      } else if (acc.type === AccountType.BEBAN) {
        // Beban Pokok Penjualan (HPP) kode 5-1xxx
        if (acc.code.startsWith('5-1')) {
          totalHPP = totalHPP.plus(balance);
          hppItems.push({ code: acc.code, name: acc.name, amount: numBalance });
        } else {
          totalOperationalExpenses = totalOperationalExpenses.plus(balance);
          operationalExpenseItems.push({ code: acc.code, name: acc.name, amount: numBalance });
        }
      }
    }

    const netRevenue = totalGrossRevenue.minus(totalDiscountAndReturns);
    const grossProfit = netRevenue.minus(totalHPP);
    const netProfit = grossProfit.minus(totalOperationalExpenses);

    // Ambil info nama usaha jika spesifik
    let businessName = 'Konsolidasi Seluruh Usaha (Robin Group)';
    if (params.businessId) {
      const b = await prisma.business.findUnique({
        where: { id: params.businessId },
        select: { name: true },
      });
      if (b) businessName = b.name;
    }

    // Jika konsolidasi, hitung rincian kontribusi per unit usaha
    let businessBreakdown: {
      businessId: number;
      businessName: string;
      businessCode: string;
      grossRevenue: number;
      discountAndReturns: number;
      netRevenue: number;
      cogs: number;
      grossProfit: number;
      operatingExpenses: number;
      netProfit: number;
    }[] = [];

    if (!params.businessId) {
      const allBusinesses = await prisma.business.findMany({
        where: { deletedAt: null },
        orderBy: { id: 'asc' },
        select: { id: true, name: true, code: true },
      });

      businessBreakdown = await Promise.all(
        allBusinesses.map(async (b) => {
          const stmt = await this.getIncomeStatement({
            businessId: b.id,
            startDate: params.startDate,
            endDate: params.endDate,
          });
          return {
            businessId: b.id,
            businessName: b.name,
            businessCode: b.code,
            grossRevenue: stmt.revenues.grossRevenue,
            discountAndReturns: stmt.revenues.discountAndReturns,
            netRevenue: stmt.revenues.netRevenue,
            cogs: stmt.cogs.totalHPP,
            grossProfit: stmt.grossProfit,
            operatingExpenses: stmt.operatingExpenses.totalExpenses,
            netProfit: stmt.netProfit,
          };
        })
      );
    }

    return {
      businessName,
      isConsolidated: !params.businessId,
      period: {
        startDate: params.startDate || null,
        endDate: params.endDate || null,
      },
      revenues: {
        items: !params.businessId ? this.aggregateItemsByCode(revenueItems) : revenueItems,
        contraItems: !params.businessId ? this.aggregateItemsByCode(contraRevenueItems) : contraRevenueItems,
        grossRevenue: Number(totalGrossRevenue),
        discountAndReturns: Number(totalDiscountAndReturns),
        netRevenue: Number(netRevenue),
      },
      cogs: {
        items: !params.businessId ? this.aggregateItemsByCode(hppItems) : hppItems,
        totalHPP: Number(totalHPP),
      },
      grossProfit: Number(grossProfit),
      operatingExpenses: {
        items: !params.businessId ? this.aggregateItemsByCode(operationalExpenseItems) : operationalExpenseItems,
        totalExpenses: Number(totalOperationalExpenses),
      },
      netProfit: Number(netProfit),
      businessBreakdown,
    };
  }

  /**
   * 2. LAPORAN NERACA (BALANCE SHEET)
   * ASET = KEWAJIBAN + EKUITAS (termasuk Laba Periode Berjalan)
   */
  static async getBalanceSheet(params: {
    businessId?: number;
    asOfDate?: string;
  }) {
    const journalDateFilter: any = {};
    if (params.asOfDate) {
      const end = new Date(params.asOfDate);
      end.setHours(23, 59, 59, 999);
      journalDateFilter.lte = end;
    }

    const whereJournal: any = {
      isReversed: false,
    };
    if (params.businessId) {
      whereJournal.businessId = params.businessId;
    }
    if (params.asOfDate) {
      whereJournal.journalDate = journalDateFilter;
    }

    const accountWhere: any = {};
    if (params.businessId) {
      accountWhere.businessId = params.businessId;
    }

    const accounts = await prisma.account.findMany({
      where: accountWhere,
      orderBy: { code: 'asc' },
      include: {
        journalItems: {
          where: {
            journalEntry: whereJournal,
          },
          select: {
            isDebit: true,
            amount: true,
          },
        },
      },
    });

    let totalAsetLancar = new Prisma.Decimal(0);
    let totalAsetTetap = new Prisma.Decimal(0);
    let totalKewajibanLancar = new Prisma.Decimal(0);
    let totalKewajibanJangkaPanjang = new Prisma.Decimal(0);
    let totalModal = new Prisma.Decimal(0);

    const asetLancarItems: { code: string; name: string; amount: number }[] = [];
    const asetTetapItems: { code: string; name: string; amount: number }[] = [];
    const kewajibanLancarItems: { code: string; name: string; amount: number }[] = [];
    const kewajibanJangkaPanjangItems: { code: string; name: string; amount: number }[] = [];
    const ekuitasItems: { code: string; name: string; amount: number }[] = [];

    // Hitung Laba/Rugi hingga asOfDate untuk dimasukkan ke Ekuitas Periode Berjalan
    let cumulativeNetProfit = new Prisma.Decimal(0);

    for (const acc of accounts) {
      let debit = new Prisma.Decimal(0);
      let kredit = new Prisma.Decimal(0);

      for (const item of acc.journalItems) {
        if (item.isDebit) debit = debit.plus(item.amount);
        else kredit = kredit.plus(item.amount);
      }

      const balance = this.calculateAccountBalance(acc.normalBalance, debit, kredit);
      const numBalance = Number(balance);

      if (acc.type === AccountType.PENDAPATAN) {
        if (acc.normalBalance === NormalBalance.DEBIT) {
          cumulativeNetProfit = cumulativeNetProfit.minus(balance);
        } else {
          cumulativeNetProfit = cumulativeNetProfit.plus(balance);
        }
      } else if (acc.type === AccountType.BEBAN) {
        cumulativeNetProfit = cumulativeNetProfit.minus(balance);
      } else if (acc.type === AccountType.ASET) {
        if (acc.code.startsWith('1-1')) {
          totalAsetLancar = totalAsetLancar.plus(balance);
          asetLancarItems.push({ code: acc.code, name: acc.name, amount: numBalance });
        } else {
          totalAsetTetap = totalAsetTetap.plus(balance);
          asetTetapItems.push({ code: acc.code, name: acc.name, amount: numBalance });
        }
      } else if (acc.type === AccountType.KEWAJIBAN) {
        if (acc.code.startsWith('2-1')) {
          totalKewajibanLancar = totalKewajibanLancar.plus(balance);
          kewajibanLancarItems.push({ code: acc.code, name: acc.name, amount: numBalance });
        } else {
          totalKewajibanJangkaPanjang = totalKewajibanJangkaPanjang.plus(balance);
          kewajibanJangkaPanjangItems.push({ code: acc.code, name: acc.name, amount: numBalance });
        }
      } else if (acc.type === AccountType.EKUITAS) {
        totalModal = totalModal.plus(balance);
        ekuitasItems.push({ code: acc.code, name: acc.name, amount: numBalance });
      }
    }

    // Tambahkan Laba Periode Berjalan ke Ekuitas
    const totalEkuitas = totalModal.plus(cumulativeNetProfit);
    const totalAset = totalAsetLancar.plus(totalAsetTetap);
    const totalKewajiban = totalKewajibanLancar.plus(totalKewajibanJangkaPanjang);
    const totalKewajibanDanEkuitas = totalKewajiban.plus(totalEkuitas);

    let businessName = 'Konsolidasi Seluruh Usaha (Robin Group)';
    if (params.businessId) {
      const b = await prisma.business.findUnique({
        where: { id: params.businessId },
        select: { name: true },
      });
      if (b) businessName = b.name;
    }

    // Jika konsolidasi, hitung rincian neraca per unit usaha
    let businessBreakdown: {
      businessId: number;
      businessName: string;
      businessCode: string;
      currentAssets: number;
      fixedAssets: number;
      totalAssets: number;
      currentLiabilities: number;
      longTermLiabilities: number;
      totalLiabilities: number;
      retainedEarnings: number;
      currentPeriodEarnings: number;
      totalEquity: number;
      totalLiabilitiesAndEquity: number;
      isBalanced: boolean;
    }[] = [];

    if (!params.businessId) {
      const allBusinesses = await prisma.business.findMany({
        where: { deletedAt: null },
        orderBy: { id: 'asc' },
        select: { id: true, name: true, code: true },
      });

      businessBreakdown = await Promise.all(
        allBusinesses.map(async (b) => {
          const bs = await this.getBalanceSheet({
            businessId: b.id,
            asOfDate: params.asOfDate,
          });
          return {
            businessId: b.id,
            businessName: b.name,
            businessCode: b.code,
            currentAssets: bs.assets.currentAssets.total,
            fixedAssets: bs.assets.fixedAssets.total,
            totalAssets: bs.assets.totalAssets,
            currentLiabilities: bs.liabilities.currentLiabilities.total,
            longTermLiabilities: bs.liabilities.longTermLiabilities.total,
            totalLiabilities: bs.liabilities.totalLiabilities,
            retainedEarnings: bs.equity.retainedEarnings,
            currentPeriodEarnings: bs.equity.currentPeriodEarnings,
            totalEquity: bs.equity.totalEquity,
            totalLiabilitiesAndEquity: bs.totalLiabilitiesAndEquity,
            isBalanced: bs.isBalanced,
          };
        })
      );
    }

    return {
      businessName,
      isConsolidated: !params.businessId,
      asOfDate: params.asOfDate || new Date().toISOString(),
      assets: {
        currentAssets: {
          items: !params.businessId ? this.aggregateItemsByCode(asetLancarItems) : asetLancarItems,
          total: Number(totalAsetLancar),
        },
        fixedAssets: {
          items: !params.businessId ? this.aggregateItemsByCode(asetTetapItems) : asetTetapItems,
          total: Number(totalAsetTetap),
        },
        totalAssets: Number(totalAset),
      },
      liabilities: {
        currentLiabilities: {
          items: !params.businessId ? this.aggregateItemsByCode(kewajibanLancarItems) : kewajibanLancarItems,
          total: Number(totalKewajibanLancar),
        },
        longTermLiabilities: {
          items: !params.businessId ? this.aggregateItemsByCode(kewajibanJangkaPanjangItems) : kewajibanJangkaPanjangItems,
          total: Number(totalKewajibanJangkaPanjang),
        },
        totalLiabilities: Number(totalKewajiban),
      },
      equity: {
        items: !params.businessId ? this.aggregateItemsByCode(ekuitasItems) : ekuitasItems,
        retainedEarnings: Number(totalModal),
        currentPeriodEarnings: Number(cumulativeNetProfit),
        totalEquity: Number(totalEkuitas),
      },
      totalLiabilitiesAndEquity: Number(totalKewajibanDanEkuitas),
      isBalanced: totalAset.equals(totalKewajibanDanEkuitas),
      businessBreakdown,
    };
  }

  /**
   * 3. LAPORAN ARUS KAS (CASH FLOW)
   * Menampilkan penerimaan dan pengeluaran kas tunai & bank
   */
  static async getCashFlow(params: {
    businessId?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const whereTrx: any = {
      voidedAt: null,
      journalEntry: {
        is: {
          isReversed: false,
        },
      },
    };
    if (params.businessId) {
      whereTrx.businessId = params.businessId;
    }
    if (params.startDate || params.endDate) {
      whereTrx.transactionDate = {};
      if (params.startDate) whereTrx.transactionDate.gte = new Date(params.startDate);
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        whereTrx.transactionDate.lte = end;
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: whereTrx,
      orderBy: { transactionDate: 'desc' },
      include: {
        business: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    let totalInflow = new Prisma.Decimal(0);
    let totalOutflow = new Prisma.Decimal(0);

    const inflows: any[] = [];
    const outflows: any[] = [];

    for (const t of transactions) {
      if (t.type === 'PEMASUKAN') {
        totalInflow = totalInflow.plus(t.grandTotal);
        inflows.push({
          nomorBukti: t.nomorBukti,
          amount: Number(t.grandTotal),
          paymentMethod: t.paymentMethod,
          notes: t.notes || 'Penjualan kasir',
          date: t.transactionDate,
          businessName: t.business?.name,
        });
      } else {
        totalOutflow = totalOutflow.plus(t.grandTotal);
        outflows.push({
          nomorBukti: t.nomorBukti,
          amount: Number(t.grandTotal),
          paymentMethod: t.paymentMethod,
          notes: t.notes || 'Pengeluaran operasional',
          date: t.transactionDate,
          businessName: t.business?.name,
        });
      }
    }

    let businessName = 'Konsolidasi Seluruh Usaha (Robin Group)';
    if (params.businessId) {
      const b = await prisma.business.findUnique({
        where: { id: params.businessId },
        select: { name: true },
      });
      if (b) businessName = b.name;
    }

    let businessBreakdown: {
      businessId: number;
      businessName: string;
      businessCode: string;
      totalInflow: number;
      totalOutflow: number;
      netCashFlow: number;
    }[] = [];

    if (!params.businessId) {
      const allBusinesses = await prisma.business.findMany({
        where: { deletedAt: null },
        orderBy: { id: 'asc' },
        select: { id: true, name: true, code: true },
      });

      businessBreakdown = await Promise.all(
        allBusinesses.map(async (b) => {
          const cf = await this.getCashFlow({
            businessId: b.id,
            startDate: params.startDate,
            endDate: params.endDate,
          });
          return {
            businessId: b.id,
            businessName: b.name,
            businessCode: b.code,
            totalInflow: cf.totalInflow,
            totalOutflow: cf.totalOutflow,
            netCashFlow: cf.netCashFlow,
          };
        })
      );
    }

    return {
      businessName,
      isConsolidated: !params.businessId,
      period: {
        startDate: params.startDate || null,
        endDate: params.endDate || null,
      },
      totalInflow: Number(totalInflow),
      totalOutflow: Number(totalOutflow),
      netCashFlow: Number(totalInflow.minus(totalOutflow)),
      inflows,
      outflows,
      businessBreakdown,
    };
  }

  /**
   * 4. RINGKASAN DASHBOARD (KPI, STATISTIK KONSOLIDASI & GRAFIK)
   */
  static async getDashboardSummary(businessId?: number) {
    const whereBiz: any = {
      deletedAt: null,
      ...(businessId && { id: businessId }),
    };

    // Ambil daftar unit usaha aktif untuk perbandingan konsolidasi
    const businesses = await prisma.business.findMany({
      where: whereBiz,
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    // 1. KPI Metrik Utama (Laba Rugi 30 hari terakhir)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const incomeStatement = await this.getIncomeStatement({
      businessId,
      startDate: thirtyDaysAgo.toISOString(),
    });

    // 2. Total Produk & Peringatan Inventaris Rusak (Ringan / Berat)
    const productWhere: any = {
      deletedAt: null,
      ...(businessId && { businessId }),
    };

    const inventoryWhere: any = {
      deletedAt: null,
      condition: { in: ['RUSAK_RINGAN', 'RUSAK_BERAT'] },
      ...(businessId && { businessId }),
    };

    const [totalProducts, damagedInventoryCount, damagedInventoryItems] = await Promise.all([
      prisma.product.count({ where: productWhere }),
      prisma.inventoryItem.count({ where: inventoryWhere }),
      prisma.inventoryItem.findMany({
        where: inventoryWhere,
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          unit: true,
          quantity: true,
          condition: true,
          storageLocation: true,
          unitPrice: true,
          business: { select: { name: true } },
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    // 3. Perbandingan Penjualan Antar Unit Usaha (Konsolidasi Multi-Usaha)
    const businessComparison = await Promise.all(
      businesses.map(async (b) => {
        const stmt = await this.getIncomeStatement({
          businessId: b.id,
          startDate: thirtyDaysAgo.toISOString(),
        });
        return {
          id: b.id,
          name: b.name,
          code: b.code,
          revenue: stmt.revenues.netRevenue,
          expense: stmt.operatingExpenses.totalExpenses + stmt.cogs.totalHPP,
          netProfit: stmt.netProfit,
        };
      })
    );

    // 4. Tren Penjualan 7 Hari Terakhir
    const salesTrend: { date: string; revenue: number; transactions: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));

      const dayTrx = await prisma.transaction.findMany({
        where: {
          ...(businessId && { businessId }),
          type: 'PEMASUKAN',
          voidedAt: null,
          journalEntry: {
            is: {
              isReversed: false,
            },
          },
          transactionDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: { grandTotal: true },
      });

      const dayRevenue = dayTrx.reduce(
        (sum, t) => sum.plus(t.grandTotal),
        new Prisma.Decimal(0)
      );

      const dateLabel = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
      }).format(startOfDay);

      salesTrend.push({
        date: dateLabel,
        revenue: Number(dayRevenue),
        transactions: dayTrx.length,
      });
    }

    // 5. Transaksi Terbaru (hanya yang memiliki jurnal aktif)
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        ...(businessId && { businessId }),
        voidedAt: null,
        journalEntry: {
          is: {
            isReversed: false,
          },
        },
      },
      take: 5,
      orderBy: { transactionDate: 'desc' },
      include: {
        business: { select: { name: true, code: true } },
        createdBy: { select: { fullName: true } },
      },
    });

    return {
      kpi: {
        revenue: incomeStatement.revenues.netRevenue,
        expenses: incomeStatement.operatingExpenses.totalExpenses + incomeStatement.cogs.totalHPP,
        netProfit: incomeStatement.netProfit,
        grossProfit: incomeStatement.grossProfit,
        totalProducts,
        damagedInventoryCount,
      },
      businessComparison,
      salesTrend,
      damagedInventoryItems: damagedInventoryItems.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: Number(item.quantity),
        condition: item.condition,
        storageLocation: item.storageLocation || '-',
        unitPrice: Number(item.unitPrice),
        businessName: item.business.name,
      })),
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        nomorBukti: t.nomorBukti,
        type: t.type,
        grandTotal: Number(t.grandTotal),
        paymentMethod: t.paymentMethod,
        date: t.transactionDate,
        businessName: t.business.name,
        cashier: t.createdBy.fullName,
      })),
    };
  }

  /**
   * 5. EKSPOR EXCEL (.XLSX) LOKAL
   */
  static async exportExcel(
    reportType: 'INCOME_STATEMENT' | 'BALANCE_SHEET',
    params: { businessId?: number; startDate?: string; endDate?: string; asOfDate?: string }
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Robin Group Offline Accounting';
    workbook.created = new Date();

    if (reportType === 'INCOME_STATEMENT') {
      const data = await this.getIncomeStatement(params);
      const sheet = workbook.addWorksheet('Laba Rugi');

      sheet.columns = [
        { header: 'KODE', key: 'code', width: 15 },
        { header: 'KETERANGAN AKUN', key: 'name', width: 40 },
        { header: 'NOMINAL (IDR)', key: 'amount', width: 22 },
      ];

      sheet.addRow(['ROBIN GROUP', data.businessName]);
      sheet.addRow(['LAPORAN LABA RUGI', `Periode: ${data.period.startDate || 'Awal'} s/d ${data.period.endDate || 'Sekarang'}`]);
      sheet.addRow([]);

      sheet.addRow(['--- PENDAPATAN USAHA ---']);
      for (const item of data.revenues.items) {
        sheet.addRow([item.code, item.name, item.amount]);
      }
      for (const item of data.revenues.contraItems) {
        sheet.addRow([item.code, `(Diskon/Retur) ${item.name}`, -item.amount]);
      }
      sheet.addRow(['', 'TOTAL PENDAPATAN BERSIH', data.revenues.netRevenue]);
      sheet.addRow([]);

      sheet.addRow(['--- BEBAN POKOK PENJUALAN (HPP) ---']);
      for (const item of data.cogs.items) {
        sheet.addRow([item.code, item.name, item.amount]);
      }
      sheet.addRow(['', 'TOTAL HPP', data.cogs.totalHPP]);
      sheet.addRow(['', 'LABA KOTOR', data.grossProfit]);
      sheet.addRow([]);

      sheet.addRow(['--- BEBAN OPERASIONAL ---']);
      for (const item of data.operatingExpenses.items) {
        sheet.addRow([item.code, item.name, item.amount]);
      }
      sheet.addRow(['', 'TOTAL BEBAN OPERASIONAL', data.operatingExpenses.totalExpenses]);
      sheet.addRow([]);

      sheet.addRow(['', 'LABA BERSIH (NET PROFIT)', data.netProfit]);

      if (data.isConsolidated && data.businessBreakdown && data.businessBreakdown.length > 0) {
        sheet.addRow([]);
        sheet.addRow(['--- KONTRIBUSI LABA RUGI PER UNIT USAHA ---']);
        sheet.addRow(['KODE', 'NAMA UNIT USAHA', 'PENDAPATAN BERSIH', 'TOTAL BEBAN', 'LABA BERSIH']);
        for (const b of data.businessBreakdown) {
          sheet.addRow([b.businessCode, b.businessName, b.netRevenue, b.operatingExpenses + b.cogs, b.netProfit]);
        }
      }
    } else {
      const data = await this.getBalanceSheet(params);
      const sheet = workbook.addWorksheet('Neraca');

      sheet.columns = [
        { header: 'KODE', key: 'code', width: 15 },
        { header: 'KOMPONEN NERACA', key: 'name', width: 40 },
        { header: 'NOMINAL (IDR)', key: 'amount', width: 22 },
      ];

      sheet.addRow(['ROBIN GROUP', data.businessName]);
      sheet.addRow(['LAPORAN NERACA', `Per Tanggal: ${data.asOfDate}`]);
      sheet.addRow([]);

      sheet.addRow(['--- ASET LANCAR ---']);
      for (const item of data.assets.currentAssets.items) {
        sheet.addRow([item.code, item.name, item.amount]);
      }
      sheet.addRow(['', 'TOTAL ASET LANCAR', data.assets.currentAssets.total]);

      sheet.addRow(['--- ASET TETAP ---']);
      for (const item of data.assets.fixedAssets.items) {
        sheet.addRow([item.code, item.name, item.amount]);
      }
      sheet.addRow(['', 'TOTAL ASET TETAP', data.assets.fixedAssets.total]);
      sheet.addRow(['', 'TOTAL ASET', data.assets.totalAssets]);
      sheet.addRow([]);

      sheet.addRow(['--- KEWAJIBAN ---']);
      for (const item of data.liabilities.currentLiabilities.items) {
        sheet.addRow([item.code, item.name, item.amount]);
      }
      sheet.addRow(['', 'TOTAL KEWAJIBAN', data.liabilities.totalLiabilities]);
      sheet.addRow([]);

      sheet.addRow(['--- EKUITAS ---']);
      for (const item of data.equity.items) {
        sheet.addRow([item.code, item.name, item.amount]);
      }
      sheet.addRow(['', 'Laba Periode Berjalan', data.equity.currentPeriodEarnings]);
      sheet.addRow(['', 'TOTAL EKUITAS', data.equity.totalEquity]);
      sheet.addRow([]);

      sheet.addRow(['', 'TOTAL KEWAJIBAN & EKUITAS', data.totalLiabilitiesAndEquity]);

      if (data.isConsolidated && data.businessBreakdown && data.businessBreakdown.length > 0) {
        sheet.addRow([]);
        sheet.addRow(['--- RINCIAN NERACA PER UNIT USAHA ---']);
        sheet.addRow(['KODE', 'NAMA UNIT USAHA', 'TOTAL ASET', 'TOTAL KEWAJIBAN', 'TOTAL EKUITAS']);
        for (const b of data.businessBreakdown) {
          sheet.addRow([b.businessCode, b.businessName, b.totalAssets, b.totalLiabilities, b.totalEquity]);
        }
      }
    }

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
