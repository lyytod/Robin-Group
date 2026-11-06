import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Plus,
  FileSpreadsheet,
  Search,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  CreditCard,
  RotateCcw,
  Lock,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import {
  formatRupiah,
  formatTanggalJam,
  formatTanggalISO,
  combineDateWithLocalTime,
} from '../../utils/formatters';
import { confirmDialog } from '../../store/confirmStore';
import toast from 'react-hot-toast';
import type { ApiResponse } from '../../types/index';

interface AccountItem {
  id: number;
  code: string;
  name: string;
  type: 'ASET' | 'KEWAJIBAN' | 'EKUITAS' | 'PENDAPATAN' | 'BEBAN';
  normalBalance: 'DEBIT' | 'KREDIT';
  parentId: number | null;
  parent?: { id?: number; code: string; name: string } | null;
  isActive: boolean;
  description: string | null;
  isLocked?: boolean;
  hasJournalItems?: boolean;
  hasChildren?: boolean;
  hasInventoryItems?: boolean;
}

interface JournalLine {
  id: number;
  accountId?: number;
  accountCode: string;
  accountName: string;
  isDebit: boolean;
  amount: number;
  description: string;
}

interface JournalItem {
  id: number;
  nomorJurnal: string;
  type: string;
  description: string;
  totalDebit: number;
  totalKredit: number;
  journalDate: string;
  isReversed: boolean;
  reversedFromId: number | null;
  transactionId: number | null;
  isManual: boolean;
  creator: string;
  lines: JournalLine[];
}

interface LedgerResponse {
  account: {
    id: number;
    code: string;
    name: string;
    type: string;
    normalBalance: string;
  };
  initialBalance: number;
  totalDebit: number;
  totalKredit: number;
  closingBalance: number;
  mutations: {
    id: number;
    journalId: number;
    nomorJurnal: string;
    journalDate: string;
    description: string;
    debit: number;
    kredit: number;
    balance: number;
  }[];
}

