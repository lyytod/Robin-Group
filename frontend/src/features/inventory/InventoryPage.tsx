import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Trash2,
  History,
  X,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Coins,
  MapPin,
  Layers,
  Filter,
  CheckCircle2,
  BookOpen,
  ArrowDownUp,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { confirmDialog } from '../../store/confirmStore';
import {
  formatRupiah,
  formatTanggal,
  formatTanggalJam,
  formatTanggalISO,
  combineDateWithLocalTime,
} from '../../utils/formatters';
import toast from 'react-hot-toast';
import type { ApiResponse } from '../../types/index';

interface AccountOption {
  id: number;
  code: string;
  name: string;
  type: 'ASET' | 'KEWAJIBAN' | 'EKUITAS' | 'PENDAPATAN' | 'BEBAN';
}

interface InventoryItem {
  id: number;
  businessId: number;
  code: string;
  name: string;
  category: 'BAHAN_BAKU' | 'PERLENGKAPAN' | 'PERALATAN_ASET' | 'BARANG_DAGANGAN' | 'LAINNYA';
  unit: string;
  quantity: number;
  minimumStock: number;
  unitPrice: number;
  totalValue: number;
  storageLocation: string;
  condition: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT';
  itemDate: string;
  notes: string;
  isLowStock: boolean;
  account?: {
    id: number;
    code: string;
    name: string;
    type: string;
  } | null;
  lastMovement?: {
    type: string;
    quantity: number;
    date: string;
  } | null;
}

