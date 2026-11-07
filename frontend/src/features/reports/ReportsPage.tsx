import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Layers,
  Database,
  Building2,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  ShoppingCart,
  Receipt,
  UtensilsCrossed,
  Eye,
  Search,
  X,
  CreditCard,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { formatRupiah, formatTanggal, formatTanggalJam } from '../../utils/formatters';
import toast from 'react-hot-toast';
import type { ApiResponse } from '../../types/index';

interface SalesReportReceiptItem {
  id: number;
  productId: number | null;
  productCode: string;
  itemName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface SalesReportReceipt {
  id: number;
  nomorBukti: string;
  transactionDate: string;
  businessId: number;
  businessName: string;
  businessCode: string;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: string;
  cashPaid: number | null;
  changeAmount: number | null;
  notes: string | null;
  isVoided: boolean;
  voidedAt: string | null;
  voidReason: string | null;
  cashier: string;
  itemCount: number;
  items: SalesReportReceiptItem[];
}

interface ProductSalesItem {
  productId: number | null;
  productCode: string;
  productName: string;
  category: string;
  unit: string;
  totalQty: number;
  totalRevenue: number;
  transactionCount: number;
  averagePrice: number;
  contributionPercentage: number;
}

interface SalesReportData {
  businessName: string;
  isConsolidated: boolean;
  period: { startDate: string | null; endDate: string | null };
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    totalItemsSold: number;
    totalDiscounts: number;
    totalTax: number;
    averageTransaction: number;
    voidCount: number;
    voidAmount: number;
    paymentMethods: Record<string, { count: number; total: number }>;
  };
  productSales: ProductSalesItem[];
  receipts: SalesReportReceipt[];
}

interface IncomeStatementData {
  businessName: string;
  isConsolidated: boolean;
  period: { startDate: string | null; endDate: string | null };
  revenues: {
    items: { code: string; name: string; amount: number }[];
    contraItems: { code: string; name: string; amount: number }[];
    grossRevenue: number;
    discountAndReturns: number;
    netRevenue: number;
  };
  cogs: {
    items: { code: string; name: string; amount: number }[];
    totalHPP: number;
  };
  grossProfit: number;
  operatingExpenses: {
    items: { code: string; name: string; amount: number }[];
    totalExpenses: number;
  };
  netProfit: number;
  businessBreakdown?: {
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
  }[];
}

