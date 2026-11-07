import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  UserCheck,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  LogOut,
  LogIn,
  X,
  Upload,
  Sparkles,
  RotateCcw,
  Coffee,
  CalendarCheck,
  CalendarDays,
  Plus,
  Trash2,
  Edit3,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { confirmDialog } from '../../store/confirmStore';
import {
  formatTanggal,
  formatTanggalJam,
  formatTanggalISO,
} from '../../utils/formatters';
import toast from 'react-hot-toast';
import type { ApiResponse } from '../../types/index';

interface EmployeeOption {
  id: number;
  code: string;
  name: string;
  position: string;
  phone?: string | null;
  monthlyDayOffQuota?: number;
  isActive: boolean;
}

interface ShiftOption {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  isActive: boolean;
}

interface TodayAttendanceItem {
  employee: EmployeeOption;
  attendanceId: number | null;
  hasClockedIn: boolean;
  clockInTime: string | null;
  clockInPhoto: string | null;
  clockInNotes: string | null;
  hasClockedOut: boolean;
  clockOutTime: string | null;
  clockOutPhoto: string | null;
  clockOutNotes: string | null;
  status: string;
  isLate: boolean;
  lateMinutes: number;
  earlyMinutes: number;
  shift: ShiftOption | null;
}

interface AttendanceHistoryItem {
  id: number;
  businessId: number;
  employeeId: number;
  date: string;
  clockInTime: string | null;
  clockInPhoto: string | null;
  clockInNotes: string | null;
  clockOutTime: string | null;
  clockOutPhoto: string | null;
  clockOutNotes: string | null;
  status: 'HADIR' | 'TERLAMBAT' | 'PULANG_AWAL' | 'IZIN' | 'SAKIT' | 'ALFA' | 'LIBUR' | 'CUTI';
  lateMinutes: number;
  earlyMinutes: number;
  isLate: boolean;
  employee: {
    id: number;
    code: string;
    name: string;
    position: string;
    phone: string | null;
    monthlyDayOffQuota?: number;
  };
  shift?: {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
  } | null;
  createdBy?: {
    id: number;
    fullName: string;
  } | null;
}