interface InventoryResponseData {
  items: InventoryItem[];
  stats: {
    totalItems: number;
    totalStockValue: number;
    lowStockCount: number;
    totalCategories: number;
    categoryCount?: number;
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface InventoryMovement {
  id: number;
  businessId: number;
  itemId: number;
  type: 'MASUK' | 'KELUAR' | 'OPNAME';
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  unitPrice?: number | null;
  reference?: string | null;
  notes?: string | null;
  movementDate: string;
  createdAt: string;
  journalEntry?: {
    id: number;
    nomorJurnal: string;
    totalDebit: number;
    totalKredit: number;
  } | null;
}

const CATEGORY_LABELS: Record<string, { label: string; badgeClass: string; defaultCode: string }> = {
  BAHAN_BAKU: {
    label: 'Bahan Baku',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    defaultCode: '1-1005',
  },
  PERLENGKAPAN: {
    label: 'Perlengkapan',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    defaultCode: '1-1006',
  },
  PERALATAN_ASET: {
    label: 'Peralatan & Aset',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    defaultCode: '1-2004',
  },
  BARANG_DAGANGAN: {
    label: 'Barang Dagangan',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    defaultCode: '1-1005',
  },
  LAINNYA: {
    label: 'Lainnya',
    badgeClass: 'bg-surface-100 text-surface-700 border-surface-200',
    defaultCode: '1-1005',
  },
};

const CONDITION_LABELS: Record<string, { label: string; dotClass: string }> = {
  BAIK: { label: 'Baik', dotClass: 'bg-emerald-500' },
  RUSAK_RINGAN: { label: 'Rusak Ringan', dotClass: 'bg-amber-500' },
  RUSAK_BERAT: { label: 'Rusak Berat', dotClass: 'bg-rose-500' },
};

export function InventoryPage() {
  const queryClient = useQueryClient();
  const { activeBusiness } = useAuthStore();

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [page, setPage] = useState(1);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedMovementItem, setSelectedMovementItem] = useState<InventoryItem | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  // Form states for Item Create/Edit
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<
    'BAHAN_BAKU' | 'PERLENGKAPAN' | 'PERALATAN_ASET' | 'BARANG_DAGANGAN' | 'LAINNYA'
  >('BAHAN_BAKU');
  const [unit, setUnit] = useState('PCS');
  const [quantity, setQuantity] = useState('0');
  const [minimumStock, setMinimumStock] = useState('5');
  const [unitPrice, setUnitPrice] = useState('0');
  const [storageLocation, setStorageLocation] = useState('');
  const [condition, setCondition] = useState<'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT'>('BAIK');
  const [itemDate, setItemDate] = useState(() => formatTanggalISO());
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState<string>('');
  const [offsetAccountId, setOffsetAccountId] = useState<string>('');

  // Form states for Movement (Mutasi Stok)
  const [movementType, setMovementType] = useState<'KELUAR' | 'MASUK' | 'OPNAME'>('KELUAR');
  const [movementQty, setMovementQty] = useState('');
  const [movementUnitPrice, setMovementUnitPrice] = useState('');
  const [movementOffsetAccountId, setMovementOffsetAccountId] = useState<string>('');
  const [movementRef, setMovementRef] = useState('');
  const [movementDate, setMovementDate] = useState(() => formatTanggalISO());
  const [movementNotes, setMovementNotes] = useState('');

  // Fetch Inventory List & Stats
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', activeBusiness?.id, search, selectedCategory, lowStockFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (lowStockFilter) params.append('lowStock', 'true');
      params.append('page', page.toString());
      params.append('limit', '50');

      const res = await apiClient.get<ApiResponse<InventoryResponseData>>(
        `/inventory?${params.toString()}`
      );
      return res.data.data;
    },
    enabled: !!activeBusiness?.id,
  });

  // Fetch Accounts (CoA) untuk integrasi buku akuntansi
  const { data: accountsList } = useQuery({
    queryKey: ['accounts', activeBusiness?.id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<AccountOption[]>>('/accounts');
      return res.data.data ?? [];
    },
    enabled: !!activeBusiness?.id,
  });

  // Fetch Movement History per Item
  const { data: movementsData, isLoading: isLoadingMovements } = useQuery({
    queryKey: ['inventory-movements', activeBusiness?.id, historyItem?.id],
    queryFn: async () => {
      if (!historyItem) return [];
      const res = await apiClient.get<ApiResponse<{ movements: InventoryMovement[] }>>(
        `/inventory/${historyItem.id}/movements?limit=100`
      );
      return res.data.data?.movements ?? [];
    },
    enabled: !!activeBusiness?.id && isHistoryModalOpen && !!historyItem,
  });

  const items = inventoryData?.items ?? [];
  const stats = inventoryData?.stats ?? {
    totalItems: 0,
    totalStockValue: 0,
    lowStockCount: 0,
    totalCategories: 0,
  };

  // Filter CoA accounts by type
  const assetAccounts = accountsList?.filter((a) => a.type === 'ASET') ?? [];
  const expenseAccounts = accountsList?.filter((a) => a.type === 'BEBAN') ?? [];
  const paymentAccounts =
    accountsList?.filter(
      (a) =>
        a.type === 'ASET' &&
        (a.code.startsWith('1-1001') || a.code.startsWith('1-1002') || a.code.startsWith('1-1003'))
    ) ?? [];
  const initialEquityAccounts =
    accountsList?.filter((a) => a.type === 'EKUITAS' || a.type === 'ASET') ?? [];

  // Open Create Modal
  const openCreateModal = () => {
    setEditingItem(null);
    setCode(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
    setName('');
    setCategory('BAHAN_BAKU');
    setUnit('PCS');
    setQuantity('0');
    setMinimumStock('5');
    setUnitPrice('0');
    setStorageLocation('');
    setCondition('BAIK');
    setItemDate(formatTanggalISO());
    setNotes('');

    // Pre-select default Asset CoA (1-1005 Persediaan)
    const def = assetAccounts.find((a) => a.code === '1-1005') || assetAccounts[0];
    setAccountId(def ? def.id.toString() : '');

    // Pre-select default Modal Awal (3-1001)
    const eq = accountsList?.find((a) => a.code === '3-1001') || initialEquityAccounts[0];
    setOffsetAccountId(eq ? eq.id.toString() : '');

    setIsItemModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setCode(item.code);
    setName(item.name);
    setCategory(item.category);
    setUnit(item.unit);
    setQuantity(item.quantity.toString());
    setMinimumStock(item.minimumStock.toString());
    setUnitPrice(item.unitPrice.toString());
    setStorageLocation(item.storageLocation === '-' ? '' : item.storageLocation);
    setCondition(item.condition);
    setItemDate(item.itemDate ? formatTanggalISO(item.itemDate) : formatTanggalISO());
    setNotes(item.notes || '');
    setAccountId(item.account?.id ? item.account.id.toString() : '');
    setIsItemModalOpen(true);
  };

  // Open Movement Modal
  const openMovementModal = (item: InventoryItem, defaultType: 'KELUAR' | 'MASUK' | 'OPNAME' = 'KELUAR') => {
    setSelectedMovementItem(item);
    setMovementType(defaultType);
    setMovementQty('');
    setMovementUnitPrice(item.unitPrice.toString());
    setMovementRef('');
    setMovementDate(formatTanggalISO());
    setMovementNotes('');

    // Pre-select default offset CoA
    if (defaultType === 'KELUAR') {
      let codeTarget = '5-1002';
      if (item.category === 'PERLENGKAPAN') codeTarget = '5-2006';
      else if (item.category === 'PERALATAN_ASET') codeTarget = '5-2007';
      const defExp = expenseAccounts.find((a) => a.code === codeTarget) || expenseAccounts[0];
      setMovementOffsetAccountId(defExp ? defExp.id.toString() : '');
    } else {
      const defPay = paymentAccounts.find((a) => a.code === '1-1001') || paymentAccounts[0];
      setMovementOffsetAccountId(defPay ? defPay.id.toString() : '');
    }

    setIsMovementModalOpen(true);
  };

  // Open History Modal
  const openHistoryModal = (item: InventoryItem) => {
    setHistoryItem(item);
    setIsHistoryModalOpen(true);
  };

  // Mutations
  const createItemMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/inventory', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Barang inventaris & jurnal pembuka berhasil dicatat!');
      setIsItemModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menyimpan barang inventaris.');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await apiClient.put<ApiResponse<any>>(`/inventory/${id}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Data inventaris berhasil diperbarui.');
      setIsItemModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui barang.');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete<ApiResponse<any>>(`/inventory/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Barang inventaris & jurnal terkait berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['all-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus barang.');
    },
  });

  const recordMovementMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/inventory/movement', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        data.message || 'Mutasi stok berhasil dicatat & diposting ke Jurnal Akuntansi!'
      );
      setIsMovementModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mencatat mutasi stok.');
    },
  });

  // Handle Form Item Submit
  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error('Kode dan nama barang wajib diisi!');
      return;
    }

    if (editingItem) {
      updateItemMutation.mutate({
        id: editingItem.id,
        payload: {
          code: code.trim(),
          name: name.trim(),
          category,
          unit: unit.trim().toUpperCase(),
          minimumStock: parseFloat(minimumStock) || 0,
          unitPrice: parseFloat(unitPrice) || 0,
          storageLocation: storageLocation.trim() || undefined,
          condition,
          itemDate: itemDate ? combineDateWithLocalTime(itemDate) : undefined,
          notes: notes.trim() || undefined,
          accountId: accountId ? parseInt(accountId, 10) : undefined,
        },
      });
    } else {
      createItemMutation.mutate({
        code: code.trim(),
        name: name.trim(),
        category,
        unit: unit.trim().toUpperCase(),
        quantity: parseFloat(quantity) || 0,
        minimumStock: parseFloat(minimumStock) || 0,
        unitPrice: parseFloat(unitPrice) || 0,
        storageLocation: storageLocation.trim() || undefined,
        condition,
        itemDate: itemDate ? combineDateWithLocalTime(itemDate) : undefined,
        notes: notes.trim() || undefined,
        accountId: accountId ? parseInt(accountId, 10) : undefined,
        offsetAccountId: offsetAccountId ? parseInt(offsetAccountId, 10) : undefined,
      });
    }
  };

  // Handle Form Movement Submit
  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovementItem || !movementQty) {
      toast.error('Kuantitas mutasi wajib diisi.');
      return;
    }

    const qtyNum = parseFloat(movementQty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      toast.error('Kuantitas mutasi harus berupa angka lebih besar dari 0.');
      return;
    }

    if (movementType === 'KELUAR' && qtyNum > selectedMovementItem.quantity) {
      toast.error(
        `Stok tidak mencukupi! Sisa stok fisik saat ini: ${selectedMovementItem.quantity} ${selectedMovementItem.unit}.`
      );
      return;
    }

    recordMovementMutation.mutate({
      itemId: selectedMovementItem.id,
      type: movementType,
      quantity: qtyNum,
      unitPrice: movementUnitPrice ? parseFloat(movementUnitPrice) : undefined,
      offsetAccountId: movementOffsetAccountId ? parseInt(movementOffsetAccountId, 10) : undefined,
      reference: movementRef.trim() || undefined,
      movementDate: movementDate ? combineDateWithLocalTime(movementDate) : undefined,
      notes: movementNotes.trim() || undefined,
    });
  };

  // Live stock calculation preview in movement modal
  const currentItemQty = selectedMovementItem ? selectedMovementItem.quantity : 0;
  const inputQtyNum = parseFloat(movementQty) || 0;
  const inputPriceNum = parseFloat(movementUnitPrice) || (selectedMovementItem?.unitPrice ?? 0);
  let previewStockAfter = currentItemQty;
  let previewStockDelta = 0;
  let isStockInsufficient = false;

  if (movementType === 'KELUAR') {
    previewStockAfter = currentItemQty - inputQtyNum;
    previewStockDelta = -inputQtyNum;
    if (inputQtyNum > currentItemQty) isStockInsufficient = true;
  } else if (movementType === 'MASUK') {
    previewStockAfter = currentItemQty + inputQtyNum;
    previewStockDelta = inputQtyNum;
  } else if (movementType === 'OPNAME') {
    previewStockAfter = inputQtyNum;
    previewStockDelta = inputQtyNum - currentItemQty;
  }

  const previewTotalFinansial = Math.abs(previewStockDelta) * inputPriceNum;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-primary-600" />
            Inventaris & Stok Fisik
          </h1>
          <p className="text-surface-500 text-sm mt-1">
            Pencatatan persediaan fisik gudang terintegrasi Buku Akuntansi (CoA) & Laporan Keuangan ({activeBusiness?.name || 'Pilih Unit'})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-add-inventory-item"
            onClick={openCreateModal}
            className="btn-primary text-sm flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Barang Inventaris
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Total Item Barang</p>
            <p className="text-2xl font-bold text-surface-900 mt-0.5">{stats.totalItems} Barang</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Total Nilai Aset Stok</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5 font-mono">
              {formatRupiah(stats.totalStockValue)}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Stok Fisik Menipis</p>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{stats.lowStockCount} Item</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Kategori Aktif</p>
            <p className="text-2xl font-bold text-purple-600 mt-0.5">{stats.totalCategories} Kategori</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari kode barang, nama barang, atau lokasi penyimpanan..."
            className="input pl-10 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Dropdown Filter */}
          <div className="flex items-center gap-1.5 bg-surface-50 border border-surface-200 rounded-xl px-3 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-surface-500" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="bg-transparent border-none text-surface-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="BAHAN_BAKU">Bahan Baku</option>
              <option value="PERLENGKAPAN">Perlengkapan</option>
              <option value="PERALATAN_ASET">Peralatan & Aset</option>
              <option value="BARANG_DAGANGAN">Barang Dagangan</option>
              <option value="LAINNYA">Lainnya</option>
            </select>
          </div>

          {/* Low Stock Toggle */}
          <button
            onClick={() => {
              setLowStockFilter(!lowStockFilter);
              setPage(1);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              lowStockFilter
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-surface-50 border-surface-200 text-surface-600 hover:bg-surface-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Stok Menipis
          </button>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Kode & Nama Barang</th>
                <th>Kategori & Kondisi</th>
                <th>Akun CoA (Buku Besar)</th>
                <th className="text-center">Jumlah Stok</th>
                <th className="text-right">Harga Satuan</th>
                <th className="text-right">Total Nilai Aset</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-xs text-surface-400">Memuat data inventaris fisik...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-surface-500 text-sm">
                    Belum ada barang inventaris yang terdaftar pada unit usaha ini.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const cat = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.LAINNYA;
                  const cond = CONDITION_LABELS[item.condition] || CONDITION_LABELS.BAIK;

                  return (
                    <tr key={item.id} className="hover:bg-surface-50/80 transition-colors">
                      {/* Code & Name */}
                      <td>
                        <div>
                          <p className="font-semibold text-surface-900 text-sm">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-surface-400 font-mono tracking-wide">
                              {item.code}
                            </span>
                            {item.storageLocation && item.storageLocation !== '-' && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-surface-500">
                                <MapPin className="w-2.5 h-2.5 text-surface-400" />
                                {item.storageLocation}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category & Condition */}
                      <td>
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${cat.badgeClass}`}
                          >
                            {cat.label}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-surface-600">
                            <span className={`w-2 h-2 rounded-full ${cond.dotClass}`} />
                            <span>{cond.label}</span>
                          </div>
                        </div>
                      </td>

                      {/* CoA Account */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                          <div>
                            {item.account ? (
                              <>
                                <p className="text-xs font-semibold text-surface-800 font-mono">
                                  {item.account.code}
                                </p>
                                <p className="text-[11px] text-surface-500 truncate max-w-[130px]">
                                  {item.account.name}
                                </p>
                              </>
                            ) : (
                              <span className="text-xs text-surface-400 italic">Akun Otomatis</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Quantity & Unit */}
                      <td className="text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.isLowStock
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {item.quantity} {item.unit}
                          {item.isLowStock && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                        </span>
                        <p className="text-[10px] text-surface-400 mt-0.5">
                          Min: {item.minimumStock} {item.unit}
                        </p>
                      </td>

                      {/* Unit Price */}
                      <td className="text-right text-xs font-mono text-surface-700">
                        {formatRupiah(item.unitPrice)}
                      </td>

                      {/* Total Value */}
                      <td className="text-right text-sm font-semibold font-mono text-surface-900">
                        {formatRupiah(item.totalValue)}
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openMovementModal(item, 'KELUAR')}
                            title="Mutasi Stok (Stok Keluar / Masuk / Opname)"
                            className="px-2 py-1 text-xs font-semibold rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 flex items-center gap-1 transition-colors"
                          >
                            <ArrowDownUp className="w-3.5 h-3.5" />
                            Mutasi
                          </button>
                          <button
                            onClick={() => openHistoryModal(item)}
                            title="Kartu Riwayat Mutasi Stok & Jurnal"
                            className="p-1.5 text-surface-500 hover:text-blue-600 hover:bg-surface-100 rounded-lg transition-colors"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit Data Barang"
                            className="p-1.5 text-surface-500 hover:text-amber-600 hover:bg-surface-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              const confirmed = await confirmDialog({
                                title: 'Hapus Barang Inventaris?',
                                message: `Apakah Anda yakin ingin menghapus inventaris "${item.name}"? Seluruh pencatatan pada Jurnal Umum (saldo awal & mutasi stok) terkait barang ini juga akan otomatis dihapus.`,
                                confirmText: 'Ya, Hapus Barang',
                                type: 'danger',
                                itemDetails: [
                                  { label: 'Kode Barang', value: item.code },
                                  { label: 'Nama Barang', value: item.name },
                                  { label: 'Kategori / Satuan', value: `${item.category} (${item.unit})` },
                                  { label: 'Sisa Stok Saat Ini', value: `${item.quantity} ${item.unit}` },
                                ],
                              });
                              if (confirmed) {
                                deleteItemMutation.mutate(item.id);
                              }
                            }}
                            title="Hapus Barang & Jurnal Terkait"
                            className="p-1.5 text-surface-500 hover:text-rose-600 hover:bg-surface-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Tambah / Edit Barang Inventaris */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="card w-full max-w-xl shadow-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-surface-200 flex items-center justify-between bg-surface-50/50">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-primary-600" />
                {editingItem ? 'Edit Data Inventaris' : 'Tambah Barang Inventaris Baru'}
              </h2>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="text-surface-400 hover:text-surface-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleItemSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Kode & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Kode Barang *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Contoh: BB-001, ASET-002"
                    className="input font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="label">Kategori Inventaris *</label>
                  <select
                    value={category}
                    onChange={(e: any) => {
                      const newCat = e.target.value;
                      setCategory(newCat);
                      // Update default CoA according to category
                      let codeTarget = '1-1005';
                      if (newCat === 'PERLENGKAPAN') codeTarget = '1-1006';
                      else if (newCat === 'PERALATAN_ASET') codeTarget = '1-2004';
                      const matchAcc = assetAccounts.find((a) => a.code === codeTarget);
                      if (matchAcc) setAccountId(matchAcc.id.toString());
                    }}
                    className="input font-semibold"
                  >
                    <option value="BAHAN_BAKU">Bahan Baku (Dapur / Bar)</option>
                    <option value="PERLENGKAPAN">Perlengkapan (Habis Pakai)</option>
                    <option value="PERALATAN_ASET">Peralatan & Aset Fisik</option>
                    <option value="BARANG_DAGANGAN">Barang Dagangan Retail</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Nama Barang */}
              <div>
                <label className="label">Nama Barang Inventaris *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Beras Pandan Wangi 25kg, Stick Billiard Fury, Sirup Vanilla"
                  className="input"
                />
              </div>

              {/* INTEGRASI COA: Akun Aset / Persediaan */}
              <div className="bg-primary-50/60 p-3.5 rounded-xl border border-primary-200 space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary-700" />
                  <label className="text-xs font-bold text-primary-900">
                    Pilih Akun Buku Besar (Chart of Accounts - CoA) *
                  </label>
                </div>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="input text-xs font-semibold bg-white"
                >
                  <option value="">-- Akun Otomatis Berdasarkan Kategori --</option>
                  {assetAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-primary-700">
                  Barang ini akan dicatat dan dihitung sebagai aset pada Laporan Neraca Keuangan.
                </p>
              </div>

              {/* Satuan & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Satuan *</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Contoh: PCS, KG, LITER, DUS, PACK"
                    className="input uppercase"
                  />
                </div>
                <div>
                  <label className="label">Tanggal Masuk / Perolehan</label>
                  <input
                    type="date"
                    value={itemDate}
                    onChange={(e) => setItemDate(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              {/* Harga Satuan & Kuantitas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0"
                    className="input font-mono"
                  />
                </div>
                {!editingItem && (
                  <div>
                    <label className="label">Jumlah Awal</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0"
                      className="input font-mono font-semibold"
                    />
                  </div>
                )}
                <div className={editingItem ? 'sm:col-span-2' : ''}>
                  <label className="label">Batas Stok Minimum</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={minimumStock}
                    onChange={(e) => setMinimumStock(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0"
                    className="input font-mono"
                  />
                </div>
              </div>

              {/* Offset Account untuk Saldo Awal (Khusus Create Item baru jika qty > 0) */}
              {!editingItem && parseFloat(quantity) > 0 && parseFloat(unitPrice) > 0 && (
                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 space-y-2">
                  <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Auto-Posting Jurnal Saldo Awal ({formatRupiah(parseFloat(quantity) * parseFloat(unitPrice))})
                  </label>
                  <select
                    value={offsetAccountId}
                    onChange={(e) => setOffsetAccountId(e.target.value)}
                    className="input text-xs font-semibold bg-white"
                  >
                    <option value="">-- Akun Pengimbang: Modal Awal (3-1001) --</option>
                    {initialEquityAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name} ({acc.type})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-emerald-700">
                    Otomatis membuat Jurnal Pembuka ke Buku Besar & Laporan Neraca.
                  </p>
                </div>
              )}

              {/* Lokasi & Kondisi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Lokasi Penyimpanan</label>
                  <input
                    type="text"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    placeholder="Contoh: Gudang Barat, Rak A2, Dapur, Meja Bar"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Kondisi Barang</label>
                  <select
                    value={condition}
                    onChange={(e: any) => setCondition(e.target.value)}
                    className="input"
                  >
                    <option value="BAIK">Baik / Normal</option>
                    <option value="RUSAK_RINGAN">Rusak Ringan (Perlu Servis)</option>
                    <option value="RUSAK_BERAT">Rusak Berat (Tidak Berfungsi)</option>
                  </select>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="label">Catatan / Keterangan Spesifikasi</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Merk, serial number, atau deskripsi tambahan..."
                  rows={2}
                  className="input"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="btn-secondary text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createItemMutation.isPending || updateItemMutation.isPending}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  {createItemMutation.isPending || updateItemMutation.isPending ? (
                    'Menyimpan...'
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Simpan Barang
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Catat Mutasi Stok Fisik & Integrasi Jurnal Akuntansi */}
      {isMovementModalOpen && selectedMovementItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="card w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-surface-200 flex items-center justify-between bg-surface-50/50">
              <div>
                <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                  <ArrowDownUp className="w-5 h-5 text-primary-600" />
                  Catat Mutasi Stok & Jurnal Akuntansi
                </h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  Barang: <span className="font-semibold text-surface-800">{selectedMovementItem.name}</span> ({selectedMovementItem.code})
                </p>
              </div>
              <button
                onClick={() => setIsMovementModalOpen(false)}
                className="text-surface-400 hover:text-surface-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMovementSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* TABS / JENIS MUTASI */}
              <div>
                <label className="label">Pilih Aksi Mutasi *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMovementType('KELUAR');
                      // set default expense
                      const defExp = expenseAccounts[0];
                      if (defExp) setMovementOffsetAccountId(defExp.id.toString());
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      movementType === 'KELUAR'
                        ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                        : 'bg-surface-50 border-surface-200 text-surface-700 hover:bg-surface-100'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Stok Keluar</span>
                    <span className="text-[10px] opacity-80 font-normal">(Pemakaian)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMovementType('MASUK');
                      // set default payment
                      const defPay = paymentAccounts[0];
                      if (defPay) setMovementOffsetAccountId(defPay.id.toString());
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      movementType === 'MASUK'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-surface-50 border-surface-200 text-surface-700 hover:bg-surface-100'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>Stok Masuk</span>
                    <span className="text-[10px] opacity-80 font-normal">(Pembelian)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMovementType('OPNAME')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      movementType === 'OPNAME'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-surface-50 border-surface-200 text-surface-700 hover:bg-surface-100'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Stock Opname</span>
                    <span className="text-[10px] opacity-80 font-normal">(Hitung Riil)</span>
                  </button>
                </div>
              </div>

              {/* CARD STATUS STOK & PREVIEW OTOMATIS */}
              <div
                className={`p-3.5 rounded-xl border ${
                  isStockInsufficient
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-surface-50 border-surface-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-surface-600">
                  <span>Stok Fisik Saat Ini:</span>
                  <span className="font-bold text-surface-900 font-mono">
                    {currentItemQty} {selectedMovementItem.unit}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1.5 font-semibold">
                  <span className={movementType === 'KELUAR' ? 'text-rose-700' : 'text-emerald-700'}>
                    {movementType === 'KELUAR'
                      ? 'Perkiraan Sisa Stok Berkurang:'
                      : movementType === 'MASUK'
                      ? 'Perkiraan Stok Bertambah:'
                      : 'Hasil Penyesuaian Riil:'}
                  </span>
                  <span
                    className={`font-mono text-sm font-bold ${
                      isStockInsufficient
                        ? 'text-rose-600'
                        : movementType === 'KELUAR'
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {previewStockAfter} {selectedMovementItem.unit}
                  </span>
                </div>

                {isStockInsufficient && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                    <BadgeAlert className="w-3.5 h-3.5 shrink-0" />
                    Stok tidak mencukupi untuk pemakaian sebesar {inputQtyNum} {selectedMovementItem.unit}!
                  </p>
                )}

                {previewTotalFinansial > 0 && (
                  <div className="pt-2 mt-2 border-t border-surface-200/60 flex items-center justify-between text-xs text-surface-500">
                    <span>Nilai Jurnal Akuntansi:</span>
                    <span className="font-bold text-surface-900 font-mono">
                      {formatRupiah(previewTotalFinansial)}
                    </span>
                  </div>
                )}
              </div>

              {/* KUANTITAS & HARGA */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    {movementType === 'KELUAR'
                      ? 'Jumlah Pemakaian (Kurangi) *'
                      : movementType === 'MASUK'
                      ? 'Jumlah Masuk (Tambah) *'
                      : 'Jumlah Hitung Fisik Gudang *'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      value={movementQty}
                      onChange={(e) => setMovementQty(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0"
                      className="input font-mono font-semibold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-400">
                      {selectedMovementItem.unit}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="label">Harga Satuan (Rp) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={movementUnitPrice}
                    onChange={(e) => setMovementUnitPrice(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="Harga satuan"
                    className="input font-mono"
                  />
                </div>
              </div>

              {/* INTEGRASI COA: AKUN PENGIMBANG */}
              {movementType === 'KELUAR' && (
                <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-rose-700" />
                    <label className="text-xs font-bold text-rose-900">
                      Alokasikan ke Akun Beban (Laporan Laba Rugi) *
                    </label>
                  </div>
                  <select
                    value={movementOffsetAccountId}
                    onChange={(e) => setMovementOffsetAccountId(e.target.value)}
                    className="input text-xs font-semibold bg-white"
                  >
                    <option value="">-- Beban Otomatis Sesuai Kategori --</option>
                    {expenseAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name} ({acc.type})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-rose-700">
                    Nilai pemakaian otomatis menambah beban usaha di Laporan Laba Rugi dan memotong saldo aset di Laporan Neraca.
                  </p>
                </div>
              )}

              {movementType === 'MASUK' && (
                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-700" />
                    <label className="text-xs font-bold text-emerald-900">
                      Sumber Pembayaran (Buku Kas / Bank / Hutang) *
                    </label>
                  </div>
                  <select
                    value={movementOffsetAccountId}
                    onChange={(e) => setMovementOffsetAccountId(e.target.value)}
                    className="input text-xs font-semibold bg-white"
                  >
                    <option value="">-- Kas Utama (1-1001) --</option>
                    {paymentAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                    {accountsList
                      ?.filter((a) => a.type === 'KEWAJIBAN')
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name} (Hutang)
                        </option>
                      ))}
                  </select>
                  <p className="text-[11px] text-emerald-700">
                    Nilai pengadaan otomatis menambah persediaan aset dan mengurangi saldo kas pada Laporan Neraca.
                  </p>
                </div>
              )}

              {/* TANGGAL & REFERENSI */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tanggal Mutasi</label>
                  <input
                    type="date"
                    value={movementDate}
                    onChange={(e) => setMovementDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">No. Referensi / Bukti</label>
                  <input
                    type="text"
                    value={movementRef}
                    onChange={(e) => setMovementRef(e.target.value)}
                    placeholder="Contoh: PO-001, OPNAME-202610"
                    className="input"
                  />
                </div>
              </div>

              {/* CATATAN */}
              <div>
                <label className="label">Catatan Mutasi (Opsional)</label>
                <textarea
                  value={movementNotes}
                  onChange={(e) => setMovementNotes(e.target.value)}
                  placeholder="Keterangan keperluan pemakaian, vendor pengadaan, atau alasan selisih..."
                  rows={2}
                  className="input"
                />
              </div>

              {/* ACTIONS */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="btn-secondary text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={recordMovementMutation.isPending || isStockInsufficient}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  {recordMovementMutation.isPending ? 'Menyimpan & Memposting...' : 'Simpan Mutasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Kartu Riwayat Mutasi Stok & Jurnal Akuntansi */}
      {isHistoryModalOpen && historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="card w-full max-w-4xl shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-surface-200 flex items-center justify-between bg-surface-50/50">
              <div>
                <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-primary-600" />
                  Kartu Stok Fisik & Audit Jurnal: {historyItem.name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-surface-500 mt-1">
                  <span>
                    Kode: <strong className="font-mono text-surface-800">{historyItem.code}</strong>
                  </span>
                  <span>
                    Satuan: <strong className="text-surface-800">{historyItem.unit}</strong>
                  </span>
                  <span>
                    Stok Saat Ini:{' '}
                    <strong className="text-emerald-600 font-mono font-bold">
                      {historyItem.quantity} {historyItem.unit}
                    </strong>
                  </span>
                  {historyItem.account && (
                    <span className="inline-flex items-center gap-1 text-primary-700 bg-primary-50 px-2 py-0.5 rounded font-mono">
                      <BookOpen className="w-3 h-3" />
                      {historyItem.account.code} - {historyItem.account.name}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-surface-400 hover:text-surface-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tanggal & Waktu</th>
                      <th>Jenis Mutasi</th>
                      <th className="text-right">Perubahan</th>
                      <th className="text-right">Stok Sebelum</th>
                      <th className="text-right">Stok Sesudah</th>
                      <th>No. Jurnal Akuntansi</th>
                      <th>Referensi & Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingMovements ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8">
                          <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <span className="text-xs text-surface-400">Memuat kartu riwayat stok...</span>
                        </td>
                      </tr>
                    ) : movementsData && movementsData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-surface-500 text-sm">
                          Belum ada riwayat mutasi stok untuk barang ini.
                        </td>
                      </tr>
                    ) : (
                      movementsData?.map((m) => (
                        <tr key={m.id} className="text-xs">
                          <td className="text-surface-600 whitespace-nowrap">
                            {formatTanggal(m.movementDate)}
                            <span className="block text-[10px] text-surface-400">
                              {formatTanggalJam(m.createdAt)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold text-[11px] ${
                                m.type === 'MASUK'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : m.type === 'KELUAR'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {m.type === 'MASUK' && <ArrowDownRight className="w-3 h-3" />}
                              {m.type === 'KELUAR' && <ArrowUpRight className="w-3 h-3" />}
                              {m.type === 'OPNAME' && <RefreshCw className="w-3 h-3" />}
                              {m.type}
                            </span>
                          </td>
                          <td
                            className={`text-right font-mono font-bold ${
                              m.type === 'MASUK'
                                ? 'text-emerald-600'
                                : m.type === 'KELUAR'
                                ? 'text-rose-600'
                                : 'text-blue-600'
                            }`}
                          >
                            {m.type === 'MASUK'
                              ? `+${m.quantity}`
                              : m.type === 'KELUAR'
                              ? `-${m.quantity}`
                              : m.quantity}
                          </td>
                          <td className="text-right font-mono text-surface-500">{m.stockBefore}</td>
                          <td className="text-right font-mono font-semibold text-surface-900">
                            {m.stockAfter}
                          </td>
                          <td>
                            {m.journalEntry ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-semibold text-[11px] border border-blue-200">
                                <FileText className="w-3 h-3" />
                                {m.journalEntry.nomorJurnal}
                              </span>
                            ) : (
                              <span className="text-surface-400 italic text-[11px]">-</span>
                            )}
                          </td>
                          <td>
                            <p className="font-mono text-surface-800">{m.reference || '-'}</p>
                            {m.notes && <p className="text-[11px] text-surface-500">{m.notes}</p>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-surface-200 bg-surface-50/50 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="btn-secondary text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryPage;
