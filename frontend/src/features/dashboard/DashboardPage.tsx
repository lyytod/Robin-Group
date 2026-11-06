import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowRight,
  Building2,
  RefreshCw,
  ShoppingBag,
  FileSpreadsheet,
  Receipt,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  Wrench,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { formatRupiah, formatTanggalJam } from '../../utils/formatters';
import type { ApiResponse } from '../../types/index';

interface DashboardData {
  kpi: {
    revenue: number;
    expenses: number;
    netProfit: number;
    grossProfit: number;
    totalProducts: number;
    damagedInventoryCount: number;
  };
  businessComparison: {
    id: number;
    name: string;
    code: string;
    revenue: number;
    expense: number;
    netProfit: number;
  }[];
  salesTrend: {
    date: string;
    revenue: number;
    transactions: number;
  }[];
  damagedInventoryItems: {
    id: number;
    code: string;
    name: string;
    category: string;
    unit: string;
    quantity: number;
    condition: 'RUSAK_RINGAN' | 'RUSAK_BERAT';
    storageLocation: string;
    unitPrice: number;
    businessName: string;
  }[];
  recentTransactions: {
    id: number;
    nomorBukti: string;
    type: 'PEMASUKAN' | 'PENGELUARAN';
    grandTotal: number;
    paymentMethod: string;
    date: string;
    businessName: string;
    cashier: string;
  }[];
}

// Custom tooltip Recharts untuk grafik tren penjualan
const CustomSalesTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-900 border border-surface-700 p-3 rounded-xl shadow-xl text-white text-xs">
        <p className="font-semibold text-surface-300 mb-1">{label}</p>
        <p className="font-mono text-primary-300 font-bold">
          Penjualan: {formatRupiah(payload[0].value)}
        </p>
        {payload[0].payload?.transactions !== undefined && (
          <p className="text-surface-400 text-[11px] mt-0.5">
            Total Transaksi: {payload[0].payload.transactions} transaksi
          </p>
        )}
      </div>
    );
  }
  return null;
};

