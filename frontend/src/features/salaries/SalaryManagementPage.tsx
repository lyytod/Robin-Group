import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Banknote,
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Printer,
  Receipt,
  DollarSign,
  Filter,
  X,
  Briefcase,
  RotateCcw,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Clock,
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

interface EmployeeItem {
  id: number;
  businessId: number;
  userId?: number | null;
  code: string;
  name: string;
  position: string;
  phone?: string | null;
  salaryType: 'BULANAN' | 'HARIAN';
  baseSalary: number;
  allowance: number;
  totalFixedSalary: number;
  pendingDeductionsTotal?: number;
  bankName?: string | null;
  bankAccount?: string | null;
  joinDate: string;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  totalPaymentsCount: number;
  user?: { id: number; username: string; role: string } | null;
}

interface SalaryPaymentItem {
  id: number;
  businessId: number;
  employeeId: number;
  paymentNumber: string;
  employee: {
    id: number;
    code: string;
    name: string;
    position: string;
  };
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  baseSalary: number;
  allowance: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  paymentMethod: 'TUNAI' | 'TRANSFER' | 'QRIS' | 'DEBIT' | 'KREDIT';
  account: {
    id: number;
    code: string;
    name: string;
  };
  journalEntry?: {
    id: number;
    nomorJurnal: string;
  } | null;
  settledDeductions?: {
    id: number;
    amount: number;
    type: string;
    date: string;
    notes?: string | null;
  }[];
  appliedDeductions?: {
    id: number;
    deductionId: number;
    amountApplied: number;
    originalAmount: number;
    remainingAmount: number;
    type: string;
    date: string;
    notes?: string | null;
  }[];
  notes?: string | null;
  creator: string;
  createdAt: string;
}

interface EmployeeDeductionItem {
  id: number;
  businessId: number;
  employeeId: number;
  employee: {
    id: number;
    code: string;
    name: string;
    position: string;
  };
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  type: string;
  date: string;
  notes?: string | null;
  status: 'PENDING' | 'PARTIAL' | 'SETTLED';
  creator: string;
  salaryPayment?: {
    id: number;
    paymentNumber: string;
    paymentDate: string;
  } | null;
  createdAt: string;
}

interface AccountOption {
  id: number;
  code: string;
  name: string;
  type: string;
}

interface UserOption {
  id: number;
  username: string;
  fullName: string;
  role: string;
}

