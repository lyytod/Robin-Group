import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  X,
  ArrowRight,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { confirmDialog } from '../../store/confirmStore';
import toast from 'react-hot-toast';
import type { ApiResponse } from '../../types/index';

interface ShiftItem {
  id: number;
  businessId: number;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function OperationalHoursPage() {
  const { activeBusiness } = useAuthStore();
  const queryClient = useQueryClient();

  // State Modal Shift
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftItem | null>(null);
  const [shiftName, setShiftName] = useState('');
  const [shiftStartTime, setShiftStartTime] = useState('08:00');
  const [shiftEndTime, setShiftEndTime] = useState('16:00');
  const [shiftGracePeriod, setShiftGracePeriod] = useState('15');
  const [shiftIsActive, setShiftIsActive] = useState(true);

  // ============================================================
  // QUERIES
  // ============================================================
  const { data: shifts = [], isLoading: isLoadingShifts } = useQuery<ShiftItem[]>({
    queryKey: ['shifts', activeBusiness?.id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ShiftItem[]>>('/shifts');
      return res.data.data || [];
    },
    enabled: !!activeBusiness?.id,
  });

  // ============================================================
  // MUTATIONS
  // ============================================================
  const createShiftMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<ShiftItem>>('/shifts', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Shift kerja berhasil ditambahkan.');
      setIsShiftModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menambahkan shift.');
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await apiClient.put<ApiResponse<ShiftItem>>(`/shifts/${id}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Shift kerja berhasil diperbarui.');
      setIsShiftModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui shift.');
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete<ApiResponse<any>>(`/shifts/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Shift kerja dinonaktifkan.');
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus shift.');
    },
  });

  // ============================================================
  // HANDLERS
  // ============================================================
  const openCreateShiftModal = () => {
    setEditingShift(null);
    setShiftName('');
    setShiftStartTime('08:00');
    setShiftEndTime('16:00');
    setShiftGracePeriod('15');
    setShiftIsActive(true);
    setIsShiftModalOpen(true);
  };

  const openEditShiftModal = (shift: ShiftItem) => {
    setEditingShift(shift);
    setShiftName(shift.name);
    setShiftStartTime(shift.startTime);
    setShiftEndTime(shift.endTime);
    setShiftGracePeriod(shift.gracePeriodMinutes.toString());
    setShiftIsActive(shift.isActive);
    setIsShiftModalOpen(true);
  };