// Custom tooltip Recharts untuk grafik perbandingan unit usaha
const CustomComparisonTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-900 border border-surface-700 p-3 rounded-xl shadow-xl text-white text-xs space-y-1">
        <p className="font-bold text-surface-200 border-b border-surface-700 pb-1 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex justify-between gap-4 font-mono text-[11px]">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-semibold">{formatRupiah(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function DashboardPage() {
  const { user, activeBusiness } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [isConsolidated, setIsConsolidated] = useState<boolean>(false);

  const { data: dashboard, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-summary', isConsolidated ? 'consolidated' : activeBusiness?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (isConsolidated) {
        params.append('consolidated', 'true');
      } else if (activeBusiness?.id) {
        params.append('businessId', activeBusiness.id.toString());
      }
      const res = await apiClient.get<ApiResponse<DashboardData>>(
        `/reports/dashboard?${params.toString()}`,
        {
          headers: isConsolidated
            ? { 'x-consolidated': 'true' }
            : activeBusiness?.id
            ? { 'x-business-id': activeBusiness.id.toString() }
            : {},
        }
      );
      return res.data.data;
    },
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Cakupan Usaha Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-900">
              Dashboard Keuangan
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200">
              Local-First Offline
            </span>
          </div>
          <p className="text-surface-500 text-sm mt-1">
            Selamat datang, <span className="font-semibold text-surface-800">{user?.fullName}</span>.
            {isConsolidated
              ? ' Anda sedang melihat konsolidasi seluruh grup usaha.'
              : ` Menampilkan analitik untuk unit usaha ${activeBusiness?.name || 'ini'}.`}
          </p>
        </div>

        {/* Action Bar: Scope Selector & Refresh */}
        <div className="flex items-center gap-2.5">
          {isSuperAdmin && (
            <div className="inline-flex rounded-xl p-1 bg-surface-100 border border-surface-200">
              <button
                onClick={() => setIsConsolidated(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  !isConsolidated
                    ? 'bg-white text-primary-700 shadow-xs'
                    : 'text-surface-600 hover:text-surface-900'
                }`}
              >
                {activeBusiness?.name || 'Unit Usaha Ini'}
              </button>
              <button
                onClick={() => setIsConsolidated(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isConsolidated
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-surface-600 hover:text-surface-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Konsolidasi Robin Group
              </button>
            </div>
          )}

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary text-xs p-2.5 rounded-xl text-surface-600 hover:text-surface-900"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-primary-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Banner Notifikasi Konsolidasi Robin Group */}
      {isConsolidated && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-surface-900 via-primary-950 to-surface-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-primary-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600/30 border border-primary-500/30 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="font-bold text-xs uppercase tracking-wider text-primary-300">
                Mode Analitik Konsolidasi Robin Group (Semua Unit Usaha)
              </p>
              <p className="text-xs text-surface-300 mt-0.5">
                Menampilkan akumulasi seluruh metrik, omset penjualan, beban, laba bersih, dan inventaris dari seluruh cabang unit usaha aktif.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-primary-600 text-white shrink-0 shadow-xs self-start sm:self-auto">
            {dashboard?.businessComparison?.length || 0} Unit Usaha Terkonsolidasi
          </span>
        </div>
      )}

      {/* KPI Highlights Bar */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="h-4 bg-surface-200 rounded w-1/2"></div>
              <div className="h-8 bg-surface-200 rounded w-3/4"></div>
              <div className="h-3 bg-surface-100 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : dashboard ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Pendapatan */}
          <div className="card p-5 relative overflow-hidden group hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                Total Pendapatan (30H)
              </p>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono text-emerald-600 mt-2">
              {formatRupiah(dashboard.kpi.revenue)}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-surface-400">
              <span className="text-emerald-600 font-semibold flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> Bersih
              </span>
              <span>setelah potongan retur/diskon</span>
            </div>
          </div>

          {/* Card 2: Pengeluaran & HPP */}
          <div className="card p-5 relative overflow-hidden group hover:border-rose-300 transition-all">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                Total Beban & HPP (30H)
              </p>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono text-rose-600 mt-2">
              {formatRupiah(dashboard.kpi.expenses)}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-surface-400">
              <span>Beban operasional + Harga Pokok</span>
            </div>
          </div>

          {/* Card 3: Laba Bersih */}
          <div className="card p-5 relative overflow-hidden group hover:border-primary-300 transition-all bg-gradient-to-br from-white to-primary-50/40">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-primary-800 uppercase tracking-wider">
                Laba Bersih (Net Profit)
              </p>
              <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p
              className={`text-2xl font-bold font-mono mt-2 ${
                dashboard.kpi.netProfit >= 0 ? 'text-primary-700' : 'text-rose-600'
              }`}
            >
              {formatRupiah(dashboard.kpi.netProfit)}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-surface-500">
              <span>Laba kotor: {formatRupiah(dashboard.kpi.grossProfit)}</span>
            </div>
          </div>

          {/* Card 4: Peringatan Kondisi Inventaris & Stok */}
          <div className="card p-5 relative overflow-hidden group hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                Inventaris & Stok Rusak
              </p>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  dashboard.kpi.damagedInventoryCount > 0
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <p
                className={`text-2xl font-bold font-mono ${
                  dashboard.kpi.damagedInventoryCount > 0 ? 'text-rose-600' : 'text-surface-900'
                }`}
              >
                {dashboard.kpi.damagedInventoryCount}
              </p>
              <span className="text-xs text-surface-500">Item barang</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px]">
              {dashboard.kpi.damagedInventoryCount > 0 ? (
                <span className="text-rose-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  Barang rusak ringan / berat
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Seluruh inventaris kondisi baik
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Tren Penjualan 7 Hari Terakhir (Span 2 cols) */}
        <div className="card p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-surface-900 text-base">
                Tren Penjualan 7 Hari Terakhir
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                Akumulasi penerimaan transaksi kasir harian
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-surface-100 text-surface-600 font-medium">
              7 Hari Terakhir
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {dashboard?.salesTrend && dashboard.salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dashboard.salesTrend}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
                      return val;
                    }}
                  />
                  <Tooltip content={<CustomSalesTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Penjualan"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-surface-400 text-xs">
                Belum ada data transaksi pada rentang 7 hari terakhir.
              </div>
            )}
          </div>
        </div>

        {/* Quick Action Shortcuts Panel */}
        <div className="card p-6 flex flex-col justify-between space-y-4 bg-gradient-to-br from-surface-900 to-primary-950 text-white">
          <div>
            <div className="flex items-center gap-2 text-primary-400 mb-2">
              <Sparkles className="w-5 h-5" />
              <h2 className="font-bold text-white text-base">Aksi Cepat Sistem</h2>
            </div>
            <p className="text-surface-300 text-xs leading-relaxed">
              Navigasi langsung ke modul operasional harian kasir, pencatatan jurnal akuntansi, dan stok barang.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Link
              to="/pos"
              className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Buka Kasir POS</p>
                  <p className="text-[10px] text-surface-300">Transaksi penjualan & cetak struk</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/inventory"
              className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Kelola Produk & Stok</p>
                  <p className="text-[10px] text-surface-300">Penyesuaian stok & harga jual</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/accounting"
              className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Jurnal & Buku Besar</p>
                  <p className="text-[10px] text-surface-300">Double-entry & bagan akun (CoA)</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/reports"
              className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-500/20 text-primary-300 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Laporan Keuangan</p>
                  <p className="text-[10px] text-surface-300">Laba Rugi, Neraca, & Ekspor Excel</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Chart 2: Perbandingan Unit Usaha (Konsolidasi Multi-Tenancy) */}
      {isSuperAdmin && dashboard?.businessComparison && dashboard.businessComparison.length > 0 && (
        <div className="card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-bold text-surface-900 text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary-600" />
                Perbandingan Omset & Laba Antar Unit Usaha (Konsolidasi)
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                Monitoring performa pendapatan dan laba bersih per unit bisnis (30 hari terakhir)
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboard.businessComparison}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
                    return val;
                  }}
                />
                <Tooltip content={<CustomComparisonTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  iconType="circle"
                />
                <Bar dataKey="revenue" name="Pendapatan" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Beban & HPP" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="netProfit" name="Laba Bersih" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabel Rincian Angka Konsolidasi per Unit Usaha */}
          <div className="pt-2 border-t border-surface-200">
            <div className="table-container">
              <table className="table text-xs">
                <thead>
                  <tr className="bg-surface-50 text-surface-600">
                    <th>Unit Usaha</th>
                    <th className="text-right">Pendapatan</th>
                    <th className="text-right">Beban & HPP</th>
                    <th className="text-right">Laba Bersih</th>
                    <th className="text-center">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.businessComparison.map((b) => {
                    const margin = b.revenue > 0 ? (b.netProfit / b.revenue) * 100 : 0;
                    return (
                      <tr key={b.id} className="hover:bg-surface-50/80 transition-colors">
                        <td className="font-semibold text-surface-900">
                          {b.name} <span className="text-[10px] text-surface-400 font-mono">({b.code})</span>
                        </td>
                        <td className="text-right font-mono font-medium text-emerald-700">
                          {formatRupiah(b.revenue)}
                        </td>
                        <td className="text-right font-mono text-rose-600">
                          {formatRupiah(b.expense)}
                        </td>
                        <td className={`text-right font-mono font-bold ${b.netProfit >= 0 ? 'text-primary-700' : 'text-rose-600'}`}>
                          {formatRupiah(b.netProfit)}
                        </td>
                        <td className="text-center font-mono">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${margin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {b.revenue > 0 ? `${margin.toFixed(1)}%` : '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-surface-100/80 font-bold border-t-2 border-surface-200 text-surface-900">
                    <td>TOTAL KONSOLIDASI</td>
                    <td className="text-right font-mono text-emerald-700">
                      {formatRupiah(dashboard.businessComparison.reduce((s, b) => s + b.revenue, 0))}
                    </td>
                    <td className="text-right font-mono text-rose-600">
                      {formatRupiah(dashboard.businessComparison.reduce((s, b) => s + b.expense, 0))}
                    </td>
                    <td className={`text-right font-mono ${dashboard.businessComparison.reduce((s, b) => s + b.netProfit, 0) >= 0 ? 'text-primary-700' : 'text-rose-600'}`}>
                      {formatRupiah(dashboard.businessComparison.reduce((s, b) => s + b.netProfit, 0))}
                    </td>
                    <td className="text-center font-mono text-[11px]">
                      {dashboard.businessComparison.reduce((s, b) => s + b.revenue, 0) > 0
                        ? `${((dashboard.businessComparison.reduce((s, b) => s + b.netProfit, 0) / dashboard.businessComparison.reduce((s, b) => s + b.revenue, 0)) * 100).toFixed(1)}%`
                        : '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Section: Low Stock Warnings & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peringatan Inventaris & Stok Rusak */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-surface-100 flex items-center justify-between bg-surface-50">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-rose-500" />
              <h3 className="font-bold text-sm text-surface-900">
                Peringatan Inventaris Rusak (Ringan / Berat)
              </h3>
            </div>
            <Link
              to="/inventory"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              Kelola Inventaris <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="table-container">
            <table className="table text-xs">
              <thead>
                <tr>
                  <th>Barang & Kode</th>
                  <th>Unit Usaha</th>
                  <th>Kondisi Fisik</th>
                  <th className="text-right">Jumlah / Lokasi</th>
                </tr>
              </thead>
              <tbody>
                {!dashboard?.damagedInventoryItems || dashboard.damagedInventoryItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-surface-400">
                      Seluruh barang inventaris & aset dalam kondisi baik. Tidak ada kerusakan.
                    </td>
                  </tr>
                ) : (
                  dashboard.damagedInventoryItems.map((item) => (
                    <tr key={item.id} className="hover:bg-rose-50/40 transition-colors">
                      <td>
                        <p className="font-bold text-surface-900">{item.name}</p>
                        <p className="font-mono text-[10px] text-surface-400">{item.code}</p>
                      </td>
                      <td className="text-surface-600">{item.businessName}</td>
                      <td>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.condition === 'RUSAK_BERAT'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {item.condition === 'RUSAK_BERAT' ? 'RUSAK BERAT' : 'RUSAK RINGAN'}
                        </span>
                      </td>
                      <td className="text-right font-mono font-bold text-surface-800">
                        {item.quantity} {item.unit}
                        <span className="block text-[10px] font-normal text-surface-400">
                          {item.storageLocation}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5 Transaksi Terakhir */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-surface-100 flex items-center justify-between bg-surface-50">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-600" />
              <h3 className="font-bold text-sm text-surface-900">
                Transaksi Kasir & Operasional Terkini
              </h3>
            </div>
            <Link
              to="/pos"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              Buka POS <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="table-container">
            <table className="table text-xs">
              <thead>
                <tr>
                  <th>No. Bukti / Waktu</th>
                  <th>Kasir / Unit</th>
                  <th>Jenis</th>
                  <th className="text-right">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {!dashboard?.recentTransactions || dashboard.recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-surface-400">
                      Belum ada riwayat transaksi kasir tercatat.
                    </td>
                  </tr>
                ) : (
                  dashboard.recentTransactions.map((trx) => (
                    <tr key={trx.id} className="hover:bg-surface-50 transition-colors">
                      <td>
                        <p className="font-mono font-bold text-primary-700">{trx.nomorBukti}</p>
                        <p className="text-[10px] text-surface-400">{formatTanggalJam(trx.date)}</p>
                      </td>
                      <td>
                        <p className="text-surface-800 font-medium">{trx.cashier}</p>
                        <p className="text-[10px] text-surface-400">{trx.businessName}</p>
                      </td>
                      <td>
                        <span
                          className={`badge text-[10px] ${
                            trx.type === 'PEMASUKAN' ? 'badge-success' : 'badge-danger'
                          }`}
                        >
                          {trx.type}
                        </span>
                      </td>
                      <td className="text-right font-mono font-bold text-surface-900">
                        {formatRupiah(trx.grandTotal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