export function SalaryManagementPage() {
  const queryClient = useQueryClient();
  const { activeBusiness } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'employees' | 'payments' | 'deductions'>('employees');

  // Filter Karyawan
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<string>('ALL');

  // Filter Pembayaran Gaji
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentEmployeeFilter, setPaymentEmployeeFilter] = useState<string>('');
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');

  // Filter Kasbon / Potongan
  const [deductionEmployeeFilter, setDeductionEmployeeFilter] = useState<string>('');
  const [deductionStatusFilter, setDeductionStatusFilter] = useState<string>('ALL');

  // Modals
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSlipPayment, setSelectedSlipPayment] = useState<SalaryPaymentItem | null>(null);

  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);

  // Form State Karyawan
  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [empPosition, setEmpPosition] = useState('Kasir');
  const [empPhone, setEmpPhone] = useState('');
  const [empSalaryType, setEmpSalaryType] = useState<'BULANAN' | 'HARIAN'>('BULANAN');
  const [empBaseSalary, setEmpBaseSalary] = useState('2500000');
  const [empAllowance, setEmpAllowance] = useState('300000');
  const [empBankName, setEmpBankName] = useState('');
  const [empBankAccount, setEmpBankAccount] = useState('');
  const [empJoinDate, setEmpJoinDate] = useState(() => formatTanggalISO());
  const [empIsActive, setEmpIsActive] = useState(true);
  const [empNotes, setEmpNotes] = useState('');
  const [empUserId, setEmpUserId] = useState<string>('');

  // Form State Pembayaran Gaji
  const [payEmployeeId, setPayEmployeeId] = useState<string>('');
  const [payPeriodStart, setPayPeriodStart] = useState(() => {
    const d = new Date();
    return formatTanggalISO(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [payPeriodEnd, setPayPeriodEnd] = useState(() => formatTanggalISO());
  const [payDate, setPayDate] = useState(() => formatTanggalISO());
  const [payBaseSalary, setPayBaseSalary] = useState('');
  const [payAllowance, setPayAllowance] = useState('');
  const [payBonus, setPayBonus] = useState('0');
  const [payDeductions, setPayDeductions] = useState('0');
  const [payPendingKasbonInfo, setPayPendingKasbonInfo] = useState<{ amount: number; count: number }>({
    amount: 0,
    count: 0,
  });
  const [payMethod, setPayMethod] = useState<'TUNAI' | 'TRANSFER'>('TUNAI');
  const [payAccountId, setPayAccountId] = useState<string>('');
  const [payNotes, setPayNotes] = useState('');

  // Form State Catat Kasbon / Potongan
  const [dedEmpId, setDedEmpId] = useState<string>('');
  const [dedAmount, setDedAmount] = useState<string>('');
  const [dedType, setDedType] = useState<'KASBON' | 'POTONGAN'>('KASBON');
  const [dedDate, setDedDate] = useState(() => formatTanggalISO());
  const [dedNotes, setDedNotes] = useState<string>('');

  // Fetch Summary KPI
  const { data: summaryData } = useQuery({
    queryKey: ['salary-summary', activeBusiness?.id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<any>>('/salaries/summary');
      return res.data.data;
    },
    enabled: !!activeBusiness?.id,
  });

  // Fetch Karyawan
  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees', activeBusiness?.id, employeeSearch, employeeStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (employeeSearch) params.append('search', employeeSearch);
      if (employeeStatusFilter === 'ACTIVE') params.append('isActive', 'true');
      if (employeeStatusFilter === 'INACTIVE') params.append('isActive', 'false');
      params.append('limit', '100');
      const res = await apiClient.get<ApiResponse<EmployeeItem[]>>(`/salaries/employees?${params.toString()}`);
      return res.data.data ?? [];
    },
    enabled: !!activeBusiness?.id,
  });

  // Fetch Riwayat Pembayaran Gaji
  const { data: paymentsData, isLoading: isLoadingPayments } = useQuery({
    queryKey: [
      'salary-payments',
      activeBusiness?.id,
      paymentSearch,
      paymentEmployeeFilter,
      paymentStartDate,
      paymentEndDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (paymentSearch) params.append('search', paymentSearch);
      if (paymentEmployeeFilter) params.append('employeeId', paymentEmployeeFilter);
      if (paymentStartDate) params.append('startDate', paymentStartDate);
      if (paymentEndDate) params.append('endDate', paymentEndDate);
      params.append('limit', '100');
      const res = await apiClient.get<ApiResponse<SalaryPaymentItem[]>>(`/salaries/payments?${params.toString()}`);
      return res.data.data ?? [];
    },
    enabled: !!activeBusiness?.id,
  });

  // Fetch Riwayat Kasbon & Potongan
  const { data: deductionsData, isLoading: isLoadingDeductions } = useQuery({
    queryKey: ['salary-deductions', activeBusiness?.id, deductionEmployeeFilter, deductionStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (deductionEmployeeFilter) params.append('employeeId', deductionEmployeeFilter);
      if (deductionStatusFilter !== 'ALL') params.append('status', deductionStatusFilter);
      params.append('limit', '100');
      const res = await apiClient.get<ApiResponse<EmployeeDeductionItem[]>>(
        `/salaries/deductions?${params.toString()}`
      );
      return res.data.data ?? [];
    },
    enabled: !!activeBusiness?.id,
  });

  // Fetch Kas & Bank Accounts untuk pembayaran
  const { data: accountsList } = useQuery({
    queryKey: ['accounts', activeBusiness?.id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<AccountOption[]>>('/accounts');
      return res.data.data ?? [];
    },
    enabled: !!activeBusiness?.id,
  });

  // Fetch Users (untuk menghubungkan staf dengan akun login sistem)
  const { data: usersList } = useQuery({
    queryKey: ['users-options'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<UserOption[]>>('/users');
      return res.data.data ?? [];
    },
    enabled: isEmployeeModalOpen,
  });

  const paymentAccounts =
    accountsList?.filter(
      (a) =>
        a.type === 'ASET' &&
        (a.code.startsWith('1-1001') || a.code.startsWith('1-1002') || a.code.startsWith('1-1003'))
    ) ?? [];

  // ============================================================
  // MUTATIONS
  // ============================================================

  const createEmployeeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/salaries/employees', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Karyawan baru berhasil ditambahkan!');
      setIsEmployeeModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menambahkan karyawan.');
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await apiClient.put<ApiResponse<any>>(`/salaries/employees/${id}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Data karyawan berhasil diperbarui!');
      setIsEmployeeModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui karyawan.');
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete<ApiResponse<any>>(`/salaries/employees/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Karyawan berhasil dinonaktifkan.');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus karyawan.');
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/salaries/payments', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Pembayaran gaji berhasil dicatat dan diposting ke Jurnal Akuntansi!');
      setIsPaymentModalOpen(false);
      // Invalidate queries agar kasbon kembali 0 dan data gaji terupdate
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['salary-payments'] });
      queryClient.invalidateQueries({ queryKey: ['salary-deductions'] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      // Buka otomatis slip gaji jika ada data payment
      if (data.data) {
        setSelectedSlipPayment(data.data);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memproses pembayaran gaji.');
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete<ApiResponse<any>>(`/salaries/payments/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Pembayaran gaji & jurnal pembukuan berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['salary-payments'] });
      queryClient.invalidateQueries({ queryKey: ['salary-deductions'] });
      queryClient.invalidateQueries({ queryKey: ['salary-summary'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus pembayaran gaji.');
    },
  });

  const createDeductionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/salaries/deductions', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Catatan kasbon / potongan berhasil disimpan!');
      setIsDeductionModalOpen(false);
      setDedAmount('');
      setDedNotes('');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['salary-deductions'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mencatat kasbon/potongan.');
    },
  });

  const deleteDeductionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete<ApiResponse<any>>(`/salaries/deductions/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Kasbon/potongan berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['salary-deductions'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus kasbon.');
    },
  });

  // ============================================================
  // HANDLERS
  // ============================================================

  const openCreateEmployeeModal = () => {
    setEditingEmployee(null);
    setEmpCode(`STF-${Math.floor(100 + Math.random() * 900)}`);
    setEmpName('');
    setEmpPosition('Kasir');
    setEmpPhone('');
    setEmpSalaryType('BULANAN');
    setEmpBaseSalary('2500000');
    setEmpAllowance('300000');
    setEmpBankName('');
    setEmpBankAccount('');
    setEmpJoinDate(formatTanggalISO());
    setEmpIsActive(true);
    setEmpNotes('');
    setEmpUserId('');
    setIsEmployeeModalOpen(true);
  };

  const openEditEmployeeModal = (emp: EmployeeItem) => {
    setEditingEmployee(emp);
    setEmpCode(emp.code);
    setEmpName(emp.name);
    setEmpPosition(emp.position);
    setEmpPhone(emp.phone || '');
    setEmpSalaryType(emp.salaryType);
    setEmpBaseSalary(emp.baseSalary.toString());
    setEmpAllowance(emp.allowance.toString());
    setEmpBankName(emp.bankName || '');
    setEmpBankAccount(emp.bankAccount || '');
    setEmpJoinDate(emp.joinDate ? formatTanggalISO(emp.joinDate) : formatTanggalISO());
    setEmpIsActive(emp.isActive);
    setEmpNotes(emp.notes || '');
    setEmpUserId(emp.userId ? emp.userId.toString() : '');
    setIsEmployeeModalOpen(true);
  };

  const handleEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empCode.trim() || !empName.trim() || !empPosition.trim()) {
      toast.error('Kode, nama, dan jabatan karyawan wajib diisi.');
      return;
    }

    const payload = {
      code: empCode.trim(),
      name: empName.trim(),
      position: empPosition.trim(),
      phone: empPhone.trim() || undefined,
      salaryType: empSalaryType,
      baseSalary: parseFloat(empBaseSalary) || 0,
      allowance: parseFloat(empAllowance) || 0,
      bankName: empBankName.trim() || undefined,
      bankAccount: empBankAccount.trim() || undefined,
      joinDate: empJoinDate ? combineDateWithLocalTime(empJoinDate) : undefined,
      isActive: empIsActive,
      notes: empNotes.trim() || undefined,
      userId: empUserId ? parseInt(empUserId, 10) : undefined,
    };

    if (editingEmployee) {
      updateEmployeeMutation.mutate({ id: editingEmployee.id, payload });
    } else {
      createEmployeeMutation.mutate(payload);
    }
  };

  // Buka modal proses pembayaran gaji (otomatis mengambil akumulasi kasbon belum lunas)
  const openCreatePaymentModal = async (defaultEmployee?: EmployeeItem) => {
    const targetEmp = defaultEmployee || employeesData?.[0];
    const d = new Date();
    const empId = targetEmp ? targetEmp.id.toString() : '';
    setPayEmployeeId(empId);
    setPayPeriodStart(formatTanggalISO(new Date(d.getFullYear(), d.getMonth(), 1)));
    setPayPeriodEnd(formatTanggalISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)));
    setPayDate(formatTanggalISO());
    setPayBaseSalary(targetEmp ? targetEmp.baseSalary.toString() : '0');
    setPayAllowance(targetEmp ? targetEmp.allowance.toString() : '0');
    setPayBonus('0');
    setPayMethod(targetEmp?.bankAccount ? 'TRANSFER' : 'TUNAI');

    // Otomatis isi akumulasi kasbon pending
    if (empId) {
      try {
        const res = await apiClient.get<ApiResponse<any>>(
          `/salaries/employees/${empId}/pending-deductions`
        );
        const totalPending = res.data.data?.totalAmount || 0;
        const countPending = res.data.data?.count || 0;
        setPayDeductions(totalPending.toString());
        setPayPendingKasbonInfo({ amount: totalPending, count: countPending });
      } catch {
        const fallback = targetEmp?.pendingDeductionsTotal || 0;
        setPayDeductions(fallback.toString());
        setPayPendingKasbonInfo({ amount: fallback, count: fallback > 0 ? 1 : 0 });
      }
    } else {
      setPayDeductions('0');
      setPayPendingKasbonInfo({ amount: 0, count: 0 });
    }

    // Default Akun Kas Utama (1-1001) atau Bank (1-1003)
    const defAccount =
      paymentAccounts.find((a) => (targetEmp?.bankAccount ? a.code === '1-1003' : a.code === '1-1001')) ||
      paymentAccounts[0];
    setPayAccountId(defAccount ? defAccount.id.toString() : '');
    setPayNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleSelectEmployeeForPayment = async (empId: string) => {
    setPayEmployeeId(empId);
    const emp = employeesData?.find((e) => e.id.toString() === empId);
    if (emp) {
      setPayBaseSalary(emp.baseSalary.toString());
      setPayAllowance(emp.allowance.toString());
      if (emp.bankAccount) setPayMethod('TRANSFER');

      // Ambil otomatis akumulasi kasbon pending untuk karyawan ini
      try {
        const res = await apiClient.get<ApiResponse<any>>(
          `/salaries/employees/${empId}/pending-deductions`
        );
        const totalPending = res.data.data?.totalAmount || 0;
        const countPending = res.data.data?.count || 0;
        setPayDeductions(totalPending.toString());
        setPayPendingKasbonInfo({ amount: totalPending, count: countPending });
      } catch {
        const fallback = emp.pendingDeductionsTotal || 0;
        setPayDeductions(fallback.toString());
        setPayPendingKasbonInfo({ amount: fallback, count: fallback > 0 ? 1 : 0 });
      }
    } else {
      setPayDeductions('0');
      setPayPendingKasbonInfo({ amount: 0, count: 0 });
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payEmployeeId) {
      toast.error('Pilih karyawan yang akan dibayarkan gajinya.');
      return;
    }
    if (!payAccountId) {
      toast.error('Pilih akun Kas/Bank pembayar.');
      return;
    }

    const baseSal = parseFloat(payBaseSalary) || 0;
    const allow = parseFloat(payAllowance) || 0;
    const bon = parseFloat(payBonus) || 0;
    const ded = parseFloat(payDeductions) || 0;
    const net = baseSal + allow + bon - ded;

    if (net <= 0) {
      toast.error('Total gaji bersih (Take Home Pay) harus lebih besar dari 0.');
      return;
    }

    createPaymentMutation.mutate({
      employeeId: parseInt(payEmployeeId, 10),
      periodStart: payPeriodStart,
      periodEnd: payPeriodEnd,
      paymentDate: payDate ? combineDateWithLocalTime(payDate) : undefined,
      baseSalary: baseSal,
      allowance: allow,
      bonus: bon,
      deductions: ded,
      paymentMethod: payMethod,
      accountId: parseInt(payAccountId, 10),
      notes: payNotes.trim() || undefined,
    });
  };

  // Buka modal Catat Kasbon / Potongan
  const openCreateDeductionModal = (defaultEmp?: EmployeeItem) => {
    setDedEmpId(defaultEmp ? defaultEmp.id.toString() : employeesData?.[0]?.id.toString() || '');
    setDedAmount('');
    setDedType('KASBON');
    setDedDate(formatTanggalISO());
    setDedNotes('');
    setIsDeductionModalOpen(true);
  };

  const handleDeductionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dedEmpId) {
      toast.error('Pilih karyawan yang mengambil kasbon/potongan.');
      return;
    }
    const amt = parseFloat(dedAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Nominal kasbon / potongan harus lebih dari 0.');
      return;
    }

    createDeductionMutation.mutate({
      employeeId: parseInt(dedEmpId, 10),
      amount: amt,
      type: dedType,
      date: dedDate ? combineDateWithLocalTime(dedDate) : undefined,
      notes: dedNotes.trim() || undefined,
    });
  };

  // Live calculation preview
  const numBase = parseFloat(payBaseSalary) || 0;
  const numAllow = parseFloat(payAllowance) || 0;
  const numBonus = parseFloat(payBonus) || 0;
  const numDed = parseFloat(payDeductions) || 0;
  const previewNetSalary = Math.max(0, numBase + numAllow + numBonus - numDed);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2.5">
            <Banknote className="w-6 h-6 text-primary-600" />
            Manajemen Gaji (Payroll)
          </h1>
          <p className="text-surface-500 text-sm mt-1">
            Pengelolaan kompensasi staf, kasbon & potongan, pembayaran gaji, slip gaji, dan auto-posting Jurnal Akuntansi ({activeBusiness?.name || 'Pilih Unit Usaha'})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openCreatePaymentModal()}
            className="btn-primary text-sm flex items-center gap-1.5 shadow-sm"
          >
            <DollarSign className="w-4 h-4" /> Proses Pembayaran Gaji
          </button>
          <button
            onClick={() => openCreateDeductionModal()}
            className="btn-secondary text-sm flex items-center gap-1.5 shadow-sm border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100/60"
          >
            <Wallet className="w-4 h-4 text-amber-600" /> Catat Kasbon / Potongan
          </button>
          <button
            onClick={openCreateEmployeeModal}
            className="btn-secondary text-sm flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Karyawan
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Karyawan / Staf Aktif</p>
            <p className="text-2xl font-bold text-surface-900 mt-0.5">
              {summaryData?.activeEmployeesCount || 0} Orang
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Total Gaji Terbayar Bulan Ini</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5 font-mono">
              {formatRupiah(summaryData?.totalPaidThisMonth || 0)}
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Slip Penggajian Bulan Ini</p>
            <p className="text-2xl font-bold text-purple-600 mt-0.5">
              {summaryData?.paymentsCountThisMonth || 0} Pembayaran
            </p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-500 font-medium">Total Sisa Kasbon Aktif</p>
            <p className="text-xl font-bold text-amber-600 mt-0.5 font-mono">
              {formatRupiah(summaryData?.totalActiveKasbon || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap border-b border-surface-200 gap-2">
        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'employees'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Data Karyawan & Master Kompensasi ({employeesData?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'payments'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Riwayat Penggajian & Slip Gaji ({paymentsData?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('deductions')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'deductions'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          <Wallet className="w-4 h-4" />
          Catatan Kasbon & Potongan ({deductionsData?.length || 0})
        </button>
      </div>

      {/* TAB 1: DATA KARYAWAN */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Cari nama karyawan, kode, jabatan, atau nomor telepon..."
                className="input pl-10 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 bg-surface-50 border border-surface-200 rounded-xl px-3 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-surface-500" />
                <select
                  value={employeeStatusFilter}
                  onChange={(e) => setEmployeeStatusFilter(e.target.value)}
                  className="bg-transparent border-none text-surface-700 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="ACTIVE">Aktif Saja</option>
                  <option value="INACTIVE">Nonaktif Saja</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Karyawan */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-50 text-surface-600 text-xs uppercase font-semibold border-b border-surface-200">
                    <th className="py-3 px-4">Karyawan</th>
                    <th className="py-3 px-4">Jabatan</th>
                    <th className="py-3 px-4">Tipe Gaji</th>
                    <th className="py-3 px-4 text-right">Gaji Pokok</th>
                    <th className="py-3 px-4 text-right">Tunjangan</th>
                    <th className="py-3 px-4 text-right">Total Kompensasi</th>
                    <th className="py-3 px-4 text-center">Sisa Kasbon Aktif</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {isLoadingEmployees ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-surface-400">
                        Memuat data karyawan...
                      </td>
                    </tr>
                  ) : employeesData && employeesData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-surface-400">
                        Belum ada data karyawan pada unit usaha ini. Klik <strong>"Tambah Karyawan"</strong> untuk mulai mendaftarkan staf.
                      </td>
                    </tr>
                  ) : (
                    employeesData?.map((emp) => {
                      const kasbonAktif = emp.pendingDeductionsTotal || 0;
                      return (
                        <tr key={emp.id} className="hover:bg-surface-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs uppercase">
                                {emp.name.substring(0, 2)}
                              </div>
                              <div>
                                <p className="font-semibold text-surface-900">{emp.name}</p>
                                <p className="text-xs text-surface-500 font-mono">
                                  {emp.code} {emp.phone && `• ${emp.phone}`}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-100 text-surface-700 border border-surface-200">
                              <Briefcase className="w-3 h-3 text-surface-400" />
                              {emp.position}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-xs font-semibold text-surface-600">
                            {emp.salaryType === 'BULANAN' ? 'Bulanan' : 'Harian / Shift'}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-medium text-surface-900">
                            {formatRupiah(emp.baseSalary)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono text-surface-600">
                            {formatRupiah(emp.allowance)}
                          </td>

                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                            {formatRupiah(emp.totalFixedSalary)}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {kasbonAktif > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-300">
                                <Wallet className="w-3 h-3 text-amber-500" />
                                {formatRupiah(kasbonAktif)}
                              </span>
                            ) : (
                              <span className="text-xs text-surface-400 font-mono">Rp 0 (Lunas)</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {emp.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-100 text-surface-600 border border-surface-200">
                                Nonaktif
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openCreatePaymentModal(emp)}
                                title="Bayar Gaji Karyawan Ini"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium border border-emerald-200"
                              >
                                <DollarSign className="w-3.5 h-3.5" /> Bayar
                              </button>
                              <button
                                onClick={() => openCreateDeductionModal(emp)}
                                title="Catat Kasbon / Potongan"
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium border border-amber-200"
                              >
                                <Wallet className="w-3.5 h-3.5" /> Kasbon
                              </button>
                              <button
                                onClick={() => openEditEmployeeModal(emp)}
                                title="Edit Karyawan"
                                className="p-1.5 text-surface-500 hover:text-amber-600 hover:bg-surface-100 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  const confirmed = await confirmDialog({
                                    title: 'Nonaktifkan Karyawan?',
                                    message: `Apakah Anda yakin ingin menonaktifkan akun karyawan "${emp.name}" (${emp.code})?`,
                                    confirmText: 'Ya, Nonaktifkan',
                                    type: 'warning',
                                    itemDetails: [
                                      { label: 'Nama Staf', value: emp.name },
                                      { label: 'Kode / Posisi', value: `${emp.code} (${emp.position})` },
                                      { label: 'Gaji Pokok', value: formatRupiah(emp.baseSalary) },
                                    ],
                                  });
                                  if (confirmed) {
                                    deleteEmployeeMutation.mutate(emp.id);
                                  }
                                }}
                                title="Nonaktifkan Karyawan"
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
        </div>
      )}

      {/* TAB 2: RIWAYAT PENGGAJIAN & SLIP GAJI */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="card p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="Cari no. bukti atau nama staf..."
                  className="input pl-9 text-xs"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={paymentEmployeeFilter}
                  onChange={(e) => setPaymentEmployeeFilter(e.target.value)}
                  className="input text-xs"
                >
                  <option value="">Semua Karyawan</option>
                  {employeesData?.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.position})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <input
                  type="date"
                  value={paymentStartDate}
                  onChange={(e) => setPaymentStartDate(e.target.value)}
                  className="input text-xs"
                  title="Dari Tanggal"
                />
              </div>

              <div className="md:col-span-2">
                <input
                  type="date"
                  value={paymentEndDate}
                  onChange={(e) => setPaymentEndDate(e.target.value)}
                  className="input text-xs"
                  title="Sampai Tanggal"
                />
              </div>

              <div className="md:col-span-1 flex items-center justify-center">
                {(paymentSearch || paymentEmployeeFilter || paymentStartDate || paymentEndDate) && (
                  <button
                    onClick={() => {
                      setPaymentSearch('');
                      setPaymentEmployeeFilter('');
                      setPaymentStartDate('');
                      setPaymentEndDate('');
                    }}
                    title="Reset Filter"
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table Pembayaran Gaji */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-50 text-surface-600 text-xs uppercase font-semibold border-b border-surface-200">
                    <th className="py-3 px-4">No. Bukti / Tanggal</th>
                    <th className="py-3 px-4">Karyawan & Jabatan</th>
                    <th className="py-3 px-4">Periode Kerja</th>
                    <th className="py-3 px-4 text-right">Gaji Pokok</th>
                    <th className="py-3 px-4 text-right">Tunjangan / Bonus</th>
                    <th className="py-3 px-4 text-right">Potongan Kasbon</th>
                    <th className="py-3 px-4 text-right">Total Bersih</th>
                    <th className="py-3 px-4">Akun Pembayar</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {isLoadingPayments ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-surface-400">
                        Memuat riwayat penggajian...
                      </td>
                    </tr>
                  ) : paymentsData && paymentsData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-surface-400">
                        Belum ada riwayat pembayaran gaji. Klik tombol <strong>"Proses Pembayaran Gaji"</strong> untuk membuat slip penggajian baru.
                      </td>
                    </tr>
                  ) : (
                    paymentsData?.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-mono font-bold text-xs text-primary-700">
                            {p.paymentNumber}
                          </p>
                          <p className="text-xs text-surface-500 mt-0.5">
                            {formatTanggalJam(p.paymentDate)}
                          </p>
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-semibold text-surface-900">{p.employee.name}</p>
                          <p className="text-xs text-surface-500">{p.employee.position}</p>
                        </td>

                        <td className="py-3 px-4 text-xs text-surface-600">
                          {formatTanggal(p.periodStart)} s.d. <br />
                          {formatTanggal(p.periodEnd)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-surface-800">
                          {formatRupiah(p.baseSalary)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-surface-600">
                          +{formatRupiah(p.allowance + p.bonus)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">
                          {p.deductions > 0 ? `-${formatRupiah(p.deductions)}` : 'Rp 0'}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          {formatRupiah(p.netSalary)}
                        </td>

                        <td className="py-3 px-4 text-xs">
                          <p className="font-medium text-surface-800">{p.account.name}</p>
                          <p className="text-[11px] text-surface-400">
                            {p.paymentMethod} {p.journalEntry && `• ${p.journalEntry.nomorJurnal}`}
                          </p>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedSlipPayment(p)}
                              title="Lihat & Cetak Slip Gaji"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold border border-blue-200"
                            >
                              <Printer className="w-3.5 h-3.5" /> Slip
                            </button>
                            <button
                              onClick={async () => {
                                const confirmed = await confirmDialog({
                                  title: 'Hapus Pembayaran Gaji?',
                                  message: `Apakah Anda yakin ingin menghapus data pembayaran gaji ini? Jurnal akuntansi terkait akan ikut dihapus dan status kasbon yang dipotong akan otomatis dikembalikan ke status aktif/belum lunas.`,
                                  confirmText: 'Ya, Hapus Slip & Jurnal',
                                  type: 'danger',
                                  itemDetails: [
                                    { label: 'No. Slip', value: p.paymentNumber },
                                    { label: 'Karyawan', value: p.employee.name },
                                    { label: 'Gaji Bersih', value: formatRupiah(p.netSalary) },
                                  ],
                                });
                                if (confirmed) {
                                  deletePaymentMutation.mutate(p.id);
                                }
                              }}
                              title="Hapus Pembayaran Gaji"
                              className="p-1.5 text-surface-500 hover:text-rose-600 hover:bg-surface-100 rounded-lg transition-colors"
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
        </div>
      )}

      {/* TAB 3: CATATAN KASBON & POTONGAN STAF */}
      {activeTab === 'deductions' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={deductionEmployeeFilter}
                onChange={(e) => setDeductionEmployeeFilter(e.target.value)}
                className="input text-xs"
              >
                <option value="">Semua Karyawan</option>
                {employeesData?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.position})
                  </option>
                ))}
              </select>

              <select
                value={deductionStatusFilter}
                onChange={(e) => setDeductionStatusFilter(e.target.value)}
                className="input text-xs"
              >
                <option value="ALL">Semua Status Kasbon</option>
                <option value="ACTIVE">Kasbon Aktif (Belum Lunas / Cicilan)</option>
                <option value="PENDING">Belum Dipotong Sama Sekali</option>
                <option value="PARTIAL">Dicicil Sebagian</option>
                <option value="SETTLED">Sudah Lunas Dipotong Gaji</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openCreateDeductionModal()}
                className="btn-primary text-xs flex items-center gap-1.5 py-2"
              >
                <Plus className="w-3.5 h-3.5" /> Catat Kasbon / Potongan Baru
              </button>
            </div>
          </div>

          {/* Table Kasbon */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-50 text-surface-600 text-xs uppercase font-semibold border-b border-surface-200">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Karyawan</th>
                    <th className="py-3 px-4">Tipe</th>
                    <th className="py-3 px-4 text-right">Nominal Awal</th>
                    <th className="py-3 px-4 text-right">Terpotong</th>
                    <th className="py-3 px-4 text-right">Sisa Kasbon</th>
                    <th className="py-3 px-4">Keterangan / Alasan</th>
                    <th className="py-3 px-4 text-center">Status Pemotongan</th>
                    <th className="py-3 px-4">Dicatat Oleh</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {isLoadingDeductions ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-surface-400">
                        Memuat data kasbon...
                      </td>
                    </tr>
                  ) : deductionsData && deductionsData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-surface-400">
                        Belum ada catatan kasbon atau potongan staf. Klik tombol <strong>"Catat Kasbon / Potongan Baru"</strong> untuk mencatat pinjaman/potongan karyawan.
                      </td>
                    </tr>
                  ) : (
                    deductionsData?.map((d) => (
                      <tr key={d.id} className="hover:bg-surface-50/60 transition-colors">
                        <td className="py-3 px-4 text-xs font-mono text-surface-700">
                          {formatTanggal(d.date)}
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-semibold text-surface-900">{d.employee.name}</p>
                          <p className="text-xs text-surface-500 font-mono">{d.employee.code}</p>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                              d.type === 'KASBON'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {d.type === 'KASBON' ? 'Kasbon / Pinjaman' : 'Potongan Lain'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-surface-700">
                          {formatRupiah(d.amount)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-emerald-600 font-medium">
                          {d.paidAmount > 0 ? formatRupiah(d.paidAmount) : '-'}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {d.remainingAmount > 0 ? (
                            <span className="text-rose-600">{formatRupiah(d.remainingAmount)}</span>
                          ) : (
                            <span className="text-surface-400 font-normal">Rp 0 (Lunas)</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs text-surface-700 max-w-xs truncate">
                          {d.notes || '-'}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {d.status === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-500" />
                              Belum Dipotong
                            </span>
                          ) : d.status === 'PARTIAL' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-300">
                              <Clock className="w-3 h-3 text-blue-500" />
                              Dicicil ({Math.round(((d.paidAmount || 0) / (d.amount || 1)) * 100)}%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Lunas Dipotong
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-xs text-surface-500">
                          {d.creator}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {d.status === 'PENDING' && (d.paidAmount || 0) === 0 ? (
                            <button
                              onClick={async () => {
                                const confirmed = await confirmDialog({
                                  title: 'Hapus Catatan Kasbon?',
                                  message: `Apakah Anda yakin ingin menghapus catatan pinjaman/kasbon staf ini?`,
                                  confirmText: 'Ya, Hapus Kasbon',
                                  type: 'danger',
                                  itemDetails: [
                                    { label: 'Karyawan', value: d.employee.name },
                                    { label: 'Nominal Kasbon', value: formatRupiah(d.amount) },
                                    { label: 'Keterangan', value: d.notes || '-' },
                                  ],
                                });
                                if (confirmed) {
                                  deleteDeductionMutation.mutate(d.id);
                                }
                              }}
                              title="Hapus Kasbon"
                              className="p-1.5 text-surface-400 hover:text-rose-600 hover:bg-surface-100 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-xs text-surface-300 font-mono" title="Kasbon sudah ada cicilan/lunas">
                              -
                            </span>
                          )}
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

      {/* MODAL: Tambah / Edit Karyawan */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-200 max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <h3 className="font-bold text-lg text-surface-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600" />
                {editingEmployee ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
              </h3>
              <button
                onClick={() => setIsEmployeeModalOpen(false)}
                className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEmployeeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Kode Karyawan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: STF-001"
                    className="input uppercase font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Jabatan / Posisi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={empPosition}
                    onChange={(e) => setEmpPosition(e.target.value)}
                    placeholder="Contoh: Kasir, Barista, Koki, Waiter"
                    className="input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="input text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Tipe Gaji Pokok
                  </label>
                  <select
                    value={empSalaryType}
                    onChange={(e) => setEmpSalaryType(e.target.value as any)}
                    className="input text-sm"
                  >
                    <option value="BULANAN">Bulanan</option>
                    <option value="HARIAN">Harian / Shift</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Gaji Pokok Default (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={empBaseSalary}
                    onChange={(e) => setEmpBaseSalary(e.target.value)}
                    className="input font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Tunjangan Tetap (Rp, Makan/Transport)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={empAllowance}
                    onChange={(e) => setEmpAllowance(e.target.value)}
                    className="input font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Tanggal Bergabung
                  </label>
                  <input
                    type="date"
                    value={empJoinDate}
                    onChange={(e) => setEmpJoinDate(e.target.value)}
                    className="input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Nama Bank (Opsional)
                  </label>
                  <input
                    type="text"
                    value={empBankName}
                    onChange={(e) => setEmpBankName(e.target.value)}
                    placeholder="BCA, Mandiri, BRI, dll"
                    className="input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Nomor Rekening Bank (Opsional)
                  </label>
                  <input
                    type="text"
                    value={empBankAccount}
                    onChange={(e) => setEmpBankAccount(e.target.value)}
                    placeholder="1234567890"
                    className="input text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Hubungkan dengan Akun Login Sistem (Opsional)
                </label>
                <select
                  value={empUserId}
                  onChange={(e) => setEmpUserId(e.target.value)}
                  className="input text-sm"
                >
                  <option value="">-- Tidak Terhubung ke Akun Login --</option>
                  {usersList?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.username} - {u.role})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-surface-500 mt-1">
                  Pilih jika staf ini juga merupakan pengguna sistem kasir atau admin unit usaha.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={empNotes}
                  onChange={(e) => setEmpNotes(e.target.value)}
                  placeholder="Catatan keahlian, status kontrak, dll"
                  className="input text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="empActiveCheck"
                  checked={empIsActive}
                  onChange={(e) => setEmpIsActive(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="empActiveCheck" className="text-sm font-medium text-surface-800 cursor-pointer">
                  Karyawan ini berstatus Aktif bekerja
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="btn-secondary text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
                  className="btn-primary text-sm"
                >
                  {createEmployeeMutation.isPending || updateEmployeeMutation.isPending
                    ? 'Menyimpan...'
                    : 'Simpan Data Karyawan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Form Catat Kasbon / Potongan Baru */}
      {isDeductionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <h3 className="font-bold text-base text-surface-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-600" />
                Catat Kasbon / Potongan Karyawan
              </h3>
              <button
                onClick={() => setIsDeductionModalOpen(false)}
                className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeductionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Pilih Karyawan <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={dedEmpId}
                  onChange={(e) => setDedEmpId(e.target.value)}
                  className="input text-sm font-medium"
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {employeesData?.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.code} - {emp.position})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Jenis Catatan
                  </label>
                  <select
                    value={dedType}
                    onChange={(e) => setDedType(e.target.value as any)}
                    className="input text-sm"
                  >
                    <option value="KASBON">Kasbon / Pinjaman</option>
                    <option value="POTONGAN">Potongan Lain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Tanggal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dedDate}
                    onChange={(e) => setDedDate(e.target.value)}
                    className="input text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Nominal Kasbon / Potongan (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  required
                  value={dedAmount}
                  onChange={(e) => setDedAmount(e.target.value)}
                  placeholder="Contoh: 150000"
                  className="input font-mono text-base font-bold text-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Keterangan / Alasan
                </label>
                <textarea
                  rows={2}
                  value={dedNotes}
                  onChange={(e) => setDedNotes(e.target.value)}
                  placeholder="Contoh: Kasbon uang bensin, pinjaman darurat, dll"
                  className="input text-sm"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Kasbon ini akan berstatus <strong>Pending</strong> dan otomatis terakumulasi sebagai pengurang pada formulir <strong>Bayar Gaji</strong> karyawan. Setelah gaji dibayarkan, catatan kasbon otomatis lunas (kembali 0).
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setIsDeductionModalOpen(false)}
                  className="btn-secondary text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createDeductionMutation.isPending}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  <Wallet className="w-4 h-4" />
                  {createDeductionMutation.isPending ? 'Menyimpan...' : 'Simpan Kasbon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Form Proses Pembayaran Gaji */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-200 max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <h3 className="font-bold text-lg text-surface-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Formulir Pembayaran Gaji Staf
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Pilih Karyawan <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={payEmployeeId}
                  onChange={(e) => handleSelectEmployeeForPayment(e.target.value)}
                  className="input text-sm font-medium"
                >
                  <option value="">-- Pilih Karyawan Penerima Gaji --</option>
                  {employeesData?.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.code} - {emp.position})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Periode Dari Tanggal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={payPeriodStart}
                    onChange={(e) => setPayPeriodStart(e.target.value)}
                    className="input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Periode Sampai Tanggal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={payPeriodEnd}
                    onChange={(e) => setPayPeriodEnd(e.target.value)}
                    className="input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Tanggal Pembayaran
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="input text-sm"
                  >
                    <option value="TUNAI">Tunai / Cash</option>
                    <option value="TRANSFER">Transfer Bank</option>
                  </select>
                </div>
              </div>

              {/* Rincian Komponen Gaji */}
              <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-surface-600">
                  Rincian Penerimaan & Potongan
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">
                      Gaji Pokok (Rp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      required
                      value={payBaseSalary}
                      onChange={(e) => setPayBaseSalary(e.target.value)}
                      className="input font-mono text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">
                      Tunjangan (Rp, Makan/Transport)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={payAllowance}
                      onChange={(e) => setPayAllowance(e.target.value)}
                      className="input font-mono text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">
                      Bonus / Insentif Tambahan (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={payBonus}
                      onChange={(e) => setPayBonus(e.target.value)}
                      className="input font-mono text-sm bg-white text-emerald-600 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1 flex items-center justify-between">
                      <span>Potongan / Kasbon (Rp)</span>
                      {payPendingKasbonInfo.count > 0 && (
                        <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-bold">
                          {payPendingKasbonInfo.count} Kasbon Terdeteksi
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={payDeductions}
                      onChange={(e) => setPayDeductions(e.target.value)}
                      className="input font-mono text-sm bg-white text-rose-600 font-bold"
                    />
                  </div>
                </div>

                {/* Notifikasi Akumulasi Kasbon Dinamis (Sesuai Nominal Input) */}
                {payPendingKasbonInfo.amount > 0 &&
                  (() => {
                    const entered = Number(payDeductions) || 0;
                    const totalPending = payPendingKasbonInfo.amount;

                    if (entered === 0) {
                      return (
                        <div className="bg-surface-100 p-2.5 rounded-lg border border-surface-200 text-xs text-surface-700 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-surface-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-surface-900">
                              Kasbon Tidak Dipotong pada Periode Ini
                            </p>
                            <p className="text-[11px] text-surface-600 mt-0.5">
                              Nominal potongan diisi Rp 0. Sisa kasbon staf ({formatRupiah(totalPending)}) tidak akan terpotong dan tetap utuh sebagai kasbon aktif.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    if (entered < totalPending) {
                      return (
                        <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                          <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-blue-900">
                              Pemotongan Kasbon Sebagian (Cicilan): {formatRupiah(entered)}
                            </p>
                            <p className="text-[11px] text-blue-700 mt-0.5">
                              Dari total kasbon aktif {formatRupiah(totalPending)}, akan dipotong sebesar {formatRupiah(entered)}. Sisa kasbon aktif staf setelah gaji disimpan adalah <strong>{formatRupiah(totalPending - entered)}</strong> (status: Dicicil Sebagian).
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-emerald-900">
                            Pelunasan Kasbon Penuh ({formatRupiah(totalPending)})
                          </p>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Seluruh kasbon aktif akan lunas dipotong dari gaji ini dan catatan kasbon staf otomatis kembali Rp 0.
                            {entered > totalPending && (
                              <span> (Kelebihan {formatRupiah(entered - totalPending)} dicatat sebagai potongan tambahan).</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                {/* Total Take Home Pay */}
                <div className="pt-2 border-t border-surface-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-surface-500 font-medium">Gaji Bersih Diterima (Take Home Pay)</p>
                    <p className="text-lg font-bold text-emerald-600 font-mono">
                      {formatRupiah(previewNetSalary)}
                    </p>
                  </div>
                  <span className="text-xs text-surface-400 font-mono">
                    (Gaji + Tunjangan + Bonus - Kasbon)
                  </span>
                </div>
              </div>

              {/* Akun Pembayaran (CoA) */}
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Akun Kas/Bank Pembayar (CoA) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  className="input text-sm font-medium"
                >
                  <option value="">-- Pilih Akun Kas / Bank Pembayar --</option>
                  {paymentAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-surface-500 mt-1">
                  Sistem otomatis memposting jurnal pengeluaran kas: (Debit) Beban Gaji & Upah (5-2001) | (Kredit) Kas/Bank terpilih.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Catatan Penggajian (Opsional)
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Contoh: Gaji bulan November 2026 lunas via transfer"
                  className="input text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="btn-secondary text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createPaymentMutation.isPending}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4" />
                  {createPaymentMutation.isPending ? 'Memproses...' : 'Bayar & Posting Jurnal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CETAK SLIP GAJI */}
      {selectedSlipPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white rounded-2xl shadow-2xl border border-surface-200 max-w-lg w-full p-6 space-y-5 max-h-[95vh] overflow-y-auto print:shadow-none print:border-none print:p-0 print:max-w-none print:max-h-none">
            {/* Header Dialog (Hidden on Print) */}
            <div className="flex items-center justify-between border-b border-surface-100 pb-3 print:hidden">
              <h3 className="font-bold text-lg text-surface-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary-600" />
                Slip Gaji Karyawan
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Slip
                </button>
                <button
                  onClick={() => setSelectedSlipPayment(null)}
                  className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Slip Area */}
            <div className="border border-surface-200 rounded-xl p-6 bg-surface-50/40 space-y-4 print:border-none print:p-4 print:bg-white">
              {/* Slip Header */}
              <div className="text-center border-b border-surface-200 pb-3">
                <h2 className="font-bold text-base text-surface-900 uppercase tracking-wide">
                  {activeBusiness?.name || 'ROBIN GROUP'}
                </h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  {activeBusiness?.address || 'Sistem Pembukuan & POS Multi-Usaha Offline'}
                </p>
                <p className="font-mono font-bold text-xs uppercase tracking-widest text-primary-700 mt-2">
                  SLIP GAJI KARYAWAN
                </p>
                <p className="font-mono text-xs text-surface-600 mt-0.5">
                  No. Bukti: {selectedSlipPayment.paymentNumber}
                </p>
              </div>

              {/* Employee & Period Details */}
              <div className="grid grid-cols-2 gap-2 text-xs border-b border-surface-200 pb-3">
                <div>
                  <span className="text-surface-500">Nama Karyawan:</span>
                  <p className="font-bold text-surface-900">{selectedSlipPayment.employee.name}</p>
                </div>
                <div>
                  <span className="text-surface-500">Jabatan:</span>
                  <p className="font-semibold text-surface-900">{selectedSlipPayment.employee.position}</p>
                </div>
                <div>
                  <span className="text-surface-500">Periode Gaji:</span>
                  <p className="font-medium text-surface-800">
                    {formatTanggal(selectedSlipPayment.periodStart)} s.d. {formatTanggal(selectedSlipPayment.periodEnd)}
                  </p>
                </div>
                <div>
                  <span className="text-surface-500">Tanggal Bayar:</span>
                  <p className="font-medium text-surface-800 font-mono">
                    {formatTanggalJam(selectedSlipPayment.paymentDate)}
                  </p>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2 text-xs">
                <p className="font-bold text-surface-700 uppercase tracking-wider text-[11px]">
                  Rincian Kompensasi
                </p>

                <div className="flex justify-between py-1 border-b border-dashed border-surface-200">
                  <span className="text-surface-600">Gaji Pokok</span>
                  <span className="font-mono font-medium text-surface-900">
                    {formatRupiah(selectedSlipPayment.baseSalary)}
                  </span>
                </div>

                {selectedSlipPayment.allowance > 0 && (
                  <div className="flex justify-between py-1 border-b border-dashed border-surface-200">
                    <span className="text-surface-600">Tunjangan Tetap (Makan & Transport)</span>
                    <span className="font-mono font-medium text-surface-900">
                      +{formatRupiah(selectedSlipPayment.allowance)}
                    </span>
                  </div>
                )}

                {selectedSlipPayment.bonus > 0 && (
                  <div className="flex justify-between py-1 border-b border-dashed border-surface-200 text-emerald-600">
                    <span>Bonus & Insentif Tambahan</span>
                    <span className="font-mono font-semibold">
                      +{formatRupiah(selectedSlipPayment.bonus)}
                    </span>
                  </div>
                )}

                {selectedSlipPayment.deductions > 0 && (
                  <div className="py-1 border-b border-dashed border-surface-200">
                    <div className="flex justify-between text-rose-600">
                      <span>Potongan / Kasbon</span>
                      <span className="font-mono font-semibold">
                        -{formatRupiah(selectedSlipPayment.deductions)}
                      </span>
                    </div>
                    {selectedSlipPayment.appliedDeductions && selectedSlipPayment.appliedDeductions.length > 0 && (
                      <div className="mt-1 pl-2 text-[11px] text-surface-500 space-y-0.5">
                        {selectedSlipPayment.appliedDeductions.map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>
                              • Kasbon ({formatTanggal(item.date)}) {item.notes ? `- ${item.notes}` : ''}:
                            </span>
                            <span className="font-mono text-rose-600">
                              Dipotong {formatRupiah(item.amountApplied)} {item.remainingAmount > 0 ? `(Sisa: ${formatRupiah(item.remainingAmount)})` : '(Lunas)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Net Total */}
                <div className="flex justify-between items-center pt-2 border-t-2 border-surface-300">
                  <span className="font-bold text-surface-900 uppercase">Gaji Bersih Diterima</span>
                  <span className="font-mono font-bold text-base text-emerald-700">
                    {formatRupiah(selectedSlipPayment.netSalary)}
                  </span>
                </div>
              </div>

              {/* Payment & Journal Info */}
              <div className="bg-surface-100 p-2.5 rounded-lg text-[11px] text-surface-600 space-y-1">
                <p>
                  <strong>Metode Pembayaran:</strong> {selectedSlipPayment.paymentMethod} via {selectedSlipPayment.account.name}
                </p>
                {selectedSlipPayment.journalEntry && (
                  <p>
                    <strong>Jurnal Akuntansi:</strong> No. {selectedSlipPayment.journalEntry.nomorJurnal} (Beban Gaji diakui)
                  </p>
                )}
                {selectedSlipPayment.notes && (
                  <p>
                    <strong>Catatan:</strong> {selectedSlipPayment.notes}
                  </p>
                )}
              </div>

              {/* Signature Section */}
              <div className="pt-6 grid grid-cols-2 gap-4 text-center text-xs">
                <div>
                  <p className="text-surface-500">Penerima,</p>
                  <div className="h-14"></div>
                  <p className="font-bold border-t border-surface-400 pt-1 inline-block min-w-[120px] text-surface-900">
                    {selectedSlipPayment.employee.name}
                  </p>
                </div>
                <div>
                  <p className="text-surface-500">Diserahkan Oleh,</p>
                  <div className="h-14"></div>
                  <p className="font-bold border-t border-surface-400 pt-1 inline-block min-w-[120px] text-surface-900">
                    {selectedSlipPayment.creator || 'Admin / Pemilik'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