  const handleShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftName.trim() || !shiftStartTime || !shiftEndTime) {
      toast.error('Nama shift, jam masuk, dan jam pulang wajib diisi.');
      return;
    }

    const payload = {
      name: shiftName.trim(),
      startTime: shiftStartTime,
      endTime: shiftEndTime,
      gracePeriodMinutes: parseInt(shiftGracePeriod, 10) || 0,
      isActive: shiftIsActive,
    };

    if (editingShift) {
      updateShiftMutation.mutate({ id: editingShift.id, payload });
    } else {
      createShiftMutation.mutate(payload);
    }
  };

  const handleDeleteShift = async (shift: ShiftItem) => {
    const confirmed = await confirmDialog({
      title: 'Hapus Shift Kerja',
      message: `Apakah Anda yakin ingin menonaktifkan "${shift.name}"? Shift ini tidak akan muncul lagi di Kios Absensi.`,
      confirmText: 'Ya, Nonaktifkan',
      cancelText: 'Batal',
      type: 'danger',
    });
    if (confirmed) {
      deleteShiftMutation.mutate(shift.id);
    }
  };

  const activeShiftsCount = shifts.filter((s) => s.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-surface-200">
        <div>
          <div className="flex items-center gap-2 text-primary-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Clock className="w-4 h-4" />
            <span>Konfigurasi Operasional Kerja</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
            Manajemen Jam Operasional & Shift
          </h1>
          <p className="text-surface-500 text-sm mt-0.5">
            Atur jadwal shift kerja staf operasional (jam masuk, jam pulang, dan batas toleransi keterlambatan) untuk Kios Absensi Karyawan ({activeBusiness?.name || 'Pilih Unit Usaha'}).
          </p>
        </div>

        <button
          onClick={openCreateShiftModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Shift Kerja</span>
        </button>
      </div>

      {/* Banner Informasi Pemindahan Kebijakan Gaji */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/90 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-blue-950 flex items-center gap-2">
              Kebijakan Gaji, Uang Makan & Kedisiplinan Dipindahkan
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200 text-blue-900">
                Menu Manajemen Gaji
              </span>
            </h4>
            <p className="text-xs text-blue-800/90 mt-0.5 leading-relaxed">
              Besaran <strong>Uang Makan Harian Kehadiran</strong>, <strong>Potongan Gaji Pokok jika Tidak Hadir (Alfa)</strong>, <strong>Bonus Disiplin Tepat Waktu</strong>, dan <strong>Denda Keterlambatan</strong> kini dikelola terpusat di sub-menu <strong>Kebijakan Gaji</strong> pada modul Manajemen Gaji.
            </p>
          </div>
        </div>

        <Link
          to="/salaries?tab=policies"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0 whitespace-nowrap active:scale-98"
        >
          <span>Buka Kebijakan Gaji</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* KPI Cards Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-surface-500">Shift Kerja Terdaftar</p>
            <p className="text-xl font-bold text-surface-900 mt-0.5">
              {isLoadingShifts ? '...' : `${shifts.length} Shift`}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-surface-500">Shift Aktif di Kios</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">
              {isLoadingShifts ? '...' : `${activeShiftsCount} Shift Aktif`}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-surface-500">Kios Presensi Karyawan</p>
            <p className="text-xs text-purple-700 font-semibold mt-1">
              Sinkron dengan jadwal jam operasional
            </p>
          </div>
        </div>
      </div>

      {/* Tabel Jadwal Shift Kerja */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-surface-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-surface-900">Daftar Shift Kerja Operasional</h2>
            <p className="text-xs text-surface-500 mt-0.5">
              Jadwal shift kerja yang tersedia pada Kios Absensi Karyawan.
            </p>
          </div>
          <span className="text-xs text-surface-400 font-medium">
            Total: {shifts.length} Shift
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-50 text-surface-600 text-xs uppercase font-semibold border-b border-surface-200">
              <tr>
                <th className="px-5 py-3.5">Nama Shift</th>
                <th className="px-5 py-3.5">Jam Masuk</th>
                <th className="px-5 py-3.5">Jam Pulang</th>
                <th className="px-5 py-3.5">Toleransi Terlambat</th>
                <th className="px-5 py-3.5">Status Shift</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {isLoadingShifts ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-surface-400">
                    Memuat daftar shift...
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-surface-400">
                    Belum ada shift kerja yang dibuat. Silakan klik tombol "Tambah Shift Kerja".
                  </td>
                </tr>
              ) : (
                shifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-surface-50/60 transition">
                    <td className="px-5 py-4 font-semibold text-surface-900">
                      {shift.name}
                    </td>
                    <td className="px-5 py-4 font-mono font-medium text-emerald-700 bg-emerald-50/40 w-fit">
                      {shift.startTime} WIB
                    </td>
                    <td className="px-5 py-4 font-mono font-medium text-blue-700 bg-blue-50/40 w-fit">
                      {shift.endTime} WIB
                    </td>
                    <td className="px-5 py-4 text-surface-600">
                      <span className="font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md text-xs border border-amber-200">
                        +{shift.gracePeriodMinutes} menit
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {shift.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-100 text-surface-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-surface-400"></span>
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditShiftModal(shift)}
                          className="p-1.5 text-surface-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                          title="Edit Shift"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteShift(shift)}
                          className="p-1.5 text-surface-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Nonaktifkan Shift"
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

      {/* Modal Tambah / Edit Shift Kerja */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-surface-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-surface-50/50">
              <h3 className="font-bold text-base text-surface-900">
                {editingShift ? 'Edit Shift Kerja' : 'Tambah Shift Kerja Baru'}
              </h3>
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="text-surface-400 hover:text-surface-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleShiftSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Nama Shift Kerja <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  placeholder="Contoh: Shift Pagi, Shift Siang, Shift Malam"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Jam Masuk <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Jam Pulang <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Toleransi Keterlambatan (Menit)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={shiftGracePeriod}
                  onChange={(e) => setShiftGracePeriod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
                <p className="text-[11px] text-surface-400 mt-1">
                  Karyawan dianggap tepat waktu jika absen sebelum jam masuk + toleransi (contoh: 08:15).
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="shiftActive"
                  checked={shiftIsActive}
                  onChange={(e) => setShiftIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-surface-300"
                />
                <label htmlFor="shiftActive" className="text-sm font-medium text-surface-700">
                  Shift ini aktif dan dapat dipilih karyawan saat absen
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-4 py-2 text-surface-600 hover:bg-surface-100 rounded-xl text-sm font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createShiftMutation.isPending || updateShiftMutation.isPending}
                  className="px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {createShiftMutation.isPending || updateShiftMutation.isPending
                    ? 'Menyimpan...'
                    : editingShift
                    ? 'Simpan Perubahan'
                    : 'Tambah Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperationalHoursPage;