export function AccountingPage() {
  const queryClient = useQueryClient();
  const { activeBusiness, isSuperAdmin, user } = useAuthStore();
  const isAdminOrSuperAdmin = isSuperAdmin || user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState<'coa' | 'journal' | 'ledger'>('coa');

  // Search & Filters for CoA & Ledger
  const [accountTypeFilter, setAccountTypeFilter] = useState('');
  const [coaSearch, setCoaSearch] = useState('');
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState<number | ''>('');

  // Search, Filters & Sorting for Jurnal Umum
  const [journalSearch, setJournalSearch] = useState('');
  const [journalTypeFilter, setJournalTypeFilter] = useState('');
  const [journalStartDate, setJournalStartDate] = useState('');
  const [journalEndDate, setJournalEndDate] = useState('');
  const [journalSortBy, setJournalSortBy] = useState<'date' | 'amount' | 'nomor'>('date');
  const [journalSortOrder, setJournalSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);
  const [isManualJournalModalOpen, setIsManualJournalModalOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState<JournalItem | null>(null);

  // New Account Form
  const [accCode, setAccCode] = useState('');
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<'ASET' | 'KEWAJIBAN' | 'EKUITAS' | 'PENDAPATAN' | 'BEBAN'>('ASET');
  const [accNormalBalance, setAccNormalBalance] = useState<'DEBIT' | 'KREDIT'>('DEBIT');
  const [accParentId, setAccParentId] = useState<number | ''>('');
  const [accDescription, setAccDescription] = useState('');

  // Manual Journal Form
  const [manualDate, setManualDate] = useState(() => formatTanggalISO());
  const [manualDesc, setManualDesc] = useState('');
  const [manualType, setManualType] = useState('PENYESUAIAN');
  const [manualLines, setManualLines] = useState<
    { accountId: number | ''; isDebit: boolean; amount: string; description: string }[]
  >([
    { accountId: '', isDebit: true, amount: '', description: '' },
    { accountId: '', isDebit: false, amount: '', description: '' },
  ]);

  // Fetch Accounts (CoA) for table
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['accounts', activeBusiness?.id, accountTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (accountTypeFilter) params.append('type', accountTypeFilter);
      const res = await apiClient.get<ApiResponse<AccountItem[]>>(`/accounts?${params.toString()}`);
      return res.data.data ?? [];
    },
    enabled: !!activeBusiness?.id,
  });

  // Fetch ALL Accounts (CoA) for modal dropdowns (unfiltered)
  const { data: allAccounts } = useQuery({
    queryKey: ['all-accounts', activeBusiness?.id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<AccountItem[]>>('/accounts');
      return res.data.data ?? [];
    },
    enabled: !!activeBusiness?.id,
  });

  // Fetch Journals with filters & sorting
  const { data: journals, isLoading: isLoadingJournals } = useQuery({
    queryKey: [
      'journals',
      activeBusiness?.id,
      journalSearch,
      journalTypeFilter,
      journalStartDate,
      journalEndDate,
      journalSortBy,
      journalSortOrder,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (journalSearch) params.append('search', journalSearch);
      if (journalTypeFilter) params.append('type', journalTypeFilter);
      if (journalStartDate) params.append('startDate', journalStartDate);
      if (journalEndDate) params.append('endDate', journalEndDate);
      params.append('sortBy', journalSortBy);
      params.append('sortOrder', journalSortOrder);
      params.append('limit', '100');
      const res = await apiClient.get<ApiResponse<JournalItem[]>>(`/journals?${params.toString()}`);
      return res.data.data ?? [];
    },
    enabled: !!activeBusiness?.id && activeTab === 'journal',
  });

  // Fetch Ledger
  const { data: ledgerData } = useQuery({
    queryKey: ['ledger', activeBusiness?.id, selectedLedgerAccountId],
    queryFn: async () => {
      if (!selectedLedgerAccountId) return null;
      const res = await apiClient.get<ApiResponse<LedgerResponse>>(
        `/journals/ledger/${selectedLedgerAccountId}`
      );
      return res.data.data ?? null;
    },
    enabled: !!activeBusiness?.id && activeTab === 'ledger' && !!selectedLedgerAccountId,
  });

  // Account CRUD mutations
  const createAccountMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/accounts', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Akun CoA baru berhasil dibuat!');
      setIsAccountModalOpen(false);
      setEditingAccount(null);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['all-accounts'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal membuat akun CoA.');
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await apiClient.put<ApiResponse<any>>(`/accounts/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Akun CoA berhasil diperbarui!');
      setIsAccountModalOpen(false);
      setEditingAccount(null);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['all-accounts'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui akun CoA.');
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete<ApiResponse<any>>(`/accounts/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Akun CoA berhasil dihapus!');
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['all-accounts'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus akun CoA.');
    },
  });

  // Manual journal mutations (Create, Update, Delete)
  const createJournalMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/journals/manual', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Jurnal manual ${data.data?.nomorJurnal || ''} berhasil dicatat!`);
      setIsManualJournalModalOpen(false);
      resetManualForm();
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menyimpan jurnal manual.');
    },
  });

  const updateJournalMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await apiClient.put<ApiResponse<any>>(`/journals/manual/${id}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Jurnal ${data.data?.nomorJurnal || ''} berhasil diperbarui!`);
      setIsManualJournalModalOpen(false);
      setEditingJournal(null);
      resetManualForm();
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui jurnal.');
    },
  });

  const deleteJournalMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete<ApiResponse<any>>(`/journals/manual/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Jurnal berhasil dihapus!');
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus jurnal.');
    },
  });

  const resetManualForm = () => {
    setManualLines([
      { accountId: '', isDebit: true, amount: '', description: '' },
      { accountId: '', isDebit: false, amount: '', description: '' },
    ]);
    setManualDesc('');
    setManualDate(formatTanggalISO());
    setManualType('PENYESUAIAN');
    setEditingJournal(null);
  };

  const openCreateManualJournal = () => {
    resetManualForm();
    setIsManualJournalModalOpen(true);
  };

  const openEditManualJournal = (j: JournalItem) => {
    setEditingJournal(j);
    setManualDesc(j.description);
    setManualType(j.type);
    setManualDate(j.journalDate ? formatTanggalISO(j.journalDate) : formatTanggalISO());
    const accountList = allAccounts || accounts;
    setManualLines(
      j.lines.map((l) => ({
        accountId:
          l.accountId ||
          (accountList?.find((a) => a.code === l.accountCode)?.id ?? ''),
        isDebit: l.isDebit,
        amount: l.amount.toString(),
        description: l.description || '',
      }))
    );
    setIsManualJournalModalOpen(true);
  };

  // Double-entry validation calculation for modal
  const sumDebitManual = manualLines
    .filter((l) => l.isDebit)
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
  const sumKreditManual = manualLines
    .filter((l) => !l.isDebit)
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
  const isBalancedManual = sumDebitManual > 0 && Math.abs(sumDebitManual - sumKreditManual) < 0.01;

  const openCreateAccountModal = () => {
    setEditingAccount(null);
    setAccCode('');
    setAccName('');
    setAccType('ASET');
    setAccNormalBalance('DEBIT');
    setAccParentId('');
    setAccDescription('');
    setIsAccountModalOpen(true);
  };

  const openEditAccountModal = (acc: AccountItem) => {
    setEditingAccount(acc);
    setAccCode(acc.code);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccNormalBalance(acc.normalBalance);
    setAccParentId(acc.parentId ? acc.parentId : '');
    setAccDescription(acc.description || '');
    setIsAccountModalOpen(true);
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accCode.trim() || !accName.trim()) {
      toast.error('Kode dan nama akun wajib diisi.');
      return;
    }

    if (editingAccount) {
      updateAccountMutation.mutate({
        id: editingAccount.id,
        payload: {
          code: accCode.trim(),
          name: accName.trim(),
          type: accType,
          normalBalance: accNormalBalance,
          parentId: accParentId ? Number(accParentId) : null,
          description: accDescription.trim() || undefined,
        },
      });
    } else {
      createAccountMutation.mutate({
        code: accCode.trim(),
        name: accName.trim(),
        type: accType,
        normalBalance: accNormalBalance,
        parentId: accParentId ? Number(accParentId) : null,
        description: accDescription.trim() || undefined,
      });
    }
  };

  const handleManualJournalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDesc.trim()) {
      toast.error('Keterangan jurnal wajib diisi.');
      return;
    }

    if (manualLines.some((l) => !l.accountId || !l.amount || parseFloat(l.amount) <= 0)) {
      toast.error('Semua baris akun dan nominal harus dipilih dan valid.');
      return;
    }

    if (!isBalancedManual) {
      toast.error('Prinsip akuntansi: Total Debit harus seimbang dengan Total Kredit!');
      return;
    }

    const payload = {
      type: manualType,
      description: manualDesc.trim(),
      journalDate: manualDate ? combineDateWithLocalTime(manualDate) : undefined,
      items: manualLines.map((l) => ({
        accountId: Number(l.accountId),
        isDebit: l.isDebit,
        amount: parseFloat(l.amount),
        description: l.description.trim() || manualDesc.trim(),
      })),
    };

    if (editingJournal) {
      updateJournalMutation.mutate({ id: editingJournal.id, payload });
    } else {
      createJournalMutation.mutate(payload);
    }
  };

  const addManualLine = (isDebit: boolean) => {
    setManualLines((prev) => [
      ...prev,
      { accountId: '', isDebit, amount: '', description: '' },
    ]);
  };

  const removeManualLine = (index: number) => {
    if (manualLines.length <= 2) {
      toast.error('Jurnal double-entry minimal memerlukan 2 baris (Debit & Kredit).');
      return;
    }
    setManualLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-primary-600" />
            Buku Akuntansi & Chart of Accounts
          </h1>
          <p className="text-surface-500 text-sm mt-1">
            Pengelolaan kode akun (CoA), Jurnal Umum (Double-Entry), dan Buku Besar per unit usaha
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'coa' && (
            <button
              onClick={openCreateAccountModal}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Tambah Akun CoA
            </button>
          )}
          {activeTab === 'journal' && (
            <button
              onClick={openCreateManualJournal}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Input Jurnal Manual
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-surface-200 gap-6">
        {[
          { id: 'coa', name: 'Daftar Akun (CoA)', icon: FileSpreadsheet },
          { id: 'journal', name: 'Jurnal Umum (General Journal)', icon: BookOpen },
          { id: 'ledger', name: 'Buku Besar (General Ledger)', icon: CreditCard },
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

      {/* TAB 1: CHART OF ACCOUNTS (CoA) */}
      {activeTab === 'coa' && (
        <div className="space-y-4">
          <div className="card p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-surface-500 px-2">Filter Golongan:</span>
              {['', 'ASET', 'KEWAJIBAN', 'EKUITAS', 'PENDAPATAN', 'BEBAN'].map((t) => (
                <button
                  key={t}
                  onClick={() => setAccountTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    accountTypeFilter === t
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-surface-50 text-surface-700 hover:bg-surface-100 border border-surface-200'
                  }`}
                >
                  {t || 'Semua Golongan'}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                value={coaSearch}
                onChange={(e) => setCoaSearch(e.target.value)}
                placeholder="Cari kode atau nama akun..."
                className="input pl-9 py-1.5 text-xs w-full"
              />
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Kode Akun</th>
                    <th>Nama Akun</th>
                    <th>Golongan</th>
                    <th>Saldo Normal</th>
                    <th>Akun Induk (Parent)</th>
                    <th className="text-center">Integrasi Sistem</th>
                    <th className="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingAccounts ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-surface-400">
                        Memuat Chart of Accounts...
                      </td>
                    </tr>
                  ) : accounts?.filter((a) => {
                      if (!coaSearch.trim()) return true;
                      const q = coaSearch.toLowerCase();
                      return a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
                    }).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-surface-400">
                        Tidak ada akun akuntansi yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    accounts
                      ?.filter((a) => {
                        if (!coaSearch.trim()) return true;
                        const q = coaSearch.toLowerCase();
                        return a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
                      })
                      .map((acc) => (
                        <tr key={acc.id} className="hover:bg-surface-50/80 transition-colors">
                          <td className="font-mono font-bold text-xs text-primary-700">
                            {acc.code}
                          </td>
                          <td>
                            <p className="font-medium text-surface-900 text-sm">{acc.name}</p>
                            {acc.description && (
                              <p className="text-[11px] text-surface-400 mt-0.5">{acc.description}</p>
                            )}
                          </td>
                          <td>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                acc.type === 'ASET'
                                  ? 'bg-sky-100 text-sky-800'
                                  : acc.type === 'KEWAJIBAN'
                                  ? 'bg-amber-100 text-amber-800'
                                  : acc.type === 'EKUITAS'
                                  ? 'bg-purple-100 text-purple-800'
                                  : acc.type === 'PENDAPATAN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {acc.type}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`font-mono text-xs font-semibold ${
                                acc.normalBalance === 'DEBIT' ? 'text-primary-600' : 'text-amber-600'
                              }`}
                            >
                              {acc.normalBalance}
                            </span>
                          </td>
                          <td className="text-xs text-surface-500">
                            {acc.parent ? `${acc.parent.code} - ${acc.parent.name}` : '-'}
                          </td>
                          <td className="text-center">
                            {acc.isLocked ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                                title="Akun sistem standar yang terhubung dengan modul POS, Inventaris, atau Laporan Keuangan"
                              >
                                <Lock className="w-3 h-3 text-amber-600" />
                                Terkunci (Sistem)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-100 text-surface-600 border border-surface-200">
                                Kustom
                              </span>
                            )}
                          </td>
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEditAccountModal(acc)}
                                className="p-1.5 text-surface-500 hover:text-amber-600 hover:bg-surface-100 rounded-lg transition-colors"
                                title="Edit Akun CoA"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {acc.isLocked ? (
                                <button
                                  disabled
                                  className="p-1.5 text-surface-300 cursor-not-allowed rounded-lg"
                                  title="Akun sistem standar dikunci dan tidak dapat dihapus demi integritas akuntansi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : acc.hasJournalItems ? (
                                <button
                                  disabled
                                  className="p-1.5 text-surface-300 cursor-not-allowed rounded-lg"
                                  title="Akun ini telah memiliki riwayat transaksi jurnal umum sehingga tidak dapat dihapus (Audit Trail)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={async () => {
                                    const confirmed = await confirmDialog({
                                      title: 'Hapus Akun Perkiraan (CoA)?',
                                      message: `Apakah Anda yakin ingin menghapus akun perkiraan ini dari Bagan Akun?`,
                                      confirmText: 'Ya, Hapus Akun',
                                      type: 'danger',
                                      itemDetails: [
                                        { label: 'Kode Akun', value: acc.code },
                                        { label: 'Nama Akun', value: acc.name },
                                        { label: 'Kategori / Tipe', value: acc.type },
                                      ],
                                    });
                                    if (confirmed) {
                                      deleteAccountMutation.mutate(acc.id);
                                    }
                                  }}
                                  className="p-1.5 text-surface-500 hover:text-rose-600 hover:bg-surface-100 rounded-lg transition-colors"
                                  title="Hapus Akun CoA"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
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

      {/* TAB 2: JURNAL UMUM (GENERAL JOURNAL) */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          {/* Filter & Sorting Controls */}
          <div className="card p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search */}
              <div className="md:col-span-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={journalSearch}
                  onChange={(e) => setJournalSearch(e.target.value)}
                  placeholder="Cari no. jurnal atau keterangan..."
                  className="input pl-9 text-xs"
                />
              </div>

              {/* Tipe Jurnal */}
              <div className="md:col-span-2">
                <select
                  value={journalTypeFilter}
                  onChange={(e) => setJournalTypeFilter(e.target.value)}
                  className="input text-xs"
                >
                  <option value="">Semua Tipe Jurnal</option>
                  <option value="PENJUALAN">Penjualan</option>
                  <option value="PENGELUARAN">Pengeluaran</option>
                  <option value="PENYESUAIAN">Penyesuaian</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="PEMBUKAAN">Pembukaan</option>
                  <option value="PENUTUPAN">Penutupan</option>
                </select>
              </div>

              {/* Tanggal Mulai */}
              <div className="md:col-span-2">
                <input
                  type="date"
                  value={journalStartDate}
                  onChange={(e) => setJournalStartDate(e.target.value)}
                  className="input text-xs"
                  title="Tanggal Mulai"
                />
              </div>

              {/* Tanggal Akhir */}
              <div className="md:col-span-2">
                <input
                  type="date"
                  value={journalEndDate}
                  onChange={(e) => setJournalEndDate(e.target.value)}
                  className="input text-xs"
                  title="Tanggal Akhir"
                />
              </div>

              {/* Sort Dropdown */}
              <div className="md:col-span-2">
                <select
                  value={`${journalSortBy}-${journalSortOrder}`}
                  onChange={(e) => {
                    const [by, ord] = e.target.value.split('-') as [any, any];
                    setJournalSortBy(by);
                    setJournalSortOrder(ord);
                  }}
                  className="input text-xs"
                >
                  <option value="date-desc">Tanggal: Terbaru</option>
                  <option value="date-asc">Tanggal: Terlama</option>
                  <option value="amount-desc">Nominal: Terbesar</option>
                  <option value="amount-asc">Nominal: Terkecil</option>
                  <option value="nomor-asc">No. Jurnal (A-Z)</option>
                  <option value="nomor-desc">No. Jurnal (Z-A)</option>
                </select>
              </div>
            </div>

            {(journalSearch ||
              journalTypeFilter ||
              journalStartDate ||
              journalEndDate ||
              journalSortBy !== 'date' ||
              journalSortOrder !== 'desc') && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setJournalSearch('');
                    setJournalTypeFilter('');
                    setJournalStartDate('');
                    setJournalEndDate('');
                    setJournalSortBy('date');
                    setJournalSortOrder('desc');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Semua Filter & Urutan
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {isLoadingJournals ? (
              <div className="text-center py-12 text-surface-400">Memuat jurnal...</div>
            ) : journals && journals.length === 0 ? (
              <div className="card p-12 text-center text-surface-400">
                Belum ada jurnal umum yang sesuai dengan filter pencarian.
              </div>
            ) : (
              journals?.map((j) => (
                <div
                  key={j.id}
                  className={`card p-4 border transition-all ${
                    j.isReversed
                      ? 'border-rose-200 bg-rose-50/30'
                      : 'border-surface-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-3 border-b border-surface-100 gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-primary-700">
                        {j.nomorJurnal}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-100 text-surface-700">
                        {j.type}
                      </span>
                      {j.transactionId ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-100 text-surface-600">
                          SISTEM (KASIR POS)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          UMUM / MANUAL
                        </span>
                      )}
                      {j.isReversed && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                          VOID / DIBALIKKAN
                        </span>
                      )}
                      {j.reversedFromId && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          JURNAL PEMBALIK
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-xs text-surface-500 font-mono">
                        {formatTanggalJam(j.journalDate)} • Operator: {j.creator}
                      </div>

                      {/* CRUD Action Buttons: Jurnal Penjualan (Khusus Super Admin), Jurnal Manual (Admin & Super Admin) */}
                      {!j.isReversed && (j.transactionId ? isSuperAdmin : isAdminOrSuperAdmin) && (
                        <div className="flex items-center gap-1.5 pl-2 border-l border-surface-200">
                          <button
                            onClick={() => openEditManualJournal(j)}
                            title={j.transactionId ? "Edit Jurnal Penjualan (Khusus Super Admin)" : "Edit Jurnal"}
                            className="p-1.5 rounded-md text-surface-500 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              const extraWarn = j.transactionId
                                ? 'PERHATIAN: Jurnal ini terikat dengan transaksi kasir POS. Menghapus jurnal akan memengaruhi pembukuan dan laporan keuangan!'
                                : 'Seluruh baris pencatatan debit & kredit pada jurnal ini akan dihapus.';
                              const confirmed = await confirmDialog({
                                title: 'Hapus Entri Jurnal Umum?',
                                message: extraWarn,
                                confirmText: 'Ya, Hapus Jurnal',
                                type: 'danger',
                                itemDetails: [
                                  { label: 'Nomor Jurnal', value: j.nomorJurnal },
                                  { label: 'Keterangan', value: j.description },
                                  { label: 'Total Nominal', value: formatRupiah(j.totalDebit) },
                                ],
                              });
                              if (confirmed) {
                                deleteJournalMutation.mutate(j.id);
                              }
                            }}
                            title={j.transactionId ? "Hapus Jurnal Penjualan (Khusus Super Admin)" : "Hapus Jurnal"}
                            className="p-1.5 rounded-md text-surface-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-surface-700 font-medium mb-3">{j.description}</p>

                  {/* Journal Lines (Double-Entry View) */}
                  <div className="bg-surface-50 rounded-lg p-2.5 space-y-1 font-mono text-xs">
                    {j.lines.map((l) => (
                      <div
                        key={l.id}
                        className={`flex items-center justify-between py-1 px-2 rounded ${
                          l.isDebit ? 'bg-white' : 'bg-surface-100/60 pl-8'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold text-surface-800 mr-2">{l.accountCode}</span>
                          <span className="text-surface-700">{l.accountName}</span>
                          {l.description && (
                            <span className="text-surface-400 text-[10px] ml-2 italic">
                              ({l.description})
                            </span>
                          )}
                        </div>
                        <div className="flex gap-6 shrink-0 text-right">
                          <span
                            className={`w-28 ${
                              l.isDebit ? 'font-bold text-surface-900' : 'text-surface-400'
                            }`}
                          >
                            {l.isDebit ? formatRupiah(l.amount) : '-'}
                          </span>
                          <span
                            className={`w-28 ${
                              !l.isDebit ? 'font-bold text-surface-900' : 'text-surface-400'
                            }`}
                          >
                            {!l.isDebit ? formatRupiah(l.amount) : '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-surface-200 font-bold px-2 text-surface-900">
                      <span>TOTAL BALANCE</span>
                      <div className="flex gap-6 text-right">
                        <span className="w-28 text-emerald-600">{formatRupiah(j.totalDebit)}</span>
                        <span className="w-28 text-emerald-600">{formatRupiah(j.totalKredit)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BUKU BESAR (GENERAL LEDGER) */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="card p-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="text-xs font-semibold text-surface-600 block mb-1">
                Pilih Akun Buku Besar:
              </label>
              <select
                value={selectedLedgerAccountId}
                onChange={(e) => setSelectedLedgerAccountId(Number(e.target.value))}
                className="input text-xs"
              >
                <option value="">Pilih Akun...</option>
                {accounts?.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedLedgerAccountId && ledgerData && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card p-3.5 text-center">
                  <p className="text-[11px] text-surface-500">Saldo Awal</p>
                  <p className="text-sm font-bold font-mono text-surface-900 mt-1">
                    {formatRupiah(ledgerData.initialBalance)}
                  </p>
                </div>
                <div className="card p-3.5 text-center">
                  <p className="text-[11px] text-surface-500">Total Mutasi Debit</p>
                  <p className="text-sm font-bold font-mono text-primary-600 mt-1">
                    {formatRupiah(ledgerData.totalDebit)}
                  </p>
                </div>
                <div className="card p-3.5 text-center">
                  <p className="text-[11px] text-surface-500">Total Mutasi Kredit</p>
                  <p className="text-sm font-bold font-mono text-amber-600 mt-1">
                    {formatRupiah(ledgerData.totalKredit)}
                  </p>
                </div>
                <div className="card p-3.5 text-center bg-primary-50/50 border border-primary-100">
                  <p className="text-[11px] text-primary-700 font-semibold">Saldo Akhir</p>
                  <p className="text-base font-extrabold font-mono text-primary-700 mt-0.5">
                    {formatRupiah(ledgerData.closingBalance)}
                  </p>
                </div>
              </div>

              {/* Mutation Table */}
              <div className="card overflow-hidden">
                <div className="table-container">
                  <table className="table text-xs">
                    <thead>
                      <tr>
                        <th>Waktu</th>
                        <th>No. Jurnal</th>
                        <th>Keterangan</th>
                        <th className="text-right">Debit</th>
                        <th className="text-right">Kredit</th>
                        <th className="text-right">Saldo Berjalan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerData.mutations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-surface-400">
                            Tidak ada transaksi mutasi pada akun ini.
                          </td>
                        </tr>
                      ) : (
                        ledgerData.mutations.map((m) => (
                          <tr key={m.id} className="hover:bg-surface-50/80 transition-colors">
                            <td className="font-mono text-[11px]">
                              {formatTanggalJam(m.journalDate)}
                            </td>
                            <td className="font-mono font-bold text-primary-700">
                              {m.nomorJurnal}
                            </td>
                            <td className="text-surface-700">{m.description}</td>
                            <td className="text-right font-mono text-surface-900">
                              {m.debit > 0 ? formatRupiah(m.debit) : '-'}
                            </td>
                            <td className="text-right font-mono text-surface-900">
                              {m.kredit > 0 ? formatRupiah(m.kredit) : '-'}
                            </td>
                            <td className="text-right font-mono font-bold text-primary-700">
                              {formatRupiah(m.balance)}
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
      )}

      {/* MODAL TAMBAH / EDIT AKUN CoA */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-surface-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-base font-bold text-surface-900 mb-1">
              {editingAccount ? 'Edit Akun CoA' : 'Tambah Akun CoA Baru'}
            </h2>
            <p className="text-xs text-surface-500 mb-4">
              {editingAccount
                ? 'Perbarui detail informasi akun bagan perkiraan'
                : 'Tambahkan kode perkiraan baru pada bagan akun akuntansi usaha'}
            </p>

            {editingAccount?.isLocked && (
              <div className="p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Akun ini adalah akun standar sistem. Kode dan golongan akun dikunci untuk menjaga integritas transaksi kasir & laporan keuangan.
                </span>
              </div>
            )}

            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">
                    Kode Akun * {editingAccount?.isLocked && <span className="text-[10px] text-amber-600">(Terkunci)</span>}
                  </label>
                  <input
                    type="text"
                    required
                    value={accCode}
                    onChange={(e) => setAccCode(e.target.value)}
                    disabled={!!editingAccount?.isLocked}
                    placeholder="Contoh: 1-1008"
                    className="input font-mono text-xs disabled:bg-surface-100 disabled:text-surface-500"
                  />
                </div>
                <div>
                  <label className="label">
                    Golongan Akun * {editingAccount?.isLocked && <span className="text-[10px] text-amber-600">(Terkunci)</span>}
                  </label>
                  <select
                    value={accType}
                    disabled={!!editingAccount?.isLocked}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setAccType(t);
                      setAccNormalBalance(t === 'ASET' || t === 'BEBAN' ? 'DEBIT' : 'KREDIT');
                    }}
                    className="input text-xs disabled:bg-surface-100 disabled:text-surface-500"
                  >
                    <option value="ASET">1 - Aset</option>
                    <option value="KEWAJIBAN">2 - Kewajiban</option>
                    <option value="EKUITAS">3 - Ekuitas</option>
                    <option value="PENDAPATAN">4 - Pendapatan</option>
                    <option value="BEBAN">5 - Beban</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Nama Akun *</label>
                <input
                  type="text"
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="Contoh: Kas Operasional Cabang"
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Saldo Normal *</label>
                  <select
                    value={accNormalBalance}
                    onChange={(e) => setAccNormalBalance(e.target.value as any)}
                    className="input text-xs"
                  >
                    <option value="DEBIT">DEBIT</option>
                    <option value="KREDIT">KREDIT</option>
                  </select>
                </div>
                <div>
                  <label className="label">Akun Induk (Parent)</label>
                  <select
                    value={accParentId}
                    onChange={(e) => setAccParentId(e.target.value ? Number(e.target.value) : '')}
                    className="input text-xs"
                  >
                    <option value="">Tidak ada (Akun Utama)</option>
                    {accounts?.filter((a) => !editingAccount || a.id !== editingAccount.id).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Keterangan / Deskripsi</label>
                <textarea
                  rows={2}
                  value={accDescription}
                  onChange={(e) => setAccDescription(e.target.value)}
                  placeholder="Keterangan peruntukan akun..."
                  className="input text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createAccountMutation.isPending || updateAccountMutation.isPending}
                  className="btn-primary text-xs flex items-center gap-2"
                >
                  {(createAccountMutation.isPending || updateAccountMutation.isPending) && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {editingAccount ? 'Simpan Perubahan' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INPUT / EDIT JURNAL MANUAL (DOUBLE-ENTRY) */}
      {isManualJournalModalOpen && (
        <div className="fixed inset-0 z-50 bg-surface-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card w-full max-w-3xl max-h-[90vh] p-6 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100 mb-4">
              <div>
                <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary-600" />
                  {editingJournal
                    ? `Edit Jurnal (${editingJournal.nomorJurnal})`
                    : 'Input Jurnal Umum Manual'}
                </h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  {editingJournal
                    ? 'Perbarui rincian baris akun debit dan kredit dengan keseimbangan double-entry'
                    : 'Pencatatan penyesuaian, modal, atau transfer dengan sistem double-entry seimbang'}
                </p>
              </div>
              <button
                onClick={() => setIsManualJournalModalOpen(false)}
                className="text-surface-400 hover:text-surface-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingJournal?.transactionId && (
              <div className="mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 text-xs flex items-center gap-2">
                <span className="font-bold">⚠️ Hak Akses Super Admin:</span>
                <span>Jurnal ini terikat transaksi kasir POS. Perubahan akun dan nominal debit/kredit akan langsung memengaruhi laporan keuangan.</span>
              </div>
            )}

            <form onSubmit={handleManualJournalSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="label">Tanggal Jurnal *</label>
                    <input
                      type="date"
                      required
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="label">Jenis Jurnal *</label>
                    <select
                      value={manualType}
                      onChange={(e) => setManualType(e.target.value)}
                      className="input text-xs"
                    >
                      <option value="PENYESUAIAN">Penyesuaian (Adjustment)</option>
                      <option value="TRANSFER">Transfer Kas/Bank</option>
                      <option value="PEMBUKAAN">Pembukaan Modal</option>
                      <option value="PENUTUPAN">Penutupan Periode</option>
                      <option value="PENJUALAN">Penjualan</option>
                      <option value="PENGELUARAN">Pengeluaran</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Keterangan Transaksi *</label>
                    <input
                      type="text"
                      required
                      value={manualDesc}
                      onChange={(e) => setManualDesc(e.target.value)}
                      placeholder="Contoh: Penyesuaian penyusutan peralatan bulan ini"
                      className="input text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Double-Entry Lines Table */}
              <div className="flex-1 overflow-y-auto border border-surface-200 rounded-xl p-3 bg-surface-50/50 space-y-2 mb-4">
                <div className="flex justify-between items-center pb-2 border-b border-surface-200">
                  <span className="text-xs font-bold text-surface-700">Baris Perkiraan (Akun)</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => addManualLine(true)}
                      className="text-xs text-primary-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Baris Debit
                    </button>
                    <button
                      type="button"
                      onClick={() => addManualLine(false)}
                      className="text-xs text-amber-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Baris Kredit
                    </button>
                  </div>
                </div>

                {manualLines.map((line, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white p-2.5 rounded-lg border border-surface-200 shadow-2xs"
                  >
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded w-14 text-center shrink-0 ${
                        line.isDebit
                          ? 'bg-primary-100 text-primary-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {line.isDebit ? 'DEBIT' : 'KREDIT'}
                    </span>

                    <select
                      required
                      value={line.accountId}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : '';
                        setManualLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, accountId: val } : l))
                        );
                      }}
                      className="input text-xs flex-1"
                    >
                      <option value="">Pilih Akun CoA...</option>
                      {(allAccounts || accounts)?.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name} ({acc.type})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="Nominal (Rp)"
                      value={line.amount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, amount: val } : l))
                        );
                      }}
                      className="input font-mono text-xs sm:w-36 text-right font-semibold"
                    />

                    <input
                      type="text"
                      placeholder="Memo baris (opsional)"
                      value={line.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, description: val } : l))
                        );
                      }}
                      className="input text-xs sm:w-44"
                    />

                    <button
                      type="button"
                      onClick={() => removeManualLine(idx)}
                      className="text-surface-400 hover:text-rose-600 p-1 self-end sm:self-center"
                      title="Hapus Baris"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Balance Checker */}
              <div
                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between font-mono text-xs mb-4 gap-2 ${
                  isBalancedManual
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isBalancedManual ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                  )}
                  <span className="font-semibold">
                    {isBalancedManual ? 'JURNAL SEIMBANG (BALANCED)' : 'JURNAL TIDAK SEIMBANG'}
                  </span>
                </div>
                <div className="flex gap-4">
                  <span>Debit: {formatRupiah(sumDebitManual)}</span>
                  <span>Kredit: {formatRupiah(sumKreditManual)}</span>
                  {!isBalancedManual && (
                    <span className="text-rose-600 font-bold">
                      Selisih: {formatRupiah(Math.abs(sumDebitManual - sumKreditManual))}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setIsManualJournalModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    !isBalancedManual ||
                    createJournalMutation.isPending ||
                    updateJournalMutation.isPending
                  }
                  className="btn-primary text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(createJournalMutation.isPending || updateJournalMutation.isPending) && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {editingJournal ? 'Simpan Perubahan Jurnal' : 'Posting Jurnal Manual'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountingPage;