interface BalanceSheetData {
  businessName: string;
  isConsolidated: boolean;
  asOfDate: string;
  assets: {
    currentAssets: { items: { code: string; name: string; amount: number }[]; total: number };
    fixedAssets: { items: { code: string; name: string; amount: number }[]; total: number };
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: { items: { code: string; name: string; amount: number }[]; total: number };
    longTermLiabilities: { items: { code: string; name: string; amount: number }[]; total: number };
    totalLiabilities: number;
  };
  equity: {
    items: { code: string; name: string; amount: number }[];
    retainedEarnings: number;
    currentPeriodEarnings: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  businessBreakdown?: {
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
  }[];
}

interface CashFlowData {
  businessName?: string;
  isConsolidated?: boolean;
  period: { startDate: string | null; endDate: string | null };
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  inflows: { nomorBukti: string; amount: number; paymentMethod: string; notes: string; date: string; businessName?: string }[];
  outflows: { nomorBukti: string; amount: number; paymentMethod: string; notes: string; date: string; businessName?: string }[];
  businessBreakdown?: {
    businessId: number;
    businessName: string;
    businessCode: string;
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
  }[];
}

interface BackupItem {
  filename: string;
  sizeBytes: number;
  sizeReadable: string;
  createdAt: string;
}

export function ReportsPage() {
  const queryClient = useQueryClient();
  const { user, activeBusiness, businesses } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [activeTab, setActiveTab] = useState<'sales' | 'income' | 'balance' | 'cashflow' | 'backup'>('sales');
  const [salesSubTab, setSalesSubTab] = useState<'receipts' | 'products'>('receipts');
  const [salesSearch, setSalesSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<SalesReportReceipt | null>(null);

  // Query daftar seluruh unit usaha aktif untuk selector
  const { data: businessList } = useQuery({
    queryKey: ['businesses'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<any[]>>('/businesses');
      return res.data.data ?? [];
    },
    enabled: isSuperAdmin,
  });

  const availableBusinesses = isSuperAdmin
    ? (businessList && businessList.length > 0 ? businessList : businesses)
    : businesses;

  // Selected Scope: 'all' (Konsolidasi Seluruh Usaha) atau businessId angka
  const [selectedScope, setSelectedScope] = useState<string>(
    isSuperAdmin ? 'all' : (activeBusiness?.id ? activeBusiness.id.toString() : 'all')
  );

  const isConsolidated = selectedScope === 'all';

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [asOfDate, setAsOfDate] = useState('');

  // Date range presets helper
  const setDatePreset = (preset: 'today' | 'yesterday' | '7days' | 'thisMonth' | 'all') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      const todayStr = toYMD(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      const yestStr = toYMD(yest);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === '7days') {
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      setStartDate(toYMD(past));
      setEndDate(toYMD(now));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(now));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Sales Report Query
  const { data: salesData, isLoading: isLoadingSales } = useQuery({
    queryKey: ['sales-report', selectedScope, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (isConsolidated) {
        params.append('consolidated', 'true');
      } else {
        params.append('businessId', selectedScope);
      }
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await apiClient.get<ApiResponse<SalesReportData>>(
        `/reports/sales?${params.toString()}`,
        {
          headers: isConsolidated ? { 'x-consolidated': 'true' } : { 'x-business-id': selectedScope },
        }
      );
      return res.data.data;
    },
    enabled: activeTab === 'sales',
  });

  // Income Statement Query
  const { data: incomeData, isLoading: isLoadingIncome } = useQuery({
    queryKey: ['income-statement', selectedScope, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (isConsolidated) {
        params.append('consolidated', 'true');
      } else {
        params.append('businessId', selectedScope);
      }
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await apiClient.get<ApiResponse<IncomeStatementData>>(
        `/reports/income-statement?${params.toString()}`,
        {
          headers: isConsolidated ? { 'x-consolidated': 'true' } : { 'x-business-id': selectedScope }
        }
      );
      return res.data.data;
    },
    enabled: activeTab === 'income',
  });

  // Balance Sheet Query
  const { data: balanceData, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['balance-sheet', selectedScope, asOfDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (isConsolidated) {
        params.append('consolidated', 'true');
      } else {
        params.append('businessId', selectedScope);
      }
      if (asOfDate) params.append('asOfDate', asOfDate);
      const res = await apiClient.get<ApiResponse<BalanceSheetData>>(
        `/reports/balance-sheet?${params.toString()}`,
        {
          headers: isConsolidated ? { 'x-consolidated': 'true' } : { 'x-business-id': selectedScope }
        }
      );
      return res.data.data;
    },
    enabled: activeTab === 'balance',
  });

  // Cash Flow Query
  const { data: cashFlowData, isLoading: isLoadingCashFlow } = useQuery({
    queryKey: ['cash-flow', selectedScope, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (isConsolidated) {
        params.append('consolidated', 'true');
      } else {
        params.append('businessId', selectedScope);
      }
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await apiClient.get<ApiResponse<CashFlowData>>(
        `/reports/cash-flow?${params.toString()}`,
        {
          headers: isConsolidated ? { 'x-consolidated': 'true' } : { 'x-business-id': selectedScope }
        }
      );
      return res.data.data;
    },
    enabled: activeTab === 'cashflow',
  });

  // Backups Query
  const { data: backupList, isLoading: isLoadingBackups } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<BackupItem[]>>('/backup/list');
      return res.data.data ?? [];
    },
    enabled: activeTab === 'backup' && isSuperAdmin,
  });

  // Backup creation mutation
  const backupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ApiResponse<any>>('/backup/create');
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Backup database berhasil dibuat!');
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal membuat backup database.');
    },
  });

  const handleExportExcel = async (type: 'INCOME_STATEMENT' | 'BALANCE_SHEET' | 'SALES') => {
    try {
      toast.loading('Menyiapkan file Excel...', { id: 'excel' });
      const params = new URLSearchParams();
      if (isConsolidated) {
        params.append('consolidated', 'true');
      } else {
        params.append('businessId', selectedScope);
      }
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (asOfDate) params.append('asOfDate', asOfDate);

      let url = '';
      if (type === 'SALES') {
        url = `/reports/export/sales-excel?${params.toString()}`;
      } else {
        params.append('type', type);
        url = `/reports/export/excel?${params.toString()}`;
      }

      const response = await apiClient.get(url, {
        responseType: 'blob',
        headers: isConsolidated ? { 'x-consolidated': 'true' } : { 'x-business-id': selectedScope }
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `Laporan_${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('File Excel berhasil diunduh!', { id: 'excel' });
    } catch {
      toast.error('Gagal mengunduh file Excel.', { id: 'excel' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-primary-600" />
            Laporan Keuangan & Utilitas
          </h1>
          <p className="text-surface-500 text-sm mt-1">
            Laba Rugi, Neraca Keuangan, Arus Kas, dan Backup Basis Data
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTab !== 'backup' && (
            <>
              <button
                onClick={() =>
                  handleExportExcel(
                    activeTab === 'sales'
                      ? 'SALES'
                      : activeTab === 'balance'
                      ? 'BALANCE_SHEET'
                      : 'INCOME_STATEMENT'
                  )
                }
                className="btn-secondary text-sm flex items-center gap-1.5"
                title="Ekspor ke spreadsheet Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Unduh Excel
              </button>
              <button
                onClick={handlePrint}
                className="btn-primary text-sm flex items-center gap-1.5"
                title="Cetak format cetak / Simpan PDF"
              >
                <Printer className="w-4 h-4" /> Cetak Laporan
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-surface-200 gap-6">
        {[
          { id: 'sales', name: 'Laporan Penjualan', icon: ShoppingCart },
          { id: 'income', name: 'Laba Rugi (P&L)', icon: TrendingUp },
          { id: 'balance', name: 'Neraca (Balance Sheet)', icon: Layers },
          { id: 'cashflow', name: 'Arus Kas (Cash Flow)', icon: ArrowUpRight },
          ...(isSuperAdmin ? [{ id: 'backup', name: 'Backup Database', icon: Database }] : []),
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                isActive
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-surface-500 hover:text-surface-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Scope Selector & Filter Bar (kecuali tab backup) */}
      {activeTab !== 'backup' && (
        <div className="card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Scope Selector: Konsolidasi Seluruh Usaha vs Unit Usaha Spesifik */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full md:w-auto">
            <span className="text-xs font-bold text-surface-700 flex items-center gap-1.5 shrink-0">
              <Building2 className="w-4 h-4 text-primary-600" />
              Cakupan Laporan:
            </span>
            <div className="relative flex-1 sm:w-80">
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="input py-1.5 text-xs font-semibold bg-white border-surface-300 text-surface-900 rounded-lg shadow-2xs pr-8"
              >
                {isSuperAdmin && (
                  <option value="all" className="font-bold text-primary-700">
                    🏢 KONSOLIDASI SELURUH USAHA (SEMUA UNIT)
                  </option>
                )}
                {availableBusinesses.map((b) => (
                  <option key={b.id} value={b.id.toString()}>
                    🏬 {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
            {isConsolidated ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-50 text-primary-700 border border-primary-200 shrink-0">
                GABUNGAN SEMUA UNIT
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-100 text-surface-600 border border-surface-200 shrink-0">
                UNIT TUNGGAL
              </span>
            )}
          </div>

          {/* Date Filter Inputs */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {activeTab !== 'balance' && (
              <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
                <button
                  type="button"
                  onClick={() => setDatePreset('today')}
                  className="px-2 py-1 text-[11px] font-medium rounded bg-surface-100 hover:bg-surface-200 text-surface-700 whitespace-nowrap"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('yesterday')}
                  className="px-2 py-1 text-[11px] font-medium rounded bg-surface-100 hover:bg-surface-200 text-surface-700 whitespace-nowrap"
                >
                  Kemarin
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('7days')}
                  className="px-2 py-1 text-[11px] font-medium rounded bg-surface-100 hover:bg-surface-200 text-surface-700 whitespace-nowrap"
                >
                  7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('thisMonth')}
                  className="px-2 py-1 text-[11px] font-medium rounded bg-surface-100 hover:bg-surface-200 text-surface-700 whitespace-nowrap"
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('all')}
                  className="px-2 py-1 text-[11px] font-medium rounded bg-surface-100 hover:bg-surface-200 text-surface-700 whitespace-nowrap"
                >
                  Semua
                </button>
              </div>
            )}

            {activeTab !== 'balance' ? (
              <>
                <div className="flex items-center gap-1 text-xs text-surface-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Dari:</span>
                </div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input py-1 text-xs"
                />
                <span className="text-xs text-surface-400">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input py-1 text-xs"
                />
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 text-xs text-surface-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Per Tanggal:</span>
                </div>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="input py-1 text-xs"
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 0: LAPORAN PENJUALAN (HISTORY PER-STRUK & MENU LAKU) */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {isLoadingSales ? (
            <div className="card p-12 text-center text-surface-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-600" />
              Menghitung data transaksi penjualan kasir...
            </div>
          ) : salesData ? (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="card p-6 text-center border-b border-surface-200">
                <div className="flex justify-center mb-1.5">
                  {salesData.isConsolidated ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-50 text-primary-700 border border-primary-200 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      LAPORAN KONSOLIDASI PENJUALAN SELURUH USAHA
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-100 text-surface-700 border border-surface-200">
                      UNIT USAHA: {salesData.businessName}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-surface-900 uppercase">
                  {salesData.businessName}
                </h2>
                <h3 className="text-base font-semibold text-primary-600 mt-0.5">
                  Laporan Penjualan & Analisis Menu Laku
                </h3>
                <p className="text-xs text-surface-500 mt-1">
                  Periode:{' '}
                  {salesData.period.startDate ? formatTanggal(salesData.period.startDate) : 'Awal Penjualan'}{' '}
                  s/d{' '}
                  {salesData.period.endDate ? formatTanggal(salesData.period.endDate) : 'Saat Ini'}
                </p>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-surface-500 font-medium">Total Omset Penjualan</p>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold font-mono text-emerald-600 mt-2">
                    {formatRupiah(salesData.summary.totalRevenue)}
                  </p>
                  <p className="text-[11px] text-surface-400 mt-1">
                    Dari {salesData.summary.totalTransactions} transaksi berhasil
                  </p>
                </div>

                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-surface-500 font-medium">Total Struk Transaksi</p>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-surface-900 mt-2">
                    {salesData.summary.totalTransactions} Struk
                  </p>
                  <p className="text-[11px] text-surface-400 mt-1">
                    {salesData.summary.voidCount > 0 ? (
                      <span className="text-rose-500">
                        {salesData.summary.voidCount} dibatalkan (void)
                      </span>
                    ) : (
                      'Semua transaksi valid'
                    )}
                  </p>
                </div>

                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-surface-500 font-medium">Menu Terjual (Kuantitas)</p>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <UtensilsCrossed className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-surface-900 mt-2">
                    {salesData.summary.totalItemsSold} Item
                  </p>
                  <p className="text-[11px] text-surface-400 mt-1">
                    {salesData.productSales.length} varian menu laku terjual
                  </p>
                </div>

                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-surface-500 font-medium">Rata-rata Nilai Struk</p>
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold font-mono text-purple-700 mt-2">
                    {formatRupiah(salesData.summary.averageTransaction)}
                  </p>
                  <p className="text-[11px] text-surface-400 mt-1">Basket size per pelanggan</p>
                </div>
              </div>

              {/* Payment Methods Breakdown Cards */}
              <div className="card p-4">
                <p className="text-xs font-semibold text-surface-500 mb-2.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Pembayaran Berdasarkan Metode:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {Object.entries(salesData.summary.paymentMethods).map(([method, val]) => (
                    <div key={method} className="p-3 rounded-lg bg-surface-50 border border-surface-200/60">
                      <span className="font-semibold text-surface-700">{method}</span>
                      <p className="text-sm font-bold font-mono text-surface-900 mt-1">
                        {formatRupiah(val.total)}
                      </p>
                      <p className="text-[11px] text-surface-400 mt-0.5">{val.count} transaksi</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-view Selector (Tabs) */}
              <div className="flex border-b border-surface-200 gap-4">
                <button
                  type="button"
                  onClick={() => setSalesSubTab('receipts')}
                  className={`pb-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                    salesSubTab === 'receipts'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-surface-500 hover:text-surface-800'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  History Penjualan Per-Struk ({salesData.receipts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSalesSubTab('products')}
                  className={`pb-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                    salesSubTab === 'products'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-surface-500 hover:text-surface-800'
                  }`}
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  Rekapitulasi Menu Terjual / Menu Laku ({salesData.productSales.length})
                </button>
              </div>

              {/* SUB-VIEW 1: HISTORY STRUK PENJUALAN */}
              {salesSubTab === 'receipts' && (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="card p-3">
                    <div className="relative w-full">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                      <input
                        type="text"
                        value={salesSearch}
                        onChange={(e) => setSalesSearch(e.target.value)}
                        placeholder="Cari berdasarkan No. Struk (TRX-...), kasir, atau catatan transaksi..."
                        className="input pl-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Table Receipts */}
                  <div className="card overflow-hidden">
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>No. Struk</th>
                            <th>Waktu Transaksi</th>
                            {salesData.isConsolidated && <th>Unit Usaha</th>}
                            <th>Kasir</th>
                            <th>Metode Bayar</th>
                            <th className="text-center">Jml Item</th>
                            <th className="text-right">Total Tagihan</th>
                            <th className="text-center">Status</th>
                            <th className="text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salesData.receipts
                            .filter((r) => {
                              if (!salesSearch) return true;
                              const s = salesSearch.toLowerCase();
                              return (
                                r.nomorBukti.toLowerCase().includes(s) ||
                                r.cashier.toLowerCase().includes(s) ||
                                (r.notes && r.notes.toLowerCase().includes(s))
                              );
                            })
                            .map((r) => (
                              <tr key={r.id} className="hover:bg-surface-50/80 transition-colors">
                                <td>
                                  <span className="font-mono text-xs font-bold text-surface-900">
                                    {r.nomorBukti}
                                  </span>
                                </td>
                                <td className="text-xs text-surface-600 whitespace-nowrap">
                                  {formatTanggalJam(r.transactionDate)}
                                </td>
                                {salesData.isConsolidated && (
                                  <td className="text-xs text-surface-700 font-medium">
                                    {r.businessName}
                                  </td>
                                )}
                                <td className="text-xs text-surface-700">{r.cashier}</td>
                                <td>
                                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-100 text-surface-700 border border-surface-200">
                                    {r.paymentMethod}
                                  </span>
                                </td>
                                <td className="text-center text-xs text-surface-600 font-medium">
                                  {r.itemCount} item
                                </td>
                                <td className="text-right text-xs font-mono font-bold text-surface-900">
                                  {formatRupiah(r.grandTotal)}
                                </td>
                                <td className="text-center">
                                  {r.isVoided ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      DIBATALKAN
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      SELESAI
                                    </span>
                                  )}
                                </td>
                                <td className="text-right">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedReceipt(r)}
                                    className="p-1.5 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors text-xs font-medium inline-flex items-center gap-1"
                                    title="Lihat Detail Struk"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Rincian
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 2: REKAPITULASI MENU TERJUAL */}
              {salesSubTab === 'products' && (
                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-surface-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-surface-900 text-sm">
                        Katalog Menu yang Laku Terjual pada Periode Terpilih
                      </h4>
                      <p className="text-xs text-surface-500 mt-0.5">
                        Daftar produk diurutkan berdasarkan kuantitas terbanyak yang dipesan kasir
                      </p>
                    </div>
                  </div>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th className="text-center w-14">Rank</th>
                          <th>Menu & Kode</th>
                          <th>Tipe Menu</th>
                          <th className="text-center">Terjual (Qty)</th>
                          <th className="text-right">Harga Rata-rata</th>
                          <th className="text-right">Total Pendapatan (Omset)</th>
                          <th className="w-48">Kontribusi Omset</th>
                          <th className="text-center">Muncul di Struk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.productSales.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-12 text-surface-400 text-xs">
                              Tidak ada menu yang terjual pada rentang waktu ini.
                            </td>
                          </tr>
                        ) : (
                          salesData.productSales.map((item, idx) => (
                            <tr key={item.productId ?? item.productName} className="hover:bg-surface-50/80 transition-colors">
                              <td className="text-center font-bold text-xs">
                                {idx === 0 && (
                                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 inline-flex items-center justify-center text-xs shadow-2xs">
                                    🥇
                                  </span>
                                )}
                                {idx === 1 && (
                                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-xs">
                                    🥈
                                  </span>
                                )}
                                {idx === 2 && (
                                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 inline-flex items-center justify-center text-xs">
                                    🥉
                                  </span>
                                )}
                                {idx > 2 && (
                                  <span className="text-surface-500">#{idx + 1}</span>
                                )}
                              </td>
                              <td>
                                <div>
                                  <p className="font-semibold text-surface-900 text-sm">
                                    {item.productName}
                                  </p>
                                  <p className="text-xs text-surface-400 font-mono">
                                    {item.productCode}
                                  </p>
                                </div>
                              </td>
                              <td>
                                <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200/60">
                                  {item.category}
                                </span>
                              </td>
                              <td className="text-center font-bold text-sm font-mono text-surface-900">
                                {item.totalQty} <span className="text-xs text-surface-500 font-normal">{item.unit}</span>
                              </td>
                              <td className="text-right text-xs font-mono text-surface-600">
                                {formatRupiah(item.averagePrice)}
                              </td>
                              <td className="text-right text-sm font-bold font-mono text-emerald-600">
                                {formatRupiah(item.totalRevenue)}
                              </td>
                              <td>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[11px] text-surface-600">
                                    <span>{item.contributionPercentage}%</span>
                                  </div>
                                  <div className="w-full bg-surface-100 h-2 rounded-full overflow-hidden">
                                    <div
                                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${Math.min(100, item.contributionPercentage)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="text-center text-xs text-surface-600">
                                {item.transactionCount} transaksi
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-8 text-center text-surface-500 text-sm">
              Tidak ada data penjualan untuk kriteria filter ini.
            </div>
          )}
        </div>
      )}

      {/* MODAL DETAIL STRUK */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="card w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-surface-200 flex items-center justify-between bg-surface-50">
              <h3 className="font-bold text-surface-900 text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary-600" />
                Detail Struk #{selectedReceipt.nomorBukti}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="text-surface-400 hover:text-surface-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-mono max-h-[70vh] overflow-y-auto">
              {/* Receipt Info */}
              <div className="space-y-1 pb-3 border-b border-surface-200">
                <div className="flex justify-between">
                  <span className="text-surface-500">Unit Usaha:</span>
                  <span className="font-bold text-surface-900">{selectedReceipt.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Waktu:</span>
                  <span>{formatTanggalJam(selectedReceipt.transactionDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Kasir:</span>
                  <span>{selectedReceipt.cashier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Metode Bayar:</span>
                  <span className="font-bold text-primary-700">{selectedReceipt.paymentMethod}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 pb-3 border-b border-dashed border-surface-200">
                <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">
                  Daftar Pesanan Menu:
                </p>
                {selectedReceipt.items.map((it) => (
                  <div key={it.id} className="flex justify-between py-0.5">
                    <div>
                      <p className="font-semibold text-surface-900">{it.itemName}</p>
                      <p className="text-[10px] text-surface-400">
                        {it.quantity} x {formatRupiah(it.unitPrice)}
                      </p>
                    </div>
                    <span className="font-bold text-surface-900">{formatRupiah(it.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 pb-3 border-b border-surface-200">
                <div className="flex justify-between text-surface-600">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(selectedReceipt.totalAmount)}</span>
                </div>
                {selectedReceipt.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(selectedReceipt.discountAmount)}</span>
                  </div>
                )}
                {selectedReceipt.taxAmount > 0 && (
                  <div className="flex justify-between text-surface-600">
                    <span>Pajak:</span>
                    <span>+{formatRupiah(selectedReceipt.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-surface-900 pt-1">
                  <span>TOTAL TAGIHAN:</span>
                  <span className="text-emerald-600">{formatRupiah(selectedReceipt.grandTotal)}</span>
                </div>
                {selectedReceipt.cashPaid !== null && (
                  <>
                    <div className="flex justify-between text-surface-600 pt-1">
                      <span>Tunai Diterima:</span>
                      <span>{formatRupiah(selectedReceipt.cashPaid)}</span>
                    </div>
                    <div className="flex justify-between text-surface-600">
                      <span>Kembalian:</span>
                      <span>{formatRupiah(selectedReceipt.changeAmount || 0)}</span>
                    </div>
                  </>
                )}
              </div>

              {selectedReceipt.notes && (
                <div className="p-2.5 bg-surface-50 rounded-lg text-surface-600">
                  <span className="font-bold text-surface-500">Catatan:</span> {selectedReceipt.notes}
                </div>
              )}

              {selectedReceipt.isVoided && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
                  <p className="font-bold">STATUS TRANSAKSI: DIBATALKAN</p>
                  <p className="text-[11px] mt-0.5">Alasan: {selectedReceipt.voidReason || '-'}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-surface-50 border-t border-surface-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="btn-secondary text-xs px-4"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: LAPORAN LABA RUGI */}
      {activeTab === 'income' && (
        <div className="space-y-6">
          {isLoadingIncome ? (
            <div className="card p-12 text-center text-surface-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-600" />
              Menghitung agregasi laba rugi...
            </div>
          ) : incomeData ? (
            <div className="card p-6 md:p-8 space-y-6 print:shadow-none print:border-none">
              {/* Header Laporan */}
              <div className="text-center pb-4 border-b border-surface-200">
                <div className="flex justify-center mb-1.5">
                  {incomeData.isConsolidated ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-50 text-primary-700 border border-primary-200 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      LAPORAN KONSOLIDASI SELURUH UNIT USAHA (ROBIN GROUP)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-100 text-surface-700 border border-surface-200">
                      LAPORAN UNIT USAHA TUNGGAL
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-surface-900 uppercase">
                  {incomeData.businessName}
                </h2>
                <h3 className="text-base font-semibold text-primary-600 mt-0.5">
                  Laporan Laba Rugi (Income Statement)
                </h3>
                <p className="text-xs text-surface-500 mt-1">
                  Periode:{' '}
                  {incomeData.period.startDate ? formatTanggal(incomeData.period.startDate) : 'Awal Pembukuan'}{' '}
                  s/d{' '}
                  {incomeData.period.endDate ? formatTanggal(incomeData.period.endDate) : 'Saat Ini'}
                </p>
              </div>

              {/* 1. Pendapatan */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-surface-700 bg-surface-100 p-2 rounded-lg">
                  1. Pendapatan Usaha
                </h4>
                <div className="pl-4 pr-2 space-y-1.5 text-xs">
                  {incomeData.revenues.items.map((it) => (
                    <div key={it.code} className="flex justify-between py-1 border-b border-surface-50">
                      <span>{it.code} - {it.name}</span>
                      <span className="font-mono font-medium">{formatRupiah(it.amount)}</span>
                    </div>
                  ))}
                  {incomeData.revenues.contraItems.map((it) => (
                    <div key={it.code} className="flex justify-between py-1 text-rose-600 border-b border-surface-50">
                      <span>{it.code} - (Diskon / Retur) {it.name}</span>
                      <span className="font-mono font-medium">({formatRupiah(it.amount)})</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 font-bold text-surface-900">
                    <span>Total Pendapatan Bersih</span>
                    <span className="font-mono text-emerald-600">
                      {formatRupiah(incomeData.revenues.netRevenue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Beban Pokok Penjualan (HPP) */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-surface-700 bg-surface-100 p-2 rounded-lg">
                  2. Beban Pokok Penjualan (HPP)
                </h4>
                <div className="pl-4 pr-2 space-y-1.5 text-xs">
                  {incomeData.cogs.items.length === 0 ? (
                    <p className="text-surface-400 italic py-1">Tidak ada beban HPP pada periode ini.</p>
                  ) : (
                    incomeData.cogs.items.map((it) => (
                      <div key={it.code} className="flex justify-between py-1 border-b border-surface-50">
                        <span>{it.code} - {it.name}</span>
                        <span className="font-mono font-medium">{formatRupiah(it.amount)}</span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between pt-2 font-bold text-surface-900">
                    <span>Total Beban Pokok Penjualan</span>
                    <span className="font-mono text-rose-600">
                      {formatRupiah(incomeData.cogs.totalHPP)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Laba Kotor */}
              <div className="p-3 rounded-xl bg-surface-100 flex justify-between items-center font-bold text-sm text-surface-900">
                <span>LABA KOTOR (GROSS PROFIT)</span>
                <span className="font-mono text-primary-700">
                  {formatRupiah(incomeData.grossProfit)}
                </span>
              </div>

              {/* 3. Beban Operasional */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-surface-700 bg-surface-100 p-2 rounded-lg">
                  3. Beban Operasional & Administrasi
                </h4>
                <div className="pl-4 pr-2 space-y-1.5 text-xs">
                  {incomeData.operatingExpenses.items.length === 0 ? (
                    <p className="text-surface-400 italic py-1">Tidak ada beban operasional tercatat.</p>
                  ) : (
                    incomeData.operatingExpenses.items.map((it) => (
                      <div key={it.code} className="flex justify-between py-1 border-b border-surface-50">
                        <span>{it.code} - {it.name}</span>
                        <span className="font-mono font-medium">{formatRupiah(it.amount)}</span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between pt-2 font-bold text-surface-900">
                    <span>Total Beban Operasional</span>
                    <span className="font-mono text-rose-600">
                      {formatRupiah(incomeData.operatingExpenses.totalExpenses)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Laba Bersih */}
              <div className="p-4 rounded-xl bg-primary-600 text-white flex justify-between items-center font-bold text-base shadow-sm">
                <span>LABA BERSIH (NET PROFIT)</span>
                <span className="font-mono text-lg font-extrabold">
                  {formatRupiah(incomeData.netProfit)}
                </span>
              </div>

              {/* Rincian Kontribusi per Unit Usaha (Konsolidasi Multi-Usaha) */}
              {incomeData.isConsolidated && incomeData.businessBreakdown && incomeData.businessBreakdown.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-surface-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-surface-800 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-primary-600" />
                      Rincian Kontribusi Laba Rugi per Unit Usaha
                    </h4>
                    <span className="text-[11px] text-surface-500 font-medium">
                      {incomeData.businessBreakdown.length} Unit Usaha Beroperasi
                    </span>
                  </div>
                  <div className="border border-surface-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="table text-xs">
                      <thead className="bg-surface-100 text-surface-700">
                        <tr>
                          <th>Unit Usaha</th>
                          <th className="text-right">Pendapatan Bersih</th>
                          <th className="text-right">Beban Pokok (HPP)</th>
                          <th className="text-right">Beban Operasional</th>
                          <th className="text-right">Laba Bersih</th>
                          <th className="text-center">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incomeData.businessBreakdown.map((b) => {
                          const margin = b.netRevenue > 0 ? (b.netProfit / b.netRevenue) * 100 : 0;
                          return (
                            <tr key={b.businessId} className="hover:bg-surface-50/80 transition-colors">
                              <td className="font-semibold text-surface-900">
                                <div>{b.businessName}</div>
                                <span className="text-[10px] text-surface-400 font-mono">{b.businessCode}</span>
                              </td>
                              <td className="text-right font-mono font-medium text-emerald-700">
                                {formatRupiah(b.netRevenue)}
                              </td>
                              <td className="text-right font-mono text-surface-600">
                                {formatRupiah(b.cogs)}
                              </td>
                              <td className="text-right font-mono text-surface-600">
                                {formatRupiah(b.operatingExpenses)}
                              </td>
                              <td className={`text-right font-mono font-bold ${
                                b.netProfit >= 0 ? 'text-primary-700' : 'text-rose-600'
                              }`}>
                                {formatRupiah(b.netProfit)}
                              </td>
                              <td className="text-center font-mono text-[11px]">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  margin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {b.netRevenue !== 0 ? `${margin.toFixed(1)}%` : '-'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-surface-100/70 font-bold border-t-2 border-surface-200 text-surface-900">
                          <td>TOTAL KONSOLIDASI</td>
                          <td className="text-right font-mono text-emerald-700">
                            {formatRupiah(incomeData.revenues.netRevenue)}
                          </td>
                          <td className="text-right font-mono">
                            {formatRupiah(incomeData.cogs.totalHPP)}
                          </td>
                          <td className="text-right font-mono">
                            {formatRupiah(incomeData.operatingExpenses.totalExpenses)}
                          </td>
                          <td className={`text-right font-mono ${
                            incomeData.netProfit >= 0 ? 'text-primary-700' : 'text-rose-600'
                          }`}>
                            {formatRupiah(incomeData.netProfit)}
                          </td>
                          <td className="text-center font-mono">
                            {incomeData.revenues.netRevenue > 0
                              ? `${((incomeData.netProfit / incomeData.revenues.netRevenue) * 100).toFixed(1)}%`
                              : '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 2: LAPORAN NERACA (BALANCE SHEET) */}
      {activeTab === 'balance' && (
        <div className="space-y-6">
          {isLoadingBalance ? (
            <div className="card p-12 text-center text-surface-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-600" />
              Menghitung saldo neraca...
            </div>
          ) : balanceData ? (
            <div className="card p-6 md:p-8 space-y-6 print:shadow-none print:border-none">
              {/* Header */}
              <div className="text-center pb-4 border-b border-surface-200">
                <div className="flex justify-center mb-1.5">
                  {balanceData.isConsolidated ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-50 text-primary-700 border border-primary-200 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      LAPORAN KONSOLIDASI SELURUH UNIT USAHA (ROBIN GROUP)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-100 text-surface-700 border border-surface-200">
                      LAPORAN UNIT USAHA TUNGGAL
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-surface-900 uppercase">
                  {balanceData.businessName}
                </h2>
                <h3 className="text-base font-semibold text-primary-600 mt-0.5">
                  Laporan Neraca Keuangan (Balance Sheet)
                </h3>
                <p className="text-xs text-surface-500 mt-1">
                  Per Tanggal: {formatTanggal(balanceData.asOfDate)}
                </p>
              </div>

              {/* Status Keseimbangan Neraca */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                  balanceData.isBalanced
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {balanceData.isBalanced ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                  )}
                  <span className="font-bold">
                    {balanceData.isBalanced
                      ? 'PERSAMAAN AKUNTANSI SEIMBANG (ASET = KEWAJIBAN + EKUITAS)'
                      : 'NERACA TIDAK SEIMBANG'}
                  </span>
                </div>
                <div className="flex gap-4">
                  <span>Aset: {formatRupiah(balanceData.assets.totalAssets)}</span>
                  <span>Kewajiban & Ekuitas: {formatRupiah(balanceData.totalLiabilitiesAndEquity)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* SISI KIRI: ASET */}
                <div className="space-y-4">
                  <div className="bg-sky-50 p-2.5 rounded-lg border border-sky-100 font-bold text-xs text-sky-900 uppercase">
                    ASET (AKTIVA)
                  </div>

                  {/* Aset Lancar */}
                  <div className="space-y-1.5 text-xs">
                    <p className="font-bold text-surface-700">Aset Lancar</p>
                    {balanceData.assets.currentAssets.items.map((it) => (
                      <div key={it.code} className="flex justify-between py-1 border-b border-surface-50 pl-2">
                        <span>{it.code} - {it.name}</span>
                        <span className="font-mono">{formatRupiah(it.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1 font-bold text-surface-800 pl-2">
                      <span>Total Aset Lancar</span>
                      <span className="font-mono">{formatRupiah(balanceData.assets.currentAssets.total)}</span>
                    </div>
                  </div>

                  {/* Aset Tetap */}
                  <div className="space-y-1.5 text-xs pt-2">
                    <p className="font-bold text-surface-700">Aset Tetap & Tidak Lancar</p>
                    {balanceData.assets.fixedAssets.items.map((it) => (
                      <div key={it.code} className="flex justify-between py-1 border-b border-surface-50 pl-2">
                        <span>{it.code} - {it.name}</span>
                        <span className="font-mono">{formatRupiah(it.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1 font-bold text-surface-800 pl-2">
                      <span>Total Aset Tetap</span>
                      <span className="font-mono">{formatRupiah(balanceData.assets.fixedAssets.total)}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-sky-100 flex justify-between items-center font-bold text-sm text-sky-950">
                    <span>TOTAL ASET</span>
                    <span className="font-mono">{formatRupiah(balanceData.assets.totalAssets)}</span>
                  </div>
                </div>

                {/* SISI KANAN: KEWAJIBAN & EKUITAS */}
                <div className="space-y-4">
                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 font-bold text-xs text-amber-900 uppercase">
                    KEWAJIBAN & EKUITAS (PASIVA)
                  </div>

                  {/* Kewajiban */}
                  <div className="space-y-1.5 text-xs">
                    <p className="font-bold text-surface-700">Kewajiban / Hutang</p>
                    {balanceData.liabilities.currentLiabilities.items.map((it) => (
                      <div key={it.code} className="flex justify-between py-1 border-b border-surface-50 pl-2">
                        <span>{it.code} - {it.name}</span>
                        <span className="font-mono">{formatRupiah(it.amount)}</span>
                      </div>
                    ))}
                    {balanceData.liabilities.longTermLiabilities.items.map((it) => (
                      <div key={it.code} className="flex justify-between py-1 border-b border-surface-50 pl-2">
                        <span>{it.code} - {it.name}</span>
                        <span className="font-mono">{formatRupiah(it.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1 font-bold text-surface-800 pl-2">
                      <span>Total Kewajiban</span>
                      <span className="font-mono">{formatRupiah(balanceData.liabilities.totalLiabilities)}</span>
                    </div>
                  </div>

                  {/* Ekuitas */}
                  <div className="space-y-1.5 text-xs pt-2">
                    <p className="font-bold text-surface-700">Ekuitas (Modal Pemilik)</p>
                    {balanceData.equity.items.map((it) => (
                      <div key={it.code} className="flex justify-between py-1 border-b border-surface-50 pl-2">
                        <span>{it.code} - {it.name}</span>
                        <span className="font-mono">{formatRupiah(it.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1 border-b border-surface-50 pl-2 text-primary-700 font-semibold">
                      <span>Laba Periode Berjalan</span>
                      <span className="font-mono">{formatRupiah(balanceData.equity.currentPeriodEarnings)}</span>
                    </div>
                    <div className="flex justify-between pt-1 font-bold text-surface-800 pl-2">
                      <span>Total Ekuitas</span>
                      <span className="font-mono">{formatRupiah(balanceData.equity.totalEquity)}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-100 flex justify-between items-center font-bold text-sm text-amber-950">
                    <span>TOTAL KEWAJIBAN & EKUITAS</span>
                    <span className="font-mono">{formatRupiah(balanceData.totalLiabilitiesAndEquity)}</span>
                  </div>
                </div>
              </div>

              {/* Rincian Posisi Keuangan per Unit Usaha (Konsolidasi Multi-Usaha) */}
              {balanceData.isConsolidated && balanceData.businessBreakdown && balanceData.businessBreakdown.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-surface-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-surface-800 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-primary-600" />
                      Rincian Neraca Keuangan per Unit Usaha
                    </h4>
                    <span className="text-[11px] text-surface-500 font-medium">
                      {balanceData.businessBreakdown.length} Unit Usaha Terdaftar
                    </span>
                  </div>
                  <div className="border border-surface-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="table text-xs">
                      <thead className="bg-surface-100 text-surface-700">
                        <tr>
                          <th>Unit Usaha</th>
                          <th className="text-right">Aset Lancar</th>
                          <th className="text-right">Aset Tetap</th>
                          <th className="text-right">Total Aset</th>
                          <th className="text-right">Total Kewajiban</th>
                          <th className="text-right">Total Ekuitas</th>
                          <th className="text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {balanceData.businessBreakdown.map((b) => (
                          <tr key={b.businessId} className="hover:bg-surface-50/80 transition-colors">
                            <td className="font-semibold text-surface-900">
                              <div>{b.businessName}</div>
                              <span className="text-[10px] text-surface-400 font-mono">{b.businessCode}</span>
                            </td>
                            <td className="text-right font-mono text-surface-600">
                              {formatRupiah(b.currentAssets)}
                            </td>
                            <td className="text-right font-mono text-surface-600">
                              {formatRupiah(b.fixedAssets)}
                            </td>
                            <td className="text-right font-mono font-bold text-sky-800">
                              {formatRupiah(b.totalAssets)}
                            </td>
                            <td className="text-right font-mono text-surface-600">
                              {formatRupiah(b.totalLiabilities)}
                            </td>
                            <td className="text-right font-mono font-medium text-surface-900">
                              {formatRupiah(b.totalEquity)}
                            </td>
                            <td className="text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                b.isBalanced ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {b.isBalanced ? 'SEIMBANG' : 'SELISIH'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-surface-100/70 font-bold border-t-2 border-surface-200 text-surface-900">
                          <td>TOTAL KONSOLIDASI</td>
                          <td className="text-right font-mono">
                            {formatRupiah(balanceData.assets.currentAssets.total)}
                          </td>
                          <td className="text-right font-mono">
                            {formatRupiah(balanceData.assets.fixedAssets.total)}
                          </td>
                          <td className="text-right font-mono text-sky-800">
                            {formatRupiah(balanceData.assets.totalAssets)}
                          </td>
                          <td className="text-right font-mono">
                            {formatRupiah(balanceData.liabilities.totalLiabilities)}
                          </td>
                          <td className="text-right font-mono">
                            {formatRupiah(balanceData.equity.totalEquity)}
                          </td>
                          <td className="text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                              SEIMBANG
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 3: LAPORAN ARUS KAS */}
      {activeTab === 'cashflow' && (
        <div className="space-y-6">
          {isLoadingCashFlow ? (
            <div className="card p-12 text-center text-surface-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-600" />
              Menghitung arus kas...
            </div>
          ) : cashFlowData ? (
            <div className="card p-6 md:p-8 space-y-6">
              {/* Header Arus Kas */}
              <div className="text-center pb-4 border-b border-surface-200">
                <div className="flex justify-center mb-1.5">
                  {cashFlowData.isConsolidated ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-50 text-primary-700 border border-primary-200 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      LAPORAN KONSOLIDASI SELURUH UNIT USAHA (ROBIN GROUP)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-100 text-surface-700 border border-surface-200">
                      LAPORAN UNIT USAHA TUNGGAL
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-surface-900 uppercase">
                  {cashFlowData.businessName || 'Robin Group'}
                </h2>
                <h3 className="text-base font-semibold text-primary-600 mt-0.5">
                  Laporan Arus Kas (Cash Flow)
                </h3>
                <p className="text-xs text-surface-500 mt-1">
                  Periode:{' '}
                  {cashFlowData.period.startDate ? formatTanggal(cashFlowData.period.startDate) : 'Awal Pembukuan'}{' '}
                  s/d{' '}
                  {cashFlowData.period.endDate ? formatTanggal(cashFlowData.period.endDate) : 'Saat Ini'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-xs font-semibold text-emerald-800">Total Kas Masuk</p>
                  <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
                    {formatRupiah(cashFlowData.totalInflow)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
                  <p className="text-xs font-semibold text-rose-800">Total Kas Keluar</p>
                  <p className="text-xl font-bold font-mono text-rose-700 mt-1">
                    {formatRupiah(cashFlowData.totalOutflow)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-primary-50 border border-primary-100">
                  <p className="text-xs font-semibold text-primary-800">Arus Kas Bersih</p>
                  <p className="text-xl font-bold font-mono text-primary-700 mt-1">
                    {formatRupiah(cashFlowData.netCashFlow)}
                  </p>
                </div>
              </div>

              {/* Rincian Arus Kas per Unit Usaha (Konsolidasi Multi-Usaha) */}
              {cashFlowData.isConsolidated && cashFlowData.businessBreakdown && cashFlowData.businessBreakdown.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-surface-800 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-primary-600" />
                      Rincian Arus Kas per Unit Usaha
                    </h4>
                    <span className="text-[11px] text-surface-500 font-medium">
                      {cashFlowData.businessBreakdown.length} Unit Usaha Terdaftar
                    </span>
                  </div>
                  <div className="border border-surface-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="table text-xs">
                      <thead className="bg-surface-100 text-surface-700">
                        <tr>
                          <th>Unit Usaha</th>
                          <th className="text-right">Total Kas Masuk (Inflow)</th>
                          <th className="text-right">Total Kas Keluar (Outflow)</th>
                          <th className="text-right">Arus Kas Bersih</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashFlowData.businessBreakdown.map((b) => (
                          <tr key={b.businessId} className="hover:bg-surface-50/80 transition-colors">
                            <td className="font-semibold text-surface-900">
                              <div>{b.businessName}</div>
                              <span className="text-[10px] text-surface-400 font-mono">{b.businessCode}</span>
                            </td>
                            <td className="text-right font-mono font-medium text-emerald-700">
                              {formatRupiah(b.totalInflow)}
                            </td>
                            <td className="text-right font-mono text-rose-600">
                              {formatRupiah(b.totalOutflow)}
                            </td>
                            <td className={`text-right font-mono font-bold ${
                              b.netCashFlow >= 0 ? 'text-primary-700' : 'text-rose-600'
                            }`}>
                              {formatRupiah(b.netCashFlow)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-surface-100/70 font-bold border-t-2 border-surface-200 text-surface-900">
                          <td>TOTAL KONSOLIDASI</td>
                          <td className="text-right font-mono text-emerald-700">
                            {formatRupiah(cashFlowData.totalInflow)}
                          </td>
                          <td className="text-right font-mono text-rose-600">
                            {formatRupiah(cashFlowData.totalOutflow)}
                          </td>
                          <td className={`text-right font-mono ${
                            cashFlowData.netCashFlow >= 0 ? 'text-primary-700' : 'text-rose-600'
                          }`}>
                            {formatRupiah(cashFlowData.netCashFlow)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Inflow & Outflow History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-xs text-surface-800 uppercase mb-3 flex items-center gap-1.5 text-emerald-700">
                    <ArrowDownRight className="w-4 h-4" /> Rincian Penerimaan Kas
                  </h4>
                  <div className="border border-surface-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                    <table className="table text-xs">
                      <tbody>
                        {cashFlowData.inflows.map((i, idx) => (
                          <tr key={idx}>
                            <td>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-surface-900">{i.nomorBukti}</span>
                                {i.businessName && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-surface-100 text-surface-600 border border-surface-200">
                                    {i.businessName}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-surface-400">{i.notes}</p>
                            </td>
                            <td className="text-right font-mono font-bold text-emerald-600">
                              {formatRupiah(i.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-surface-800 uppercase mb-3 flex items-center gap-1.5 text-rose-700">
                    <ArrowUpRight className="w-4 h-4" /> Rincian Pengeluaran Kas
                  </h4>
                  <div className="border border-surface-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                    <table className="table text-xs">
                      <tbody>
                        {cashFlowData.outflows.map((o, idx) => (
                          <tr key={idx}>
                            <td>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-surface-900">{o.nomorBukti}</span>
                                {o.businessName && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-surface-100 text-surface-600 border border-surface-200">
                                    {o.businessName}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-surface-400">{o.notes}</p>
                            </td>
                            <td className="text-right font-mono font-bold text-rose-600">
                              {formatRupiah(o.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 4: BACKUP BASIS DATA & UTILITAS */}
      {activeTab === 'backup' && isSuperAdmin && (
        <div className="space-y-6">
          <div className="card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-surface-900 to-primary-950 text-white">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Database className="w-5 h-5 text-primary-400" />
                Cadangkan Basis Data Lokal (Database Backup)
              </h2>
              <p className="text-surface-300 text-xs mt-1 max-w-xl">
                Buat salinan data transaksi, jurnal, stok, dan akun ke dalam file SQL dump offline
                agar data keuangan aman dari kerusakan komputer server.
              </p>
            </div>
            <button
              onClick={() => backupMutation.mutate()}
              disabled={backupMutation.isPending}
              className="btn-primary shrink-0 flex items-center gap-2 text-xs py-2.5 px-4"
            >
              {backupMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Buat Cadangan Baru
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-surface-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-surface-900">Berkas Cadangan Tersimpan</h3>
              <span className="text-xs text-surface-400">{backupList?.length || 0} file tersedia</span>
            </div>

            <div className="table-container">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th>Nama Berkas (.sql)</th>
                    <th>Waktu Cadangan</th>
                    <th>Ukuran Berkas</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingBackups ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-surface-400">
                        Memuat riwayat cadangan...
                      </td>
                    </tr>
                  ) : backupList && backupList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-surface-400">
                        Belum ada berkas cadangan database yang dibuat.
                      </td>
                    </tr>
                  ) : (
                    backupList?.map((b) => (
                      <tr key={b.filename} className="hover:bg-surface-50 transition-colors">
                        <td className="font-mono font-bold text-primary-700">{b.filename}</td>
                        <td>{formatTanggalJam(b.createdAt)}</td>
                        <td className="font-mono">{b.sizeReadable}</td>
                        <td className="text-right">
                          <a
                            href={`/api/backup/download/${b.filename}`}
                            download={b.filename}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 text-surface-700 font-medium transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" /> Unduh SQL
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsPage;
