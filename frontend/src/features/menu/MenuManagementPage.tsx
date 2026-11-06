import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UtensilsCrossed,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Tag,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { formatRupiah } from '../../utils/formatters';
import { confirmDialog } from '../../store/confirmStore';
import toast from 'react-hot-toast';
import type { ApiResponse } from '../../types/index';

interface ProductItem {
  id: number;
  code: string;
  name: string;
  unit: string;
  sellingPrice: number;
  purchasePrice: number;
  currentStock: number;
  minimumStock: number;
  isLowStock: boolean;
  isActive: boolean;
  description: string | null;
}

export function MenuManagementPage() {
  const queryClient = useQueryClient();
  const { activeBusiness } = useAuthStore();
  const [search, setSearch] = useState('');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Form states for Product
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('PORSI');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [description, setDescription] = useState('');

  // Fetch products
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', activeBusiness?.id, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', '100');
      const res = await apiClient.get<ApiResponse<ProductItem[]>>(`/products?${params.toString()}`);
      return res.data.data ?? [];
    },
    enabled: !!activeBusiness?.id,
  });

  // Stats
  const totalMenu = products?.length ?? 0;
  const activeMenu = products?.filter((p) => p.isActive !== false).length ?? 0;
  const avgMargin = products && products.length > 0
    ? (products.reduce((acc, p) => acc + (p.sellingPrice > 0 ? ((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100 : 0), 0) / products.length).toFixed(0)
    : '0';

  const openCreateModal = () => {
    setEditingProduct(null);
    setCode(`MN-${Math.floor(1000 + Math.random() * 9000)}`);
    setName('');
    setUnit('PORSI');
    setSellingPrice('');
    setPurchasePrice('');
    setDescription('');
    setIsProductModalOpen(true);
  };

  const openEditModal = (p: ProductItem) => {
    setEditingProduct(p);
    setCode(p.code);
    setName(p.name);
    setUnit(p.unit);
    setSellingPrice(p.sellingPrice.toString());
    setPurchasePrice(p.purchasePrice.toString());
    setDescription(p.description || '');
    setIsProductModalOpen(true);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/products', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Menu berhasil ditambahkan!');
      setIsProductModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menambahkan menu.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await apiClient.put<ApiResponse<any>>(`/products/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Informasi menu berhasil diperbarui.');
      setIsProductModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui menu.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete<ApiResponse<any>>(`/products/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Menu dinonaktifkan.');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus menu.');
    },
  });

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !sellingPrice) {
      toast.error('Kode menu, nama menu, dan harga jual wajib diisi.');
      return;
    }

    if (editingProduct) {
      updateMutation.mutate({
        id: editingProduct.id,
        payload: {
          code: code.trim(),
          name: name.trim(),
          unit: unit.trim(),
          sellingPrice: parseFloat(sellingPrice),
          purchasePrice: parseFloat(purchasePrice) || 0,
          minimumStock: 0,
          description: description.trim() || undefined,
        },
      });
    } else {
      createMutation.mutate({
        code: code.trim(),
        name: name.trim(),
        unit: unit.trim(),
        sellingPrice: parseFloat(sellingPrice),
        purchasePrice: parseFloat(purchasePrice) || 0,
        currentStock: 0,
        minimumStock: 0,
        description: description.trim() || undefined,
      });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2.5">
            <UtensilsCrossed className="w-6 h-6 text-primary-600" />
            Manajemen Menu Kasir
          </h1>
          <p className="text-surface-500 text-sm mt-1">
            Atur daftar menu makanan, minuman, paket pesanan, dan tarif layanan yang dijual di kasir POS ({activeBusiness?.name || 'Pilih Unit'})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-add-menu"
            onClick={openCreateModal}
            className="btn-primary text-sm flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Menu Baru
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Total Menu Siap Jual</p>
            <p className="text-2xl font-bold text-surface-900 mt-0.5">{totalMenu} Item</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Rata-rata Margin Laba</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{avgMargin}%</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Menu Aktif di Kasir</p>
            <p className="text-2xl font-bold text-primary-700 mt-0.5">{activeMenu} Menu</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama menu, kode, atau kategori pesanan..."
            className="input pl-10 text-sm"
          />
        </div>
      </div>

      {/* Product Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Menu & Kode</th>
                <th>Satuan</th>
                <th className="text-right">Harga Pokok (HPP)</th>
                <th className="text-right">Harga Jual Kasir</th>
                <th className="text-right">Margin Laba</th>
                <th className="text-center">Status Menu</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-xs text-surface-400">Memuat katalog menu kasir...</span>
                  </td>
                </tr>
              ) : products && products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-surface-500 text-sm">
                    Belum ada menu yang terdaftar untuk unit usaha ini.
                  </td>
                </tr>
              ) : (
                products?.map((p) => {
                  const margin = p.sellingPrice - p.purchasePrice;
                  const marginPercent =
                    p.sellingPrice > 0 ? ((margin / p.sellingPrice) * 100).toFixed(0) : '0';
                  return (
                    <tr key={p.id} className="hover:bg-surface-50/80 transition-colors">
                      <td>
                        <div>
                          <p className="font-semibold text-surface-900 text-sm">{p.name}</p>
                          <p className="text-xs text-surface-400 font-mono">{p.code}</p>
                        </div>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-xs bg-surface-100 text-surface-700 font-medium">
                          {p.unit}
                        </span>
                      </td>
                      <td className="text-right text-xs font-mono text-surface-600">
                        {formatRupiah(p.purchasePrice)}
                      </td>
                      <td className="text-right text-sm font-semibold font-mono text-surface-900">
                        {formatRupiah(p.sellingPrice)}
                      </td>
                      <td className="text-right text-xs font-mono">
                        <span className={margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {formatRupiah(margin)} ({marginPercent}%)
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Aktif / Tersedia
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            title="Edit Menu"
                            className="p-1.5 text-surface-500 hover:text-amber-600 hover:bg-surface-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              const confirmed = await confirmDialog({
                                title: 'Hapus / Nonaktifkan Menu?',
                                message: `Apakah Anda yakin ingin menonaktifkan menu "${p.name}"? Menu ini tidak akan lagi muncul di kasir POS.`,
                                confirmText: 'Ya, Nonaktifkan',
                                type: 'danger',
                                itemDetails: [
                                  { label: 'Kode Menu', value: p.code },
                                  { label: 'Nama Menu', value: p.name },
                                  { label: 'Harga Jual', value: formatRupiah(p.sellingPrice) },
                                ],
                              });
                              if (confirmed) {
                                deleteMutation.mutate(p.id);
                              }
                            }}
                            title="Hapus / Nonaktifkan Menu"
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

      {/* MODAL: Tambah / Edit Menu */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="card w-full max-w-lg shadow-xl overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-surface-200 flex items-center justify-between bg-surface-50/50">
              <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-primary-600" />
                {editingProduct ? 'Edit Menu Kasir' : 'Tambah Menu Baru'}
              </h2>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-surface-400 hover:text-surface-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Kode Menu / SKU *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Contoh: MN-001"
                    className="input font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="label">Satuan *</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Contoh: PORSI, GELAS, JAM"
                    className="input uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="label">Nama Menu / Pesanan *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Nasi Goreng Spesial, Es Kopi Susu, Sewa Meja 1 Jam"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Harga Pokok (HPP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-surface-400 font-mono">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="0"
                      className="input pl-9 font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-surface-400 mt-1">Estimasi biaya bahan baku</p>
                </div>

                <div>
                  <label className="label">Harga Jual Kasir *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-surface-400 font-mono">
                      Rp
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="0"
                      className="input pl-9 font-mono font-semibold"
                    />
                  </div>
                  <p className="text-[11px] text-surface-400 mt-1">Harga yang dibayar pelanggan</p>
                </div>
              </div>

              <div>
                <label className="label">Deskripsi / Komposisi (Opsional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catatan tambahan mengenai varian, racikan, atau rincian menu..."
                  rows={2}
                  className="input"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="btn-secondary text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    'Menyimpan...'
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Simpan Menu
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MenuManagementPage;
