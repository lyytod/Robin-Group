import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Phone,
  MapPin,
  Package,
  Receipt,
  Users as UsersIcon,
  BookOpen,
  Edit2,
  Trash2,
  Store,
  Search,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { confirmDialog } from '../../store/confirmStore';
import toast from 'react-hot-toast';
import type { ApiResponse } from '../../types/index';

interface BusinessItem {
  id: number;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  stats: {
    totalProducts: number;
    totalTransactions: number;
    totalStaff: number;
    totalAccounts: number;
  };
}

export function BusinessListPage() {
  const queryClient = useQueryClient();
  const { updateBusinesses, activeBusiness, setActiveBusiness } = useAuthStore();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('F&B / Kafe & Resto');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');

  // Fetch businesses
  const { data: businesses, isLoading, error } = useQuery({
    queryKey: ['businesses'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<BusinessItem[]>>('/businesses');
      const list = res.data.data ?? [];
      // Sync dengan navbar context switcher
      updateBusinesses(
        list.map((b) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          address: b.address || undefined,
          phone: b.phone || undefined,
          description: b.description || undefined,
          isActive: b.isActive,
          createdAt: b.createdAt,
        }))
      );
      return list;
    },
  });

  const openCreateModal = () => {
    setEditingBusiness(null);
    setName('');
    setCode('');
    setCategory('F&B / Kafe & Resto');
    setAddress('');
    setPhone('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (b: BusinessItem) => {
    setEditingBusiness(b);
    setName(b.name);
    setCode(b.code);
    setAddress(b.address || '');
    setPhone(b.phone || '');
    // Coba parse kategori dari description jika ada format [Kategori]
    let desc = b.description || '';
    if (desc.startsWith('[')) {
      const endIdx = desc.indexOf(']');
      if (endIdx > 0) {
        setCategory(desc.substring(1, endIdx));
        desc = desc.substring(endIdx + 1).trim();
      }
    }
    setDescription(desc);
    setIsModalOpen(true);
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/businesses', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Unit usaha berhasil dibuat beserta 58 akun akuntansi standar!');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal membuat unit usaha.');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await apiClient.put<ApiResponse<any>>(`/businesses/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Informasi unit usaha berhasil diperbarui.');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui unit usaha.');
    },
  });

  // Delete mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete<ApiResponse<any>>(`/businesses/${id}`);
      return res.data;
    },
    onSuccess: (_, deletedId) => {
      toast.success('Unit usaha berhasil dinonaktifkan.');
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      // Jika yang dihapus adalah unit usaha aktif, alihkan ke unit lain
      if (activeBusiness?.id === deletedId && businesses) {
        const remaining = businesses.filter((b) => b.id !== deletedId);
        if (remaining.length > 0) {
          setActiveBusiness({
            id: remaining[0].id,
            name: remaining[0].name,
            code: remaining[0].code,
            address: remaining[0].address || undefined,
            phone: remaining[0].phone || undefined,
            description: remaining[0].description || undefined,
            isActive: remaining[0].isActive,
            createdAt: remaining[0].createdAt,
          });
        }
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menonaktifkan unit usaha.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error('Nama dan kode unit usaha wajib diisi.');
      return;
    }

    const fullDescription = `[${category}] ${description.trim()}`.trim();

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      description: fullDescription || undefined,
    };

    if (editingBusiness) {
      updateMutation.mutate({ id: editingBusiness.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Filtered businesses
  const filteredBusinesses = businesses?.filter((b) => {
    const q = search.toLowerCase();
    return b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q);
  });

  // Total statistik
  const totalStats = businesses?.reduce(
    (acc, b) => ({
      products: acc.products + b.stats.totalProducts,
      transactions: acc.transactions + b.stats.totalTransactions,
      staff: acc.staff + b.stats.totalStaff,
      accounts: acc.accounts + b.stats.totalAccounts,
    }),
    { products: 0, transactions: 0, staff: 0, accounts: 0 }
  ) || { products: 0, transactions: 0, staff: 0, accounts: 0 };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary-600" />
              Pengelolaan Unit Usaha (Multi-Cabang)
            </h1>
            <span className="badge-primary text-xs">Role: Super Admin</span>
          </div>
          <p className="text-surface-500 text-sm mt-1">
            Tambah, ubah, dan pantau cabang/unit bisnis (misal: Cafe, Resto, Billiard) dengan pembukuan terisolasi
          </p>
        </div>

        <button
          id="btn-add-business"
          onClick={openCreateModal}
          className="btn-primary inline-flex items-center gap-2 self-start sm:self-auto text-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Unit Usaha Baru
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 bg-gradient-to-br from-white to-primary-50/30">
          <p className="text-xs font-semibold text-surface-500 uppercase">Unit Usaha Aktif</p>
          <p className="text-2xl font-bold font-mono text-primary-700 mt-1">
            {businesses?.length || 0}
          </p>
          <p className="text-[11px] text-surface-400 mt-1">Entitas bisnis terdaftar</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-surface-500 uppercase">Total Produk (Katalog)</p>
          <p className="text-2xl font-bold font-mono text-surface-900 mt-1">
            {totalStats.products}
          </p>
          <p className="text-[11px] text-surface-400 mt-1">Item SKU gabungan seluruh usaha</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-surface-500 uppercase">Total Staf & Kasir</p>
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {totalStats.staff}
          </p>
          <p className="text-[11px] text-surface-400 mt-1">Penugasan hak akses usaha</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-surface-500 uppercase">Total Transaksi Kasir</p>
          <p className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {totalStats.transactions}
          </p>
          <p className="text-[11px] text-surface-400 mt-1">Riwayat penjualan & kas keluar</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama unit usaha atau kode (misal: Cafe, RESTO01, Billiard)..."
            className="input pl-10 text-sm"
          />
        </div>
        <span className="text-xs text-surface-400 shrink-0">
          Menampilkan {filteredBusinesses?.length || 0} unit usaha
        </span>
      </div>

      {/* Grid of Business Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="card p-6 text-center text-rose-600">
          Gagal memuat daftar unit usaha. Silakan periksa koneksi database.
        </div>
      ) : filteredBusinesses && filteredBusinesses.length === 0 ? (
        <div className="card p-12 text-center">
          <Store className="w-12 h-12 text-surface-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-surface-800">
            {search ? 'Tidak ada unit usaha yang cocok' : 'Belum Ada Unit Usaha'}
          </h3>
          <p className="text-surface-500 text-sm mt-1 max-w-md mx-auto">
            {search
              ? 'Silakan coba kata kunci lain untuk mencari cabang/unit usaha.'
              : 'Klik tombol "Tambah Unit Usaha Baru" di atas untuk menambahkan cabang (misal: Cafe, Resto, Billiard).'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBusinesses?.map((b) => {
            // Ekstrak tag kategori
            let catTag = 'Usaha Umum';
            let cleanDesc = b.description || '';
            if (cleanDesc.startsWith('[')) {
              const end = cleanDesc.indexOf(']');
              if (end > 0) {
                catTag = cleanDesc.substring(1, end);
                cleanDesc = cleanDesc.substring(end + 1).trim();
              }
            }

            const isCurrentActive = activeBusiness?.id === b.id;

            return (
              <div
                key={b.id}
                className={`card p-5 hover:shadow-lg transition-all border flex flex-col justify-between ${
                  isCurrentActive ? 'border-primary-500 ring-2 ring-primary-100' : 'border-surface-200'
                }`}
              >
                <div>
                  {/* Top Header Card */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 text-primary-700 border border-primary-200 flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs">
                        {b.code.slice(0, 3)}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-surface-900 text-base truncate">{b.name}</h3>
                          {isCurrentActive && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aktif
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-surface-100 text-surface-700 border border-surface-200">
                            {b.code}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary-50 text-primary-700 border border-primary-100">
                            {catTag}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(b)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-surface-100 transition-colors"
                        title="Edit Profil Usaha"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          const confirmed = await confirmDialog({
                            title: 'Nonaktifkan Unit Usaha?',
                            message: `Apakah Anda yakin ingin menonaktifkan unit usaha "${b.name}"? Seluruh data transaksi dan bagan akun (CoA) akan tetap aman tersimpan di basis data.`,
                            confirmText: 'Ya, Nonaktifkan',
                            type: 'warning',
                            itemDetails: [
                              { label: 'Kode Usaha', value: b.code },
                              { label: 'Nama Usaha', value: b.name },
                              { label: 'Alamat', value: b.address || '-' },
                            ],
                          });
                          if (confirmed) {
                            deleteMutation.mutate(b.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-rose-600 hover:bg-surface-100 transition-colors"
                        title="Hapus / Nonaktifkan Usaha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Contact & Location Info */}
                  <div className="space-y-1.5 text-xs text-surface-600 mb-4 pt-1">
                    {b.address ? (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-surface-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{b.address}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-surface-400 italic">
                        <MapPin className="w-3.5 h-3.5 text-surface-300 shrink-0" />
                        <span>Alamat belum diisi</span>
                      </div>
                    )}

                    {b.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                        <span>{b.phone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-surface-400 italic">
                        <Phone className="w-3.5 h-3.5 text-surface-300 shrink-0" />
                        <span>Nomor telepon belum diisi</span>
                      </div>
                    )}

                    {cleanDesc && (
                      <p className="text-surface-500 text-[11px] line-clamp-2 mt-2 pt-2 border-t border-surface-100">
                        {cleanDesc}
                      </p>
                    )}
                  </div>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-surface-100 text-center">
                  <div className="p-2 rounded-xl bg-surface-50 border border-surface-100">
                    <Package className="w-3.5 h-3.5 text-primary-600 mx-auto mb-1" />
                    <p className="text-xs font-bold text-surface-900">{b.stats.totalProducts}</p>
                    <p className="text-[10px] text-surface-400">Produk</p>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-50 border border-surface-100">
                    <Receipt className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-1" />
                    <p className="text-xs font-bold text-surface-900">{b.stats.totalTransactions}</p>
                    <p className="text-[10px] text-surface-400">Transaksi</p>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-50 border border-surface-100">
                    <BookOpen className="w-3.5 h-3.5 text-amber-600 mx-auto mb-1" />
                    <p className="text-xs font-bold text-surface-900">{b.stats.totalAccounts}</p>
                    <p className="text-[10px] text-surface-400">Akun CoA</p>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-50 border border-surface-100">
                    <UsersIcon className="w-3.5 h-3.5 text-sky-600 mx-auto mb-1" />
                    <p className="text-xs font-bold text-surface-900">{b.stats.totalStaff}</p>
                    <p className="text-[10px] text-surface-400">Staf</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form Tambah / Edit Unit Usaha */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 text-primary-600 mb-1">
              <Store className="w-5 h-5" />
              <h2 className="text-lg font-bold text-surface-900">
                {editingBusiness ? 'Ubah Rincian Unit Usaha' : 'Tambah Unit Usaha Baru'}
              </h2>
            </div>
            <p className="text-xs text-surface-500 mb-4">
              {editingBusiness
                ? 'Perbarui informasi profil cabang atau unit usaha ini.'
                : 'Setiap unit usaha baru akan langsung mendapatkan 58 bagan akun akuntansi standar (CoA) secara otomatis.'}
            </p>

            {!editingBusiness && (
              <div className="p-3 rounded-xl bg-primary-50 border border-primary-200 text-primary-900 text-xs mb-4 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                <p>
                  Contoh unit usaha di Robin Group: <strong>Robin Cafe</strong> (CAFE01), <strong>Robin Resto</strong> (RESTO01), atau <strong>Robin Billiard</strong> (BILLIARD01).
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nama Unit Usaha *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Robin Cafe & Resto"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Kode Usaha (Unik) *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: CAFE01"
                    className="input font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Kategori / Jenis Usaha</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input"
                  >
                    <option value="F&B / Kafe & Resto">F&B / Kafe & Restoran</option>
                    <option value="Billiard & Rekreasi">Billiard & Rekreasi</option>
                    <option value="Toko Retail / Swalayan">Toko Retail / Swalayan</option>
                    <option value="Jasa & Servis">Jasa & Servis</option>
                    <option value="Umum / Lainnya">Umum / Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="label">Nomor Telepon</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat fisik toko/cabang..."
                  className="input resize-none"
                />
              </div>

              <div>
                <label className="label">Keterangan Tambahan</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catatan operasional atau rincian tambahan unit usaha..."
                  className="input resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-surface-50 border border-surface-200 text-surface-600 text-[11px] flex items-center gap-2">
                <Info className="w-4 h-4 text-surface-400 shrink-0" />
                <span>
                  Admin dan Kasir dapat ditugaskan ke unit usaha ini melalui menu <strong>Manajemen Staf</strong>.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {editingBusiness ? 'Simpan Perubahan' : 'Buat Unit Usaha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BusinessListPage;