export function AttendancePage() {
  const { activeBusiness, user } = useAuthStore();
  const isSuperAdminOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  // Active Tab: 'kiosk' | 'history' | 'leaves'
  const [activeTab, setActiveTab] = useState<'kiosk' | 'history' | 'leaves'>('kiosk');

  // Digital Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Kiosk Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  // History Filter State
  const [filterStartDate, setFilterStartDate] = useState(formatTanggalISO());
  const [filterEndDate, setFilterEndDate] = useState(formatTanggalISO());
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  // Modal Preview Foto
  const [previewPhotoItem, setPreviewPhotoItem] = useState<{
    photo: string;
    employeeName: string;
    type: 'Masuk' | 'Pulang';
    time: string;
    status: string;
  } | null>(null);

  // Modal Manual Entry (Izin / Sakit / Alfa)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualEmpId, setManualEmpId] = useState('');
  const [manualDate, setManualDate] = useState(formatTanggalISO());
  const [manualStatus, setManualStatus] = useState<'IZIN' | 'SAKIT' | 'ALFA' | 'HADIR'>('IZIN');
  const [manualNotes, setManualNotes] = useState('');

  // Modal Batch Leave / Jadwal Libur & Cuti
  const [isBatchLeaveModalOpen, setIsBatchLeaveModalOpen] = useState(false);
  const [batchLeaveEmpId, setBatchLeaveEmpId] = useState('');
  const [batchLeaveDates, setBatchLeaveDates] = useState<string[]>([]);
  const [batchLeaveInputDate, setBatchLeaveInputDate] = useState(formatTanggalISO());
  const [batchLeaveStatus, setBatchLeaveStatus] = useState<'LIBUR' | 'CUTI' | 'IZIN' | 'SAKIT'>('LIBUR');
  const [batchLeaveNotes, setBatchLeaveNotes] = useState('');

  // Modal Ubah/Koreksi Status Absensi (Override)
  const [isEditStatusModalOpen, setIsEditStatusModalOpen] = useState(false);
  const [editingStatusItem, setEditingStatusItem] = useState<AttendanceHistoryItem | null>(null);
  const [newStatus, setNewStatus] = useState<string>('HADIR');
  const [editStatusNotes, setEditStatusNotes] = useState('');

  // Leaves Tab Filters & Pagination
  const [leavesStatusFilter, setLeavesStatusFilter] = useState('');
  const [leavesEmpFilter, setLeavesEmpFilter] = useState('');
  const [leavesPage, setLeavesPage] = useState(1);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ============================================================
  // WEBCAM INITIALIZATION & LIFECYCLE
  // ============================================================
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Periksa apakah browser mendukung MediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const isLocal =
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1';
        if (!isLocal && !window.isSecureContext) {
          setCameraError(
            'Akses kamera via jaringan LAN (IP HTTP) dibatasi oleh keamanan browser. Silakan buka dari komputer server (localhost) atau gunakan tombol "Ambil / Unggah Foto" di bawah.'
          );
        } else {
          setCameraError('Webcam tidak terdeteksi atau izin kamera ditolak oleh browser.');
        }
        setCameraActive(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);
      setCameraError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn('Video play caught:', e));
      }
    } catch (err: any) {
      console.warn('Gagal mengakses kamera:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Izin akses kamera ditolak. Silakan izinkan kamera pada ikon kunci/gembok browser.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Perangkat webcam tidak ditemukan.');
      } else {
        setCameraError(err.message || 'Kamera tidak aktif atau izin browser belum diberikan.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (activeTab === 'kiosk') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab]);

  // Pastikan stream terpasang ke video saat video element ter-mount
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive, capturedPhoto]);

  const captureSnapshot = (): string | null => {
    if (capturedPhoto) {
      return capturedPhoto;
    }

    if (videoRef.current && cameraActive) {
      try {
        const video = videoRef.current;
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;
        if (width > 0 && height > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Mirror horizontal agar sesuai tampilan layar cermin
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setCapturedPhoto(dataUrl);
            return dataUrl;
          }
        }
      } catch (e) {
        console.error('Error saat mengambil foto canvas:', e);
      }
    }
    return capturedPhoto;
  };

  const handleTakeSnapshot = () => {
    const photo = captureSnapshot();
    if (photo) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 200);
      toast.success('Foto selfie berhasil diambil!');
    } else {
      toast.error('Gagal mengambil tangkapan kamera. Pastikan video aktif.');
    }
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    if (!cameraActive) {
      startCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedPhoto(reader.result as string);
      toast.success('Foto selfie berhasil dimuat.');
    };
    reader.readAsDataURL(file);
  };

  // ============================================================
  // QUERIES
  // ============================================================
  // Daftar Karyawan Aktif (Bisa diakses Kasir, Admin, Super Admin)
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<EmployeeOption[]>({
    queryKey: ['employees-for-attendance', activeBusiness?.id],
    queryFn: async () => {
      try {
        const res = await apiClient.get<ApiResponse<any>>('/attendance/employees');
        const raw = res.data.data;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.items)) return raw.items;
      } catch (err) {
        console.warn('Fallback ambil dari /salaries/employees:', err);
        try {
          const res = await apiClient.get<ApiResponse<any>>('/salaries/employees?limit=200');
          const raw = res.data.data;
          const list = Array.isArray(raw) ? raw : (raw?.items || []);
          return list.filter((e: any) => e.isActive);
        } catch (e2) {
          console.error('Gagal memuat staf:', e2);
        }
      }
      return [];
    },
    enabled: !!activeBusiness?.id,
  });

  // Daftar Shift
  const { data: shifts = [] } = useQuery<ShiftOption[]>({
    queryKey: ['shifts', activeBusiness?.id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ShiftOption[]>>('/shifts');
      return res.data.data?.filter((s) => s.isActive) || [];
    },
    enabled: !!activeBusiness?.id,
  });

  // Status Kehadiran Seluruh Karyawan Hari Ini
  const { data: todayStatus, refetch: refetchToday } = useQuery<{
    date: string;
    shifts: ShiftOption[];
    summary: {
      totalEmployees: number;
      presentCount: number;
      lateCount: number;
      onTimeCount: number;
      izinCount: number;
      sakitCount: number;
      alfaCount: number;
      liburCount?: number;
      cutiCount?: number;
      notAttendedCount: number;
    };
    items: TodayAttendanceItem[];
  }>({
    queryKey: ['attendance-today', activeBusiness?.id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<any>>('/attendance/today');
      return res.data.data;
    },
    enabled: !!activeBusiness?.id,
  });

  // Riwayat Absensi
  const { data: historyData, isLoading: isLoadingHistory } = useQuery<{
    items: AttendanceHistoryItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: [
      'attendance-history',
      activeBusiness?.id,
      filterStartDate,
      filterEndDate,
      filterEmployeeId,
      filterStatus,
      page,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);
      if (filterEmployeeId) params.append('employeeId', filterEmployeeId);
      if (filterStatus) params.append('status', filterStatus);
      params.append('page', page.toString());
      params.append('limit', '15');

      const res = await apiClient.get<ApiResponse<any>>(`/attendance?${params.toString()}`);
      return {
        items: res.data.data || [],
        meta: res.data.meta || { page: 1, limit: 15, total: 0, totalPages: 1 },
      };
    },
    enabled: !!activeBusiness?.id && activeTab === 'history',
  });

  // Rekapitulasi Kuota Libur & Kedisiplinan Staf (Summary)
  const { data: summaryRecapData, isLoading: isLoadingSummary } = useQuery<{
    period: { startDate: string; endDate: string };
    rule: any;
    recaps: Array<{
      employee: { id: number; code: string; name: string; position: string };
      totalPresent: number;
      onTimeCount: number;
      lateCount: number;
      totalLateMinutes: number;
      izinCount: number;
      sakitCount: number;
      alfaCount: number;
      liburCount: number;
      cutiCount: number;
      monthlyDayOffQuota: number;
      remainingDayOffQuota: number;
      isEligibleForDisciplineBonus: boolean;
      disciplineBonusAmount: number;
      lateDeductionAmount: number;
      mealAllowanceAmount: number;
      absenceDeductionAmount: number;
    }>;
  }>({
    queryKey: ['attendance-summary', activeBusiness?.id, filterStartDate, filterEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);
      const res = await apiClient.get<ApiResponse<any>>(`/attendance/summary?${params.toString()}`);
      return res.data.data;
    },
    enabled: !!activeBusiness?.id && (activeTab === 'leaves' || activeTab === 'history'),
  });

  // Query Khusus Tab 3: Jadwal Libur & Izin Staf
  const { data: leavesListData, isLoading: isLoadingLeaves } = useQuery<{
    items: AttendanceHistoryItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: [
      'attendance-leaves',
      activeBusiness?.id,
      filterStartDate,
      filterEndDate,
      leavesEmpFilter,
      leavesStatusFilter,
      leavesPage,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);
      if (leavesEmpFilter) params.append('employeeId', leavesEmpFilter);
      if (leavesStatusFilter) {
        params.append('status', leavesStatusFilter);
      }
      params.append('page', leavesPage.toString());
      params.append('limit', '20');

      const res = await apiClient.get<ApiResponse<any>>(`/attendance?${params.toString()}`);
      return {
        items: res.data.data || [],
        meta: res.data.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
      };
    },
    enabled: !!activeBusiness?.id && activeTab === 'leaves',
  });

  // Default shift selection saat shifts dimuat
  useEffect(() => {
    if (shifts.length > 0 && !selectedShiftId) {
      setSelectedShiftId(shifts[0].id.toString());
    }
  }, [shifts, selectedShiftId]);

  // ============================================================
  // MUTATIONS (Clock In & Clock Out)
  // ============================================================
  const clockInMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/attendance/clock-in', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Absen masuk berhasil dicatat!');
      setNotes('');
      setCapturedPhoto(null);
      refetchToday();
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal melakukan absen masuk.');
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/attendance/clock-out', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Absen pulang berhasil dicatat!');
      setNotes('');
      setCapturedPhoto(null);
      refetchToday();
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal melakukan absen pulang.');
    },
  });

  const manualEntryMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/attendance/manual', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Data kehadiran manual berhasil disimpan!');
      setIsManualModalOpen(false);
      setManualNotes('');
      refetchToday();
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-leaves'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mencatat kehadiran manual.');
    },
  });

  const batchLeaveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/attendance/leave', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Jadwal libur/cuti berhasil disimpan!');
      setIsBatchLeaveModalOpen(false);
      setBatchLeaveDates([]);
      setBatchLeaveNotes('');
      refetchToday();
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-leaves'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mencatat jadwal libur/cuti.');
    },
  });

  const syncAlfaMutation = useMutation({
    mutationFn: async (payload?: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/attendance/sync-alfa', payload || {});
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Sinkronisasi Alfa otomatis selesai!');
      refetchToday();
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-leaves'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal sinkronisasi alfa otomatis.');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await apiClient.put<ApiResponse<any>>(`/attendance/${id}/status`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Status absensi berhasil diperbarui!');
      setIsEditStatusModalOpen(false);
      setEditingStatusItem(null);
      refetchToday();
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-leaves'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui status absensi.');
    },
  });

  const deleteAttendanceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete<ApiResponse<any>>(`/attendance/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Catatan absensi / jadwal libur berhasil dihapus!');
      refetchToday();
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-leaves'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus catatan absensi.');
    },
  });

  // ============================================================
  // ACTION HANDLERS
  // ============================================================
  const handleClockIn = () => {
    if (!selectedEmployeeId) {
      toast.error('Silakan pilih nama karyawan terlebih dahulu.');
      return;
    }

    const photoData = captureSnapshot();

    clockInMutation.mutate({
      employeeId: parseInt(selectedEmployeeId, 10),
      shiftId: selectedShiftId ? parseInt(selectedShiftId, 10) : undefined,
      photo: photoData || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const handleClockOut = () => {
    if (!selectedEmployeeId) {
      toast.error('Silakan pilih nama karyawan terlebih dahulu.');
      return;
    }

    const photoData = captureSnapshot();

    clockOutMutation.mutate({
      employeeId: parseInt(selectedEmployeeId, 10),
      photo: photoData || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const handleExportExcel = async () => {
    try {
      toast.loading('Menyiapkan file Excel absensi...', { id: 'export-att' });
      const params = new URLSearchParams();
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);
      if (filterEmployeeId) params.append('employeeId', filterEmployeeId);

      const res = await apiClient.get(`/attendance/export-excel?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Absensi_${filterStartDate}_sd_${filterEndDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Laporan absensi 2-sheet berhasil diunduh!', { id: 'export-att' });
    } catch {
      toast.error('Gagal mengekspor laporan absensi.', { id: 'export-att' });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmpId || !manualDate) {
      toast.error('Karyawan dan tanggal wajib diisi.');
      return;
    }

    manualEntryMutation.mutate({
      employeeId: parseInt(manualEmpId, 10),
      date: manualDate,
      status: manualStatus,
      notes: manualNotes.trim() || undefined,
    });
  };

  const handleDeleteAttendance = async (item: AttendanceHistoryItem) => {
    const statusLabel =
      item.status === 'HADIR'
        ? 'Hadir Tepat Waktu'
        : item.status === 'TERLAMBAT'
        ? `Terlambat (${item.lateMinutes} menit)`
        : item.status === 'PULANG_AWAL'
        ? 'Pulang Awal'
        : item.status === 'LIBUR'
        ? 'Libur Shift (Off)'
        : item.status === 'CUTI'
        ? 'Cuti Tahunan'
        : item.status === 'IZIN'
        ? 'Izin'
        : item.status === 'SAKIT'
        ? 'Sakit'
        : item.status === 'ALFA'
        ? 'Alfa (Mangkir)'
        : item.status;

    const confirmed = await confirmDialog({
      title: 'Hapus Catatan Presensi?',
      message: `Apakah Anda yakin ingin menghapus catatan presensi ini? Data kehadiran staf pada tanggal tersebut akan dihapus dan otomatis disesuaikan pada perhitungan gaji.`,
      confirmText: 'Ya, Hapus Presensi',
      type: 'danger',
      itemDetails: [
        { label: 'Karyawan', value: `${item.employee.name} (${item.employee.code})` },
        { label: 'Jabatan', value: item.employee.position },
        { label: 'Tanggal', value: formatTanggal(item.date) },
        { label: 'Status Presensi', value: statusLabel },
        {
          label: 'Jam Presensi',
          value: item.clockInTime
            ? `Masuk: ${new Date(item.clockInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
            : item.clockOutTime
            ? `Pulang: ${new Date(item.clockOutTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
            : 'Tidak ada jam masuk (Jadwal/Manual)',
        },
        ...(item.clockInNotes || item.clockOutNotes
          ? [{ label: 'Catatan', value: (item.clockInNotes || item.clockOutNotes)! }]
          : []),
      ],
    });

    if (confirmed) {
      deleteAttendanceMutation.mutate(item.id);
    }
  };

  // Helper status badge UI
  const renderStatusBadge = (status: string, lateMinutes = 0) => {
    switch (status) {
      case 'HADIR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Hadir Tepat Waktu
          </span>
        );
      case 'TERLAMBAT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Terlambat ({lateMinutes} mnt)
          </span>
        );
      case 'PULANG_AWAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pulang Awal
          </span>
        );
      case 'IZIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            Izin
          </span>
        );
      case 'SAKIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            Sakit
          </span>
        );
      case 'LIBUR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
            <Coffee className="w-3.5 h-3.5 text-indigo-600" />
            Libur Shift (Off)
          </span>
        );
      case 'CUTI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
            <CalendarCheck className="w-3.5 h-3.5 text-sky-600" />
            Cuti Tahunan
          </span>
        );
      case 'ALFA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-200 text-rose-900">
            Alfa (Mangkir)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-100 text-surface-500">
            Belum Absen
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-surface-200">
        <div>
          <div className="flex items-center gap-2 text-primary-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Sistem Presensi & Verifikasi Wajah</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
            Absensi Karyawan
          </h1>
          <p className="text-surface-500 text-sm mt-0.5">
            Presensi kehadiran staf harian terverifikasi selfie kamera lokal (100% Offline tanpa koneksi internet).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-surface-100 p-1 rounded-xl self-start md:self-auto border border-surface-200/80">
          <button
            onClick={() => setActiveTab('kiosk')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'kiosk'
                ? 'bg-white text-surface-900 shadow-sm'
                : 'text-surface-600 hover:text-surface-900'
            }`}
          >
            <Camera className="w-4 h-4 text-primary-600" />
            <span>Kios Absensi & Selfie</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'history'
                ? 'bg-white text-surface-900 shadow-sm'
                : 'text-surface-600 hover:text-surface-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-primary-600" />
            <span>Riwayat Presensi</span>
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'leaves'
                ? 'bg-white text-surface-900 shadow-sm'
                : 'text-surface-600 hover:text-surface-900'
            }`}
          >
            <Coffee className="w-4 h-4 text-indigo-600" />
            <span>Jadwal Libur & Izin Staf</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: KIOS ABSENSI & SELFIE */}
      {/* ============================================================ */}
      {activeTab === 'kiosk' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Viewfinder Kamera Live & Jam Digital (7 Kolom) */}
            <div className="lg:col-span-7 bg-surface-900 text-white rounded-2xl p-6 shadow-md border border-surface-800 flex flex-col justify-between overflow-hidden relative">
              {/* Digital Clock Banner */}
              <div className="flex items-center justify-between pb-4 border-b border-surface-800">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <div>
                    <p className="text-xs text-surface-400 font-medium">Waktu Presensi Presisi (WIB)</p>
                    <p className="text-xl font-mono font-bold text-white tracking-wide">
                      {currentTime.toLocaleTimeString('id-ID', { hour12: false })} WIB
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-surface-400 font-medium">Hari & Tanggal</p>
                  <p className="text-xs font-semibold text-surface-200">
                    {formatTanggal(currentTime)}
                  </p>
                </div>
              </div>

              {/* Kamera Viewfinder / Snapshot Box */}
              <div className="my-4 relative bg-surface-950 rounded-xl overflow-hidden border border-surface-800 aspect-video flex items-center justify-center">
                {/* Elemen Video Live: Selalu ter-mount agar stream tidak terputus */}
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform -scale-x-100 ${
                    cameraActive && !capturedPhoto ? 'block' : 'hidden'
                  }`}
                />

                {/* Tampilan Foto Snapshot jika sudah tertangkap */}
                {capturedPhoto && (
                  <img
                    src={capturedPhoto}
                    alt="Tangkapan Selfie"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Tampilan saat kamera tidak aktif dan belum ada foto */}
                {!cameraActive && !capturedPhoto && (
                  <div className="text-center p-6 text-surface-400">
                    <Camera className="w-12 h-12 mx-auto mb-2 text-surface-600" />
                    <p className="text-sm font-semibold text-surface-200">
                      {cameraError || 'Kamera sedang tidak aktif'}
                    </p>
                    <p className="text-xs text-surface-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      {cameraError?.includes('LAN')
                        ? cameraError
                        : 'Pastikan izin akses webcam telah diberikan, atau gunakan tombol Ambil/Unggah Foto di bawah.'}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs rounded-lg transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Hubungkan Kamera
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Ambil / Unggah Foto
                      </button>
                    </div>
                  </div>
                )}

                {/* Overlay Guide Frame & Tombol Jepret Foto saat kamera live */}
                {cameraActive && !capturedPhoto && (
                  <>
                    <div className="absolute inset-0 pointer-events-none border-2 border-emerald-500/40 m-6 rounded-2xl flex items-center justify-center">
                      <div className="w-40 h-48 border border-dashed border-emerald-400/60 rounded-full" />
                      <span className="absolute bottom-3 bg-surface-950/80 text-emerald-400 text-[10px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                        Posisikan Wajah di Tengah Frame
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleTakeSnapshot}
                      className="absolute bottom-3 right-3 bg-white/95 hover:bg-white text-surface-900 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-sm flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Camera className="w-3.5 h-3.5 text-primary-600" />
                      <span>Jepret Foto Selfie</span>
                    </button>
                  </>
                )}

                {/* Bar Aksi Jika Foto Sudah Tertangkap */}
                {capturedPhoto && (
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto">
                    <span className="bg-emerald-600/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-sm shadow flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Foto Selfie Siap Digunakan
                    </span>
                    <button
                      type="button"
                      onClick={handleRetakePhoto}
                      className="bg-surface-900/90 hover:bg-surface-900 text-white text-xs font-semibold px-3 py-1 rounded-lg backdrop-blur-sm shadow transition flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Ambil Ulang
                    </button>
                  </div>
                )}

                {/* Flash animation */}
                {isFlashing && (
                  <div className="absolute inset-0 bg-white pointer-events-none animate-ping opacity-60" />
                )}
              </div>

              {/* Kamera Fallback & Status Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-surface-800 text-xs">
                <div className="flex items-center gap-2 text-surface-400">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      cameraActive ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <span>{cameraActive ? 'Kamera Web Aktif' : 'Mode Offline / Manual'}</span>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-surface-400 hover:text-white transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Ambil / Unggah Foto (File/HP)</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            {/* Form Input Kios Absensi (5 Kolom) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-surface-200 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-surface-100">
                  <Sparkles className="w-5 h-5 text-primary-600" />
                  <div>
                    <h2 className="font-bold text-base text-surface-900">Form Kios Presensi</h2>
                    <p className="text-xs text-surface-500">Pilih staf dan tekan tombol presensi</p>
                  </div>
                </div>

                {/* Pilih Karyawan */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-surface-700">
                      Nama Karyawan <span className="text-rose-500">*</span>
                    </label>
                    {employees.length > 0 && (
                      <span className="text-[10px] text-surface-400 font-medium">
                        {employees.length} staf terdaftar
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium text-surface-900 bg-white shadow-sm"
                  >
                    <option value="">
                      {isLoadingEmployees
                        ? '-- Memuat daftar staf... --'
                        : employees.length === 0
                        ? '-- Belum ada staf terdaftar di Manajemen Gaji --'
                        : '-- Pilih Staf yang Hadir --'}
                    </option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — {emp.position} ({emp.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pilih Shift Kerja */}
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1.5">
                    Shift Kerja Hari Ini
                  </label>
                  <select
                    value={selectedShiftId}
                    onChange={(e) => setSelectedShiftId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime} WIB, +{s.gracePeriodMinutes}m)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Catatan / Keterangan */}
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1.5">
                    Catatan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Misal: Hadir lembur, tugas toko..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>

                {/* Snapshot Thumbnail Preview jika ada */}
                {capturedPhoto && (
                  <div className="p-3 bg-surface-50 rounded-xl border border-surface-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={capturedPhoto}
                        alt="Preview"
                        className="w-12 h-12 rounded-lg object-cover border border-surface-300 shadow-sm"
                      />
                      <div>
                        <p className="text-xs font-semibold text-surface-900">Foto Selfie Siap</p>
                        <p className="text-[10px] text-surface-500">Terekam untuk audit bukti absensi</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCapturedPhoto(null)}
                      className="text-surface-400 hover:text-rose-500 p-1"
                      title="Hapus foto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Tombol Absen Masuk & Pulang */}
              <div className="pt-6 space-y-3">
                <button
                  type="button"
                  disabled={clockInMutation.isPending || clockOutMutation.isPending}
                  onClick={handleClockIn}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <LogIn className="w-5 h-5" />
                  <span>
                    {clockInMutation.isPending ? 'Mencatat Absen Masuk...' : 'Absen Masuk (Clock In)'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={clockInMutation.isPending || clockOutMutation.isPending}
                  onClick={handleClockOut}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span>
                    {clockOutMutation.isPending ? 'Mencatat Absen Pulang...' : 'Absen Pulang (Clock Out)'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Feed Presensi Hari Ini (Live Realtime Status) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-100">
              <div>
                <h2 className="font-bold text-base text-surface-900">
                  Status Presensi Karyawan Hari Ini
                </h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  Daftar seluruh staf beserta status kehadiran pada {formatTanggal(new Date())}.
                </p>
              </div>

              {/* Status Counters */}
              {todayStatus?.summary && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-surface-100 font-semibold text-surface-700">
                    Total: {todayStatus.summary.totalEmployees}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 font-semibold text-emerald-800">
                    Hadir: {todayStatus.summary.presentCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100 font-semibold text-rose-800">
                    Terlambat: {todayStatus.summary.lateCount}
                  </span>
                  {(todayStatus.summary.liburCount ?? 0) > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-100 font-semibold text-indigo-800">
                      Libur Off: {todayStatus.summary.liburCount}
                    </span>
                  )}
                  {(todayStatus.summary.cutiCount ?? 0) > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-sky-100 font-semibold text-sky-800">
                      Cuti: {todayStatus.summary.cutiCount}
                    </span>
                  )}
                  {(todayStatus.summary.alfaCount ?? 0) > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-200 font-semibold text-rose-900">
                      Alfa: {todayStatus.summary.alfaCount}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-lg bg-surface-100 font-medium text-surface-500">
                    Belum Absen: {todayStatus.summary.notAttendedCount}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-5">
              {todayStatus?.items?.map((item) => (
                <div
                  key={item.employee.id}
                  className="p-4 rounded-xl border border-surface-200 hover:border-surface-300 transition bg-surface-50/40 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {item.clockInPhoto ? (
                        <img
                          src={item.clockInPhoto}
                          alt={item.employee.name}
                          onClick={() =>
                            setPreviewPhotoItem({
                              photo: item.clockInPhoto!,
                              employeeName: item.employee.name,
                              type: 'Masuk',
                              time: item.clockInTime ? formatTanggalJam(item.clockInTime) : '-',
                              status: item.status,
                            })
                          }
                          className="w-10 h-10 rounded-full object-cover border-2 border-primary-500 cursor-pointer shadow-sm hover:scale-105 transition"
                          title="Klik untuk perbesar foto"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-surface-200 text-surface-600 font-bold flex items-center justify-center text-xs">
                          {item.employee.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-xs text-surface-900 leading-tight">
                          {item.employee.name}
                        </h4>
                        <p className="text-[11px] text-surface-500">{item.employee.position}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    {renderStatusBadge(item.status, item.lateMinutes)}
                  </div>

                  <div className="text-[11px] text-surface-600 space-y-1 pt-2 border-t border-surface-200/60 font-mono">
                    <div className="flex justify-between">
                      <span className="text-surface-400">Masuk:</span>
                      <span className="font-medium">
                        {item.clockInTime
                          ? new Date(item.clockInTime).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-400">Pulang:</span>
                      <span className="font-medium">
                        {item.clockOutTime
                          ? new Date(item.clockOutTime).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: RIWAYAT & REKAP ABSENSI */}
      {/* ============================================================ */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Filter Bar & Export Actions */}
          <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const today = formatTanggalISO();
                    setFilterStartDate(today);
                    setFilterEndDate(today);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterStartDate === formatTanggalISO() && filterEndDate === formatTanggalISO()
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    setFilterStartDate(formatTanggalISO(d));
                    setFilterEndDate(formatTanggalISO());
                    setPage(1);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-100 text-surface-600 hover:bg-surface-200 transition"
                >
                  7 Hari Terakhir
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    setFilterStartDate(formatTanggalISO(new Date(d.getFullYear(), d.getMonth(), 1)));
                    setFilterEndDate(formatTanggalISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)));
                    setPage(1);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-100 text-surface-600 hover:bg-surface-200 transition"
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setPage(1);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-100 text-surface-600 hover:bg-surface-200 transition"
                >
                  Semua
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {isSuperAdminOrAdmin && (
                  <button
                    onClick={() => {
                      syncAlfaMutation.mutate({
                        startDate: filterStartDate,
                        endDate: filterEndDate,
                      });
                    }}
                    disabled={syncAlfaMutation.isPending}
                    title="Pindai ketidakhadiran staf tanpa jadwal libur/izin dan catat sebagai Alfa otomatis"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncAlfaMutation.isPending ? 'animate-spin' : ''}`} />
                    <span>{syncAlfaMutation.isPending ? 'Menyinkronkan...' : 'Sinkronisasi Alfa Otomatis'}</span>
                  </button>
                )}

                {isSuperAdminOrAdmin && (
                  <button
                    onClick={() => {
                      setManualEmpId(employees[0]?.id?.toString() || '');
                      setManualDate(formatTanggalISO());
                      setManualStatus('IZIN');
                      setManualNotes('');
                      setIsManualModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-800 text-white hover:bg-surface-900 transition shadow-sm"
                  >
                    <span>+ Catat Izin / Sakit</span>
                  </button>
                )}

                <button
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Excel (2 Sheet)</span>
                </button>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-surface-100 text-xs">
              <div>
                <label className="block font-semibold text-surface-700 mb-1">Mulai Tanggal</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => {
                    setFilterStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-surface-700 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => {
                    setFilterEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-surface-700 mb-1">Filter Karyawan</label>
                <select
                  value={filterEmployeeId}
                  onChange={(e) => {
                    setFilterEmployeeId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">Semua Karyawan</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-surface-700 mb-1">Filter Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="">Semua Status</option>
                  <option value="HADIR">Hadir Tepat Waktu</option>
                  <option value="TERLAMBAT">Terlambat</option>
                  <option value="PULANG_AWAL">Pulang Awal</option>
                  <option value="LIBUR">Libur Shift (Off)</option>
                  <option value="CUTI">Cuti Tahunan</option>
                  <option value="IZIN">Izin</option>
                  <option value="SAKIT">Sakit</option>
                  <option value="ALFA">Alfa (Mangkir)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabel Riwayat Absensi */}
          <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-50 text-surface-600 text-xs uppercase font-semibold border-b border-surface-200">
                  <tr>
                    <th className="px-5 py-3.5">Tanggal</th>
                    <th className="px-5 py-3.5">Foto Selfie</th>
                    <th className="px-5 py-3.5">Karyawan</th>
                    <th className="px-5 py-3.5">Shift</th>
                    <th className="px-5 py-3.5">Jam Masuk</th>
                    <th className="px-5 py-3.5">Jam Pulang</th>
                    <th className="px-5 py-3.5">Status & Telat</th>
                    <th className="px-5 py-3.5">Catatan</th>
                    <th className="px-5 py-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {isLoadingHistory ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-surface-400">
                        Memuat riwayat absensi...
                      </td>
                    </tr>
                  ) : historyData?.items?.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-surface-400">
                        Tidak ada data absensi untuk filter rentang waktu ini.
                      </td>
                    </tr>
                  ) : (
                    historyData?.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-50/60 transition">
                        <td className="px-5 py-3.5 text-xs font-medium text-surface-900">
                          {formatTanggal(item.date)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {item.clockInPhoto ? (
                              <button
                                onClick={() =>
                                  setPreviewPhotoItem({
                                    photo: item.clockInPhoto!,
                                    employeeName: item.employee.name,
                                    type: 'Masuk',
                                    time: item.clockInTime ? formatTanggalJam(item.clockInTime) : '-',
                                    status: item.status,
                                  })
                                }
                                className="group relative w-9 h-9 rounded-lg overflow-hidden border border-surface-300 hover:ring-2 hover:ring-primary-500 transition"
                                title="Lihat Foto Masuk"
                              >
                                <img
                                  src={item.clockInPhoto}
                                  alt="Selfie In"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </div>
                              </button>
                            ) : (
                              <span className="text-[11px] text-surface-400">-</span>
                            )}

                            {item.clockOutPhoto && (
                              <button
                                onClick={() =>
                                  setPreviewPhotoItem({
                                    photo: item.clockOutPhoto!,
                                    employeeName: item.employee.name,
                                    type: 'Pulang',
                                    time: item.clockOutTime ? formatTanggalJam(item.clockOutTime) : '-',
                                    status: item.status,
                                  })
                                }
                                className="group relative w-9 h-9 rounded-lg overflow-hidden border border-surface-300 hover:ring-2 hover:ring-blue-500 transition"
                                title="Lihat Foto Pulang"
                              >
                                <img
                                  src={item.clockOutPhoto}
                                  alt="Selfie Out"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </div>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-surface-900 text-xs">
                            {item.employee.name}
                          </div>
                          <div className="text-[11px] text-surface-500">
                            {item.employee.position} ({item.employee.code})
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-surface-600">
                          {item.shift?.name || 'Reguler'}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-emerald-700 font-medium">
                          {item.clockInTime
                            ? new Date(item.clockInTime).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-blue-700 font-medium">
                          {item.clockOutTime
                            ? new Date(item.clockOutTime).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </td>
                        <td className="px-5 py-3.5">
                          {renderStatusBadge(item.status, item.lateMinutes)}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-surface-500 max-w-xs truncate">
                          {item.clockInNotes || item.clockOutNotes || '-'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {isSuperAdminOrAdmin && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingStatusItem(item);
                                  setNewStatus(item.status);
                                  setEditStatusNotes(item.clockInNotes || item.clockOutNotes || '');
                                  setIsEditStatusModalOpen(true);
                                }}
                                title="Ubah / Koreksi Status"
                                className="p-1.5 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-surface-100 transition"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAttendance(item)}
                                title="Hapus Catatan Presensi"
                                className="p-1.5 rounded-lg text-surface-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {historyData?.meta && historyData.meta.totalPages > 1 && (
              <div className="p-4 border-t border-surface-100 flex items-center justify-between text-xs text-surface-500">
                <span>
                  Menampilkan halaman {historyData.meta.page} dari {historyData.meta.totalPages} (Total {historyData.meta.total} data)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-surface-300 disabled:opacity-40 hover:bg-surface-50"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={page >= historyData.meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-surface-300 disabled:opacity-40 hover:bg-surface-50"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: JADWAL LIBUR & IZIN STAF */}
      {/* ============================================================ */}
      {activeTab === 'leaves' && (
        <div className="space-y-6">
          {/* Header Action & Sync */}
          <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
                  <Coffee className="w-4 h-4" />
                  <span>Jadwal Roster, Cuti & Presensi Non-Harian</span>
                </div>
                <h2 className="text-lg font-bold text-surface-900 tracking-tight">
                  Jadwal Libur & Izin Staf
                </h2>
                <p className="text-surface-500 text-xs mt-0.5">
                  Atur jadwal hari libur (off) bergilir staf F&B/Retail tanpa memotong gaji pokok, kelola cuti/izin, serta verifikasi alfa otomatis.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {isSuperAdminOrAdmin && (
                  <button
                    onClick={() => {
                      syncAlfaMutation.mutate({
                        startDate: filterStartDate,
                        endDate: filterEndDate,
                      });
                    }}
                    disabled={syncAlfaMutation.isPending}
                    title="Pindai ketidakhadiran lampau tanpa jadwal libur/izin dan catat sebagai Alfa otomatis"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncAlfaMutation.isPending ? 'animate-spin' : ''}`} />
                    <span>{syncAlfaMutation.isPending ? 'Menyinkronkan...' : 'Sinkronisasi Alfa Otomatis'}</span>
                  </button>
                )}

                {isSuperAdminOrAdmin && (
                  <button
                    onClick={() => {
                      setBatchLeaveEmpId(employees[0]?.id?.toString() || '');
                      setBatchLeaveDates([formatTanggalISO()]);
                      setBatchLeaveInputDate(formatTanggalISO());
                      setBatchLeaveStatus('LIBUR');
                      setBatchLeaveNotes('');
                      setIsBatchLeaveModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Atur Jadwal Libur / Cuti</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Period & Status Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-surface-100 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const today = formatTanggalISO();
                    setFilterStartDate(today);
                    setFilterEndDate(today);
                    setLeavesPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterStartDate === formatTanggalISO() && filterEndDate === formatTanggalISO()
                      ? 'bg-indigo-600 text-white'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    setFilterStartDate(formatTanggalISO(new Date(d.getFullYear(), d.getMonth(), 1)));
                    setFilterEndDate(formatTanggalISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)));
                    setLeavesPage(1);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-100 text-surface-600 hover:bg-surface-200 transition"
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setLeavesPage(1);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-100 text-surface-600 hover:bg-surface-200 transition"
                >
                  Semua Waktu
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={leavesEmpFilter}
                  onChange={(e) => {
                    setLeavesEmpFilter(e.target.value);
                    setLeavesPage(1);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Semua Karyawan</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>

                <select
                  value={leavesStatusFilter}
                  onChange={(e) => {
                    setLeavesStatusFilter(e.target.value);
                    setLeavesPage(1);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Semua Status Libur/Izin</option>
                  <option value="LIBUR">Libur Shift (Off)</option>
                  <option value="CUTI">Cuti Tahunan</option>
                  <option value="IZIN">Izin</option>
                  <option value="SAKIT">Sakit</option>
                  <option value="ALFA">Alfa (Mangkir Otomatis)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ringkasan Kuota Libur Staf (Bulanan) */}
          <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-surface-900 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-indigo-600" />
                  <span>Monitoring Kuota Hari Libur Staf Bulan Berjalan</span>
                </h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  Setiap staf memiliki jatah kuota libur bulanan (default 4 hari). Gaji pokok staf tetap 100% utuh saat libur.
                </p>
              </div>
            </div>

            {/* Table Monitor Kuota Libur Staf */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-50 text-surface-600 font-semibold border-b border-surface-200 uppercase">
                    <th className="px-4 py-2.5">Staf</th>
                    <th className="px-4 py-2.5 text-center">Kuota Bulanan</th>
                    <th className="px-4 py-2.5 text-center">Libur Terpakai (Off)</th>
                    <th className="px-4 py-2.5 text-center">Sisa Kuota Libur</th>
                    <th className="px-4 py-2.5 text-center">Cuti</th>
                    <th className="px-4 py-2.5 text-center">Izin / Sakit</th>
                    <th className="px-4 py-2.5 text-center">Alfa (Mangkir)</th>
                    <th className="px-4 py-2.5 text-center">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {isLoadingSummary ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-surface-400">
                        Memuat data kuota libur staf...
                      </td>
                    </tr>
                  ) : summaryRecapData?.recaps?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-surface-400">
                        Belum ada data staf terdaftar.
                      </td>
                    </tr>
                  ) : (
                    summaryRecapData?.recaps?.map((r) => (
                      <tr key={r.employee.id} className="hover:bg-surface-50/70 transition">
                        <td className="px-4 py-3">
                          <p className="font-bold text-surface-900">{r.employee.name}</p>
                          <p className="text-[11px] text-surface-500">{r.employee.position} ({r.employee.code})</p>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-semibold text-surface-700">
                          {r.monthlyDayOffQuota || 4} Hari
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-indigo-700">
                          {r.liburCount || 0} Hari
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              (r.remainingDayOffQuota || 0) > 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-surface-100 text-surface-500'
                            }`}
                          >
                            {r.remainingDayOffQuota || 0} Hari
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-sky-700 font-medium">
                          {r.cutiCount || 0} Hari
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-surface-600">
                          {(r.izinCount || 0) + (r.sakitCount || 0)} Hari
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold">
                          {(r.alfaCount || 0) > 0 ? (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              {r.alfaCount} Hari
                            </span>
                          ) : (
                            <span className="text-surface-400 font-normal">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isSuperAdminOrAdmin && (
                            <button
                              onClick={() => {
                                setBatchLeaveEmpId(r.employee.id.toString());
                                setBatchLeaveDates([formatTanggalISO()]);
                                setBatchLeaveInputDate(formatTanggalISO());
                                setBatchLeaveStatus('LIBUR');
                                setBatchLeaveNotes('');
                                setIsBatchLeaveModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
                            >
                              <Plus className="w-3 h-3" />
                              <span>+ Atur Libur</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daftar Jadwal Libur, Cuti & Alfa Terpilih */}
          <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-surface-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-surface-900">
                  Riwayat Jadwal Libur, Cuti, Izin & Alfa
                </h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  Daftar seluruh tanggal staf tidak masuk bekerja (libur terjadwal, cuti, izin, sakit, maupun alfa).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-50 text-surface-600 text-xs uppercase font-semibold border-b border-surface-200">
                  <tr>
                    <th className="px-5 py-3.5">Tanggal</th>
                    <th className="px-5 py-3.5">Karyawan</th>
                    <th className="px-5 py-3.5">Jabatan</th>
                    <th className="px-5 py-3.5">Status Presensi</th>
                    <th className="px-5 py-3.5">Catatan / Alasan</th>
                    <th className="px-5 py-3.5">Dicatat Oleh</th>
                    <th className="px-5 py-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {isLoadingLeaves ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-surface-400">
                        Memuat data jadwal libur & izin staf...
                      </td>
                    </tr>
                  ) : leavesListData?.items?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-surface-400">
                        Tidak ada catatan libur, cuti, atau izin pada rentang filter ini.
                      </td>
                    </tr>
                  ) : (
                    leavesListData?.items
                      ?.filter((item) =>
                        ['LIBUR', 'CUTI', 'IZIN', 'SAKIT', 'ALFA'].includes(item.status)
                      )
                      ?.map((item) => (
                        <tr key={item.id} className="hover:bg-surface-50/60 transition">
                          <td className="px-5 py-3.5 text-xs font-semibold text-surface-900">
                            {formatTanggal(item.date)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-surface-900 text-xs">
                              {item.employee.name}
                            </div>
                            <div className="text-[11px] text-surface-500 font-mono">
                              {item.employee.code}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-surface-600">
                            {item.employee.position}
                          </td>
                          <td className="px-5 py-3.5">
                            {renderStatusBadge(item.status)}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-surface-600 max-w-sm truncate">
                            {item.clockInNotes || item.clockOutNotes || '-'}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-surface-500">
                            {item.createdBy?.fullName || 'Sistem Otomatis'}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {isSuperAdminOrAdmin && (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingStatusItem(item);
                                    setNewStatus(item.status);
                                    setEditStatusNotes(item.clockInNotes || item.clockOutNotes || '');
                                    setIsEditStatusModalOpen(true);
                                  }}
                                  title="Ubah / Koreksi Status (Misal: Ubah Alfa ke Sakit/Libur)"
                                  className="p-1.5 rounded-lg text-surface-600 hover:text-indigo-600 hover:bg-surface-100 transition"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAttendance(item)}
                                  title="Hapus Catatan"
                                  className="p-1.5 rounded-lg text-surface-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {leavesListData?.meta && leavesListData.meta.totalPages > 1 && (
              <div className="p-4 border-t border-surface-100 flex items-center justify-between text-xs text-surface-500">
                <span>
                  Halaman {leavesListData.meta.page} dari {leavesListData.meta.totalPages} (Total {leavesListData.meta.total} data)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={leavesPage <= 1}
                    onClick={() => setLeavesPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-surface-300 disabled:opacity-40 hover:bg-surface-50"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={leavesPage >= leavesListData.meta.totalPages}
                    onClick={() => setLeavesPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-surface-300 disabled:opacity-40 hover:bg-surface-50"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL PREVIEW FOTO SELFIE HIGH-RES */}
      {/* ============================================================ */}
      {previewPhotoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-surface-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100 bg-surface-50">
              <div>
                <h3 className="font-bold text-sm text-surface-900">
                  Foto Bukti Absen {previewPhotoItem.type}
                </h3>
                <p className="text-xs text-surface-500">{previewPhotoItem.employeeName}</p>
              </div>
              <button
                onClick={() => setPreviewPhotoItem(null)}
                className="text-surface-400 hover:text-surface-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="rounded-xl overflow-hidden border border-surface-200 bg-surface-950 aspect-[4/3]">
                <img
                  src={previewPhotoItem.photo}
                  alt="Bukti Selfie"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-3 bg-surface-50 rounded-xl border border-surface-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-surface-500">Waktu Terverifikasi:</span>
                  <span className="font-semibold text-surface-900">{previewPhotoItem.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-surface-500">Status Kehadiran:</span>
                  <span>{renderStatusBadge(previewPhotoItem.status)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL INPUT MANUAL (IZIN / SAKIT / ALFA) */}
      {/* ============================================================ */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-surface-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-surface-50/50">
              <h3 className="font-bold text-base text-surface-900">
                Pencatatan Kehadiran Khusus / Izin
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-surface-400 hover:text-surface-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Nama Karyawan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={manualEmpId}
                  onChange={(e) => setManualEmpId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                  required
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.code}) — {emp.position}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Tanggal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Status Presensi <span className="text-rose-500">*</span>
                </label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white font-medium"
                >
                  <option value="IZIN">IZIN (Surat Izin Resmi)</option>
                  <option value="SAKIT">SAKIT (Surat Dokter / Sakit)</option>
                  <option value="ALFA">ALFA (Mangkir Tanpa Kabar)</option>
                  <option value="HADIR">HADIR (Koreksi Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Keterangan / Alasan
                </label>
                <textarea
                  rows={3}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Contoh: Mengurus keperluan keluarga mendesak..."
                  className="w-full px-3.5 py-2 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2.5 border border-surface-300 text-surface-700 rounded-xl text-sm font-medium hover:bg-surface-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={manualEntryMutation.isPending}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition shadow-sm disabled:opacity-50"
                >
                  {manualEntryMutation.isPending ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL JADWAL LIBUR & CUTI BATCH (MULTI-DATE) */}
      {/* ============================================================ */}
      {isBatchLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-surface-200 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-surface-50/50">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-surface-900">
                  Jadwal Hari Libur / Cuti / Izin Staf
                </h3>
              </div>
              <button
                onClick={() => setIsBatchLeaveModalOpen(false)}
                className="text-surface-400 hover:text-surface-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!batchLeaveEmpId) {
                  toast.error('Pilih staf terlebih dahulu.');
                  return;
                }
                if (batchLeaveDates.length === 0) {
                  toast.error('Pilih minimal 1 tanggal hari libur / izin.');
                  return;
                }
                batchLeaveMutation.mutate({
                  employeeId: parseInt(batchLeaveEmpId, 10),
                  dates: batchLeaveDates,
                  status: batchLeaveStatus,
                  notes: batchLeaveNotes.trim() || undefined,
                });
              }}
              className="p-6 space-y-4"
            >
              {/* Karyawan Select */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Pilih Staf / Karyawan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={batchLeaveEmpId}
                  onChange={(e) => setBatchLeaveEmpId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                  required
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.code}) — {emp.position} (Kuota Libur: {emp.monthlyDayOffQuota ?? 4} hr/bln)
                    </option>
                  ))}
                </select>
              </div>

              {/* Jenis Presensi */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Jenis Jadwal / Keterangan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={batchLeaveStatus}
                  onChange={(e) => setBatchLeaveStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white font-medium"
                >
                  <option value="LIBUR">LIBUR (Jadwal Libur Rutin / Shift Off) — Gaji utuh, Potongan Rp 0</option>
                  <option value="CUTI">CUTI (Cuti Tahunan Staf)</option>
                  <option value="IZIN">IZIN (Surat Izin Resmi / Keperluan Pribadi)</option>
                  <option value="SAKIT">SAKIT (Surat Dokter / Sakit)</option>
                </select>
                <p className="text-[11px] text-surface-500 mt-1">
                  {batchLeaveStatus === 'LIBUR'
                    ? 'Libur shift tidak memotong gaji pokok, uang makan Rp 0, dan tidak dikenakan denda alfa.'
                    : batchLeaveStatus === 'CUTI'
                    ? 'Cuti tahunan resmi yang disetujui manajemen unit usaha.'
                    : 'Tidak mendapatkan uang makan harian pada tanggal ini.'}
                </p>
              </div>

              {/* Pemilihan Multi Tanggal */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Pilih Tanggal Libur / Izin <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={batchLeaveInputDate}
                    onChange={(e) => setBatchLeaveInputDate(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!batchLeaveInputDate) return;
                      if (!batchLeaveDates.includes(batchLeaveInputDate)) {
                        setBatchLeaveDates([...batchLeaveDates, batchLeaveInputDate].sort());
                      } else {
                        toast('Tanggal tersebut sudah ada di daftar pilihan.', { icon: 'ℹ️' });
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                </div>

                {/* Quick Date Shortcuts */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                  <span className="text-[11px] text-surface-400 font-medium">Tambah Cepat:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const d = formatTanggalISO();
                      if (!batchLeaveDates.includes(d)) setBatchLeaveDates([...batchLeaveDates, d].sort());
                    }}
                    className="px-2 py-0.5 rounded-md bg-surface-100 hover:bg-surface-200 text-surface-600 text-[11px]"
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      const s = formatTanggalISO(d);
                      if (!batchLeaveDates.includes(s)) setBatchLeaveDates([...batchLeaveDates, s].sort());
                    }}
                    className="px-2 py-0.5 rounded-md bg-surface-100 hover:bg-surface-200 text-surface-600 text-[11px]"
                  >
                    Besok
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 2);
                      const s = formatTanggalISO(d);
                      if (!batchLeaveDates.includes(s)) setBatchLeaveDates([...batchLeaveDates, s].sort());
                    }}
                    className="px-2 py-0.5 rounded-md bg-surface-100 hover:bg-surface-200 text-surface-600 text-[11px]"
                  >
                    Lusa
                  </button>
                </div>

                {/* Chips of Selected Dates */}
                <div className="mt-3 p-3 bg-surface-50 rounded-xl border border-surface-200 min-h-[60px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-surface-600">
                      Tanggal Dipilih ({batchLeaveDates.length} hari):
                    </span>
                    {batchLeaveDates.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setBatchLeaveDates([])}
                        className="text-[11px] text-rose-600 hover:underline"
                      >
                        Hapus Semua
                      </button>
                    )}
                  </div>

                  {batchLeaveDates.length === 0 ? (
                    <p className="text-xs text-surface-400 italic">
                      Belum ada tanggal dipilih. Masukkan tanggal di atas lalu klik Tambah.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {batchLeaveDates.map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200"
                        >
                          <Calendar className="w-3 h-3 text-indigo-600" />
                          <span>{formatTanggal(d)}</span>
                          <button
                            type="button"
                            onClick={() => setBatchLeaveDates(batchLeaveDates.filter((x) => x !== d))}
                            className="hover:text-rose-600 ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Catatan / Keterangan Jadwal
                </label>
                <textarea
                  rows={2}
                  value={batchLeaveNotes}
                  onChange={(e) => setBatchLeaveNotes(e.target.value)}
                  placeholder="Contoh: Jadwal roster shift off minggu ke-2..."
                  className="w-full px-3.5 py-2 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setIsBatchLeaveModalOpen(false)}
                  className="px-4 py-2.5 border border-surface-300 text-surface-700 rounded-xl text-sm font-medium hover:bg-surface-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={batchLeaveMutation.isPending || batchLeaveDates.length === 0}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
                >
                  {batchLeaveMutation.isPending
                    ? 'Menyimpan Jadwal...'
                    : `Simpan Jadwal (${batchLeaveDates.length} Hari)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL UBAH / KOREKSI STATUS PRESENSI (OVERRIDE) */}
      {/* ============================================================ */}
      {isEditStatusModalOpen && editingStatusItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-surface-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-surface-50/50">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-base text-surface-900">
                  Koreksi Status Presensi Staf
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsEditStatusModalOpen(false);
                  setEditingStatusItem(null);
                }}
                className="text-surface-400 hover:text-surface-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateStatusMutation.mutate({
                  id: editingStatusItem.id,
                  payload: {
                    status: newStatus,
                    notes: editStatusNotes.trim() || undefined,
                  },
                });
              }}
              className="p-6 space-y-4"
            >
              {/* Target Item Details */}
              <div className="p-3 bg-surface-50 rounded-xl border border-surface-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-surface-500">Nama Staf:</span>
                  <span className="font-bold text-surface-900">{editingStatusItem.employee.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Tanggal:</span>
                  <span className="font-semibold text-surface-800">{formatTanggal(editingStatusItem.date)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-surface-500">Status Saat Ini:</span>
                  <span>{renderStatusBadge(editingStatusItem.status, editingStatusItem.lateMinutes)}</span>
                </div>
              </div>

              {/* Status Baru Select */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Ubah Menjadi Status Baru <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white font-medium"
                >
                  <option value="HADIR">HADIR (Hadir Tepat Waktu)</option>
                  <option value="TERLAMBAT">TERLAMBAT</option>
                  <option value="PULANG_AWAL">PULANG AWAL</option>
                  <option value="LIBUR">LIBUR (Jadwal Libur Rutin / Shift Off)</option>
                  <option value="CUTI">CUTI (Cuti Tahunan)</option>
                  <option value="IZIN">IZIN (Surat Izin Resmi)</option>
                  <option value="SAKIT">SAKIT (Surat Dokter / Sakit)</option>
                  <option value="ALFA">ALFA (Mangkir Tanpa Kabar)</option>
                </select>
                <p className="text-[11px] text-surface-500 mt-1">
                  {newStatus === 'LIBUR'
                    ? 'Status Libur Shift akan menjaga gaji pokok utuh dan denda alfa Rp 0.'
                    : newStatus === 'SAKIT' || newStatus === 'IZIN'
                    ? 'Status Sakit/Izin membebaskan denda alfa (namun uang makan Rp 0).'
                    : 'Perubahan status langsung mempengaruhi kalkulasi penggajian staf periode ini.'}
                </p>
              </div>

              {/* Catatan Revisi */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Catatan Koreksi Admin
                </label>
                <textarea
                  rows={3}
                  value={editStatusNotes}
                  onChange={(e) => setEditStatusNotes(e.target.value)}
                  placeholder="Contoh: Koreksi dari Alfa ke Sakit karena staf menyerahkan surat dokter..."
                  className="w-full px-3.5 py-2 rounded-xl border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditStatusModalOpen(false);
                    setEditingStatusItem(null);
                  }}
                  className="px-4 py-2.5 border border-surface-300 text-surface-700 rounded-xl text-sm font-medium hover:bg-surface-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition shadow-sm disabled:opacity-50"
                >
                  {updateStatusMutation.isPending ? 'Menyimpan...' : 'Perbarui Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendancePage;
