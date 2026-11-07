import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Shield,
  Search,
  Edit2,
  Trash2,
  Store,
  UserCheck,
  UserX,
  CheckCircle2,
  Sparkles,
  CheckSquare,
  Square,
  AlertCircle,
  Boxes,
} from 'lucide-react';
import apiClient from '../../api/client';
import { confirmDialog } from '../../store/confirmStore';
import toast from 'react-hot-toast';
import type { ApiResponse } from '../../types/index';

interface UserItem {
  id: number;
  username: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'KASIR' | 'AGENT';
  isActive: boolean;
  createdAt: string;
  businesses: {
    id: number;
    name: string;
    code: string;
  }[];
}

interface BusinessOption {
  id: number;
  name: string;
  code: string;
}

export function UserListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'SUPER_ADMIN' | 'ADMIN' | 'KASIR' | 'AGENT'>('ADMIN');
  const [isActive, setIsActive] = useState(true);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<number[]>([]);

  // Fetch users
  const { data: userData, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter, businessFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (businessFilter) params.append('businessId', businessFilter);
      const res = await apiClient.get<ApiResponse<UserItem[]>>(`/users?${params.toString()}`);
      return res.data.data ?? [];
    },
  });

  // Fetch businesses for assignment checkboxes & filter
  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<BusinessOption[]>>('/businesses');
      return res.data.data ?? [];
    },
  });

  const openCreateModal = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setFullName('');
    setRole('ADMIN');
    setIsActive(true);
    setSelectedBusinessIds([]);
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserItem) => {
    setEditingUser(u);
    setUsername(u.username);
    setPassword('');
    setFullName(u.fullName);
    setRole(u.role);
    setIsActive(u.isActive);
    setSelectedBusinessIds(u.businesses.map((b) => b.id));
    setIsModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/users', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Akun admin/staf berhasil dibuat!');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal membuat akun.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await apiClient.put<ApiResponse<any>>(`/users/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Data akun dan hak akses unit usaha berhasil diperbarui.');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui akun.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete<ApiResponse<any>>(`/users/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Pengguna berhasil dinonaktifkan/dihapus.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus pengguna.');
    },
  });

  const toggleBusinessSelection = (id: number) => {
    setSelectedBusinessIds((prev) =>
      prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id]
    );
  };

  const selectAllBusinesses = () => {
    if (businesses) {
      setSelectedBusinessIds(businesses.map((b) => b.id));
    }
  };

  const clearAllBusinesses = () => {
    setSelectedBusinessIds([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Nama lengkap staf wajib diisi.');
      return;
    }

    // Validasi penugasan unit usaha untuk Admin, Kasir, dan Agent
    if (role !== 'SUPER_ADMIN' && selectedBusinessIds.length === 0) {
      toast.error(
        `Silakan pilih minimal satu unit usaha yang dikelola oleh akun ${
          role === 'ADMIN' ? 'Admin' : role === 'AGENT' ? 'Agent' : 'Kasir'
        } ini.`
      );
      return;
    }

    if (!editingUser) {
      if (!username.trim() || !password) {
        toast.error('Username dan kata sandi wajib diisi untuk akun baru.');
        return;
      }
      createMutation.mutate({
        username: username.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
        role,
        businessIds: role === 'SUPER_ADMIN' ? [] : selectedBusinessIds,
      });
    } else {
      const payload: any = {
        fullName: fullName.trim(),
        role,
        isActive,
        businessIds: role === 'SUPER_ADMIN' ? [] : selectedBusinessIds,
      };
      if (password.trim() !== '') {
        payload.password = password;
      }
      updateMutation.mutate({ id: editingUser.id, payload });
    }
  };

  const getRoleBadge = (r: string) => {
    switch (r) {
      case 'SUPER_ADMIN':
        return (
          <span className="badge-primary inline-flex items-center gap-1">
            <Shield className="w-3 h-3" /> Super Admin
          </span>
        );
      case 'ADMIN':
        return (
          <span className="badge-warning inline-flex items-center gap-1 font-semibold">
            <Store className="w-3 h-3" /> Admin Usaha
          </span>
        );
      case 'AGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Boxes className="w-3 h-3 text-indigo-600" /> Agent (POS, Absen & Stok)
          </span>
        );
      default:
        return (
          <span className="badge-neutral inline-flex items-center gap-1">
            <Users className="w-3 h-3" /> Kasir POS
          </span>
        );
    }
  };

  // KPI perhitungan
  const totalUsers = userData?.length || 0;
  const superAdminCount = userData?.filter((u) => u.role === 'SUPER_ADMIN').length || 0;
  const adminCount = userData?.filter((u) => u.role === 'ADMIN').length || 0;
  const kasirCount = userData?.filter((u) => u.role === 'KASIR').length || 0;
  const agentCount = userData?.filter((u) => u.role === 'AGENT').length || 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-primary-600" />
              Pengelolaan Akun Admin & Staf
            </h1>
            <span className="badge-primary text-xs">Role: Super Admin</span>
          </div>
          <p className="text-surface-500 text-sm mt-1">
            Atur akun pengguna dan hak akses unit usaha (misal: Admin1 mengelola Cafe & Resto, Admin2 mengelola Billiard)
          </p>
        </div>

        <button
          id="btn-add-user"
          onClick={openCreateModal}
          className="btn-primary inline-flex items-center gap-2 self-start sm:self-auto text-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Admin / Staf Baru
        </button>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="card p-4 bg-gradient-to-br from-white to-primary-50/40">
          <p className="text-xs font-semibold text-surface-500 uppercase">Total Akun</p>
          <p className="text-2xl font-bold font-mono text-surface-900 mt-1">{totalUsers}</p>
          <p className="text-[11px] text-surface-400 mt-0.5">Pengguna terdaftar</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-surface-500 uppercase">Super Admin</p>
          <p className="text-2xl font-bold font-mono text-primary-700 mt-1">{superAdminCount}</p>
          <p className="text-[11px] text-surface-400 mt-0.5">Akses penuh cabang</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-surface-500 uppercase">Admin Usaha</p>
          <p className="text-2xl font-bold font-mono text-amber-600 mt-1">{adminCount}</p>
          <p className="text-[11px] text-surface-400 mt-0.5">Pengelola unit tertentu</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-surface-500 uppercase">Kasir Operasional</p>
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">{kasirCount}</p>
          <p className="text-[11px] text-surface-400 mt-0.5">Akses transaksi POS</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-semibold text-surface-500 uppercase">Agent (Stok & POS)</p>
          <p className="text-2xl font-bold font-mono text-indigo-600 mt-1">{agentCount}</p>
          <p className="text-[11px] text-surface-400 mt-0.5">POS, Absen & Kelola Stok</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama staf atau username (misal: admin1, Budi)..."
            className="input pl-10 text-sm"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input text-xs sm:w-44"
          >
            <option value="">Semua Peran</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin Usaha</option>
            <option value="KASIR">Kasir</option>
            <option value="AGENT">Agent (POS, Absen & Stok)</option>
          </select>

          {/* Business Unit Filter */}
          <select
            value={businessFilter}
            onChange={(e) => setBusinessFilter(e.target.value)}
            className="input text-xs sm:w-48"
          >
            <option value="">Semua Unit Usaha</option>
            {businesses?.map((b) => (
              <option key={b.id} value={b.id.toString()}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Pengguna & Akun</th>
                <th>Peran</th>
                <th>Unit Usaha yang Dikelola</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-xs text-surface-400">Memuat data pengguna...</span>
                  </td>
                </tr>
              ) : userData && userData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-surface-500 text-sm">
                    Tidak ada akun pengguna yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                userData?.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-50/80 transition-colors">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-surface-100 to-surface-200 border border-surface-300 flex items-center justify-center font-bold text-xs text-surface-700 shrink-0">
                          {u.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-surface-900 text-sm">{u.fullName}</p>
                          <p className="text-xs text-surface-400 font-mono">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td>{getRoleBadge(u.role)}</td>
                    <td>
                      {u.role === 'SUPER_ADMIN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Akses Penuh Seluruh Grup
                        </span>
                      ) : u.businesses.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" /> Belum ditugaskan ke cabang
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {u.businesses.map((b) => (
                            <span
                              key={b.id}
                              className="px-2 py-0.5 rounded-lg text-xs font-medium bg-surface-100 hover:bg-surface-200 text-surface-800 border border-surface-200 transition-colors"
                              title={`Kode Cabang: ${b.code}`}
                            >
                              <span className="font-semibold">{b.name}</span>{' '}
                              <span className="text-[10px] text-surface-400 font-mono">({b.code})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <UserCheck className="w-3.5 h-3.5" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-surface-400">
                          <UserX className="w-3.5 h-3.5" /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-surface-100 transition-colors"
                          title="Ubah Data & Penugasan Usaha"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            const confirmed = await confirmDialog({
                              title: 'Nonaktifkan Akun Staf?',
                              message: `Apakah Anda yakin ingin menonaktifkan akun pengguna "${u.fullName}"? Akun ini tidak akan dapat login ke sistem lagi.`,
                              confirmText: 'Ya, Nonaktifkan',
                              type: 'danger',
                              itemDetails: [
                                { label: 'Nama Lengkap', value: u.fullName },
                                { label: 'Username', value: `@${u.username}` },
                                { label: 'Peran / Role', value: u.role },
                              ],
                            });
                            if (confirmed) {
                              deleteMutation.mutate(u.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-rose-600 hover:bg-surface-100 transition-colors"
                          title="Hapus Akun Staf"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Tambah / Edit Staf & Penugasan Unit Usaha */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 text-primary-600 mb-1">
              <Store className="w-5 h-5" />
              <h2 className="text-lg font-bold text-surface-900">
                {editingUser ? 'Ubah Akun Staf & Hak Akses' : 'Tambah Admin / Staf Baru'}
              </h2>
            </div>
            <p className="text-xs text-surface-500 mb-4">
              Konfigurasi kredensial login dan tentukan unit usaha yang diizinkan untuk dikelola oleh akun ini.
            </p>

            {/* Informational Multi-Tenancy Banner */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs mb-4 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Prinsip Multi-Tenancy Robin Group:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Super Admin dapat menugaskan <strong>Admin1</strong> untuk mengelola <em>Cafe</em> dan <em>Resto</em> saja, sedangkan <strong>Admin2</strong> mengelola <em>Billiard</em>. Saat login, admin tersebut hanya dapat melihat dan mengakses cabang yang ditugaskan.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Admin Cafe & Resto (Budi)"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Username Login *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="Contoh: admin1"
                    className="input font-mono disabled:bg-surface-100"
                  />
                </div>
                <div>
                  <label className="label">
                    {editingUser ? 'Kata Sandi Baru (Opsional)' : 'Kata Sandi *'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingUser ? 'Kosongkan jika tak diubah' : 'Minimal 6 karakter'}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Peran Sistem *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="input font-medium"
                  >
                    <option value="ADMIN">Admin Usaha (Mengelola Cabang Tertentu)</option>
                    <option value="AGENT">Agent (Kasir, Absensi, & Kelola Stok Inventaris)</option>
                    <option value="KASIR">Kasir (Operasional Penjualan POS & Absensi)</option>
                    <option value="SUPER_ADMIN">Super Admin (Akses Penuh Seluruh Cabang)</option>
                  </select>
                </div>
                {editingUser && (
                  <div>
                    <label className="label">Status Akun</label>
                    <select
                      value={isActive ? 'true' : 'false'}
                      onChange={(e) => setIsActive(e.target.value === 'true')}
                      className="input"
                    >
                      <option value="true">Aktif</option>
                      <option value="false">Nonaktif (Suspend)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Business Unit Selection (If role is ADMIN or KASIR) */}
              {role !== 'SUPER_ADMIN' ? (
                <div className="space-y-2 pt-1 border-t border-surface-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="label mb-0">Akses Unit Usaha yang Dikelola *</label>
                      <p className="text-[11px] text-surface-400">
                        Pilih satu atau lebih unit usaha ({selectedBusinessIds.length} dari {businesses?.length || 0} dipilih)
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={selectAllBusinesses}
                        className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50 flex items-center gap-1"
                      >
                        <CheckSquare className="w-3.5 h-3.5" /> Pilih Semua
                      </button>
                      <span className="text-surface-300">|</span>
                      <button
                        type="button"
                        onClick={clearAllBusinesses}
                        className="text-[11px] font-semibold text-surface-500 hover:text-surface-700 px-2 py-1 rounded hover:bg-surface-100 flex items-center gap-1"
                      >
                        <Square className="w-3.5 h-3.5" /> Kosongkan
                      </button>
                    </div>
                  </div>

                  <div className="border border-surface-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5 bg-surface-50/50">
                    {!businesses || businesses.length === 0 ? (
                      <p className="text-xs text-surface-400 italic text-center py-4">
                        Belum ada unit usaha terdaftar di sistem.
                      </p>
                    ) : (
                      businesses.map((b) => {
                        const isChecked = selectedBusinessIds.includes(b.id);
                        return (
                          <label
                            key={b.id}
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all ${
                              isChecked
                                ? 'bg-primary-50/80 border-primary-300 text-primary-950 font-medium'
                                : 'bg-white border-surface-200 hover:bg-surface-100 text-surface-700'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleBusinessSelection(b.id)}
                                className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                              />
                              <div>
                                <p className="text-xs font-bold leading-tight">{b.name}</p>
                                <p className="text-[10px] text-surface-400 font-mono">{b.code}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-100 text-surface-600">
                              Unit #{b.id}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-primary-50 border border-primary-200 text-primary-900 text-xs flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary-600 shrink-0" />
                  <span>
                    Akun <strong>Super Admin</strong> secara otomatis memiliki hak akses penuh ke seluruh unit usaha yang ada maupun yang baru dibuat.
                  </span>
                </div>
              )}

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
                  {editingUser ? 'Simpan Perubahan' : 'Buat Akun Staf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserListPage;
