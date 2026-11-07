import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  Printer,
  X,
  CreditCard,
  Banknote,
  QrCode,
  ArrowUpRight,
  Package,
  Receipt,
  Edit2,
  Eye,
  Tag,
  Bluetooth,
  Copy,
  Check,
  HelpCircle,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { formatRupiah, formatTanggalJam } from '../../utils/formatters';
import { confirmDialog } from '../../store/confirmStore';
import {
  isBluetoothSupported,
  getConnectedDeviceName,
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  printReceiptBluetooth,
  type ReceiptPrintData,
} from '../../utils/bluetoothPrinter';
import toast from 'react-hot-toast';
import type { ApiResponse } from '../../types/index';

interface ProductItem {
  id: number;
  code: string;
  name: string;
  category?: string | null;
  unit: string;
  sellingPrice: number;
  currentStock: number;
  isLowStock: boolean;
  isActive: boolean;
}

interface CartItem {
  product: ProductItem;
  quantity: number;
  subtotal: number;
}

interface AccountItem {
  id: number;
  code: string;
  name: string;
  type: string;
}

export function PosPage() {
  const queryClient = useQueryClient();
  const { activeBusiness, user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);

  // Modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'TUNAI' | 'TRANSFER' | 'QRIS' | 'DEBIT'>('TUNAI');
  const [cashPaid, setCashPaid] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Receipt Modal
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // History Struk Modal state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterDate, setHistoryFilterDate] = useState<'today' | 'all'>('today');
  const [detailReceipt, setDetailReceipt] = useState<any | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<any | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'TUNAI' | 'TRANSFER' | 'QRIS' | 'DEBIT'>('TUNAI');

  // Expense Modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseAccountId, setExpenseAccountId] = useState<number | ''>('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'TUNAI' | 'TRANSFER'>('TUNAI');
  const [expenseNotes, setExpenseNotes] = useState('');

  // Bluetooth Thermal Printer state
  const [btPrinterName, setBtPrinterName] = useState<string | null>(getConnectedDeviceName());
  const [isPrintingBt, setIsPrintingBt] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  const [isBtHelpModalOpen, setIsBtHelpModalOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Fetch unique categories for POS product filter
  const { data: posCategories } = useQuery({
    queryKey: ['product-categories', activeBusiness?.id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<string[]>>('/products/categories');
      return res.data.data ?? [];
    },
    enabled: !!activeBusiness?.id,
  });

  // Fetch products for active business
  const { data: productData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', activeBusiness?.id, search, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory && selectedCategory !== 'ALL') params.append('category', selectedCategory);
      params.append('limit', '80');
      const res = await apiClient.get<ApiResponse<ProductItem[]>>(`/products?${params.toString()}`);
      return res.data.data ?? [];
    },
    enabled: !!activeBusiness?.id,
  });

  // Fetch receipt history
  const { data: receiptHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['transactions', activeBusiness?.id, 'PEMASUKAN', historyFilterDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('type', 'PEMASUKAN');
      params.append('limit', '100');
      if (historyFilterDate === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.append('startDate', today);
        params.append('endDate', today);
      }
      const res = await apiClient.get<ApiResponse<any[]>>(`/transactions?${params.toString()}`);
      return res.data.data ?? [];
    },
    enabled: !!activeBusiness?.id && isHistoryModalOpen,
  });

  // Fetch expense accounts (BEBAN)
  const { data: expenseAccounts } = useQuery({
    queryKey: ['accounts', activeBusiness?.id, 'BEBAN'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<AccountItem[]>>('/accounts?type=BEBAN');
      return res.data.data ?? [];
    },
    enabled: !!activeBusiness?.id && isExpenseModalOpen,
  });

  // Cart Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const grandTotal = Math.max(0, subtotal - discount + tax);
  const numCashPaid = parseFloat(cashPaid) || 0;
  const change = Math.max(0, numCashPaid - grandTotal);

  // Auto set cashPaid to grandTotal on open if TUNAI
  useEffect(() => {
    if (isPaymentModalOpen && paymentMethod === 'TUNAI' && grandTotal > 0 && !cashPaid) {
      setCashPaid(grandTotal.toString());
    }
  }, [isPaymentModalOpen, paymentMethod, grandTotal]);

  // Cart operations
  const addToCart = (product: ProductItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.product.sellingPrice,
              }
            : item
        );
      }
      return [...prev, { product, quantity: 1, subtotal: product.sellingPrice }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.product.sellingPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setTax(0);
    setNotes('');
  };

  // Sale mutation
  const saleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/transactions/sale', payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Transaksi berhasil! No: ${data.nomorBukti}`);
      setCompletedSale({
        ...data,
        items: [...cart],
        businessName: activeBusiness?.name,
        businessAddress: activeBusiness?.address,
        businessPhone: activeBusiness?.phone,
        cashier: user?.fullName,
      });
      setIsPaymentModalOpen(false);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memproses transaksi kasir.');
    },
  });

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      toast.error('Keranjang belanja kosong.');
      return;
    }

    if (paymentMethod === 'TUNAI' && numCashPaid < grandTotal) {
      toast.error('Uang tunai yang dibayarkan kurang dari total tagihan.');
      return;
    }

    const payload = {
      items: cart.map((item) => ({
        productId: item.product.id,
        itemName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.sellingPrice,
        subtotal: item.subtotal,
      })),
      paymentMethod,
      discountAmount: discount,
      taxAmount: tax,
      cashPaid: paymentMethod === 'TUNAI' ? numCashPaid : undefined,
      notes: notes.trim() || undefined,
    };

    saleMutation.mutate(payload);
  };

  // Expense mutation
  const expenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post<ApiResponse<any>>('/transactions/expense', payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Pengeluaran kas tercatat! No: ${data.nomorBukti}`);
      setIsExpenseModalOpen(false);
      setExpenseAccountId('');
      setExpenseAmount('');
      setExpenseNotes('');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['income-statement'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menyimpan pengeluaran kas.');
    },
  });

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAccountId || !expenseAmount || !expenseNotes.trim()) {
      toast.error('Semua data pengeluaran wajib diisi.');
      return;
    }

    expenseMutation.mutate({
      expenseAccountId: Number(expenseAccountId),
      amount: parseFloat(expenseAmount),
      paymentMethod: expensePaymentMethod,
      notes: expenseNotes.trim(),
    });
  };

  // Update receipt mutation
  const updateReceiptMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await apiClient.put<ApiResponse<any>>(`/transactions/${id}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Data struk berhasil diperbarui');
      setEditingReceipt(null);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['sales-report'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui struk.');
    },
  });

  // Void receipt mutation
  const voidReceiptMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiClient.post<ApiResponse<any>>(`/transactions/${id}/void`, { reason });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Transaksi struk dibatalkan (void)');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales-report'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      if (detailReceipt) setDetailReceipt(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal membatalkan transaksi.');
    },
  });

  const handleReprintReceipt = async (receiptId: number) => {
    try {
      toast.loading('Menyiapkan struk cetak...', { id: 'print' });
      const res = await apiClient.get<ApiResponse<any>>(`/transactions/${receiptId}`);
      const data = res.data.data;
      setCompletedSale({
        nomorBukti: data.nomorBukti,
        transactionDate: data.transactionDate,
        businessName: activeBusiness?.name,
        businessAddress: activeBusiness?.address,
        businessPhone: activeBusiness?.phone,
        cashier: data.cashier,
        items: data.items.map((i: any) => ({
          product: { name: i.itemName, sellingPrice: i.unitPrice },
          quantity: i.quantity,
          subtotal: i.subtotal,
        })),
        grandTotal: data.grandTotal,
        paymentMethod: data.paymentMethod,
        cashPaid: data.cashPaid,
        changeAmount: data.changeAmount,
      });
      toast.success('Struk siap dicetak!', { id: 'print' });
    } catch {
      toast.error('Gagal memuat rincian struk untuk dicetak.', { id: 'print' });
    }
  };

  const handleOpenDetail = async (receiptId: number) => {
    try {
      toast.loading('Memuat rincian transaksi...', { id: 'detail' });
      const res = await apiClient.get<ApiResponse<any>>(`/transactions/${receiptId}`);
      setDetailReceipt(res.data.data);
      toast.dismiss('detail');
    } catch {
      toast.error('Gagal memuat detail transaksi.', { id: 'detail' });
    }
  };

  const handleOpenEdit = (receipt: any) => {
    setEditingReceipt(receipt);
    setEditNotes(receipt.notes || '');
    setEditPaymentMethod(receipt.paymentMethod || 'TUNAI');
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReceipt) return;
    updateReceiptMutation.mutate({
      id: editingReceipt.id,
      payload: {
        notes: editNotes.trim(),
        paymentMethod: editPaymentMethod,
      },
    });
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // Handler Koneksi Printer Bluetooth
  const handleConnectBluetooth = async () => {
    if (!isBluetoothSupported()) {
      setIsBtHelpModalOpen(true);
      return;
    }
    try {
      const name = await connectBluetoothPrinter();
      setBtPrinterName(name);
      toast.success(`Berhasil terhubung ke printer: ${name}!`);
    } catch (err: any) {
      if (err.message !== 'Pencarian printer dibatalkan.') {
        toast.error(err.message || 'Gagal menghubungkan printer bluetooth');
      }
    }
  };

  // Handler Putus Koneksi Printer Bluetooth
  const handleDisconnectBluetooth = async () => {
    await disconnectBluetoothPrinter();
    setBtPrinterName(null);
    toast.success('Koneksi printer bluetooth telah diputus.');
  };

  // Handler Cetak Struk via Bluetooth ESC/POS
  const handlePrintBluetooth = async (rawReceipt: any) => {
    if (!rawReceipt) return;
    setIsPrintingBt(true);
    try {
      const printItems = (rawReceipt.items || []).map((it: any) => ({
        name: it.product?.name || it.itemName || 'Item Menu',
        quantity: it.quantity || 1,
        unitPrice: it.product?.sellingPrice || it.unitPrice || 0,
        subtotal: it.subtotal || 0,
      }));

      const payload: ReceiptPrintData = {
        businessName: activeBusiness?.name || rawReceipt.businessName || 'ROBIN GROUP',
        businessAddress: activeBusiness?.address || rawReceipt.businessAddress,
        businessPhone: activeBusiness?.phone || rawReceipt.businessPhone,
        nomorBukti: rawReceipt.nomorBukti,
        transactionDate: rawReceipt.transactionDate || new Date(),
        cashier: rawReceipt.cashier || user?.fullName || 'Kasir',
        paymentMethod: rawReceipt.paymentMethod || 'TUNAI',
        items: printItems,
        subtotal: rawReceipt.totalAmount || rawReceipt.subtotal || 0,
        discountAmount: rawReceipt.discountAmount || 0,
        taxAmount: rawReceipt.taxAmount || 0,
        grandTotal: rawReceipt.grandTotal || 0,
        cashPaid: rawReceipt.cashPaid,
        changeAmount: rawReceipt.changeAmount,
        notes: rawReceipt.notes,
      };

      await printReceiptBluetooth(payload, paperWidth);
      setBtPrinterName(getConnectedDeviceName());
      toast.success('Struk berhasil dicetak ke printer bluetooth!');
    } catch (err: any) {
      if (err.message !== 'Pencarian printer dibatalkan.') {
        toast.error(err.message || 'Gagal mencetak ke printer bluetooth');
      }
    } finally {
      setIsPrintingBt(false);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] md:h-screen flex flex-col lg:flex-row overflow-hidden bg-surface-100">
      {/* LEFT: Product Catalog */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-surface-200 bg-surface-50">
        {/* Top Header & Search Bar */}
        <div className="p-4 border-b border-surface-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk via nama atau scan barcode (F2)..."
              className="input pl-10 text-sm"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Tombol Bluetooth Printer Status / Connect */}
            {btPrinterName ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <Bluetooth className="w-3.5 h-3.5 text-emerald-600" />
                <span className="max-w-[110px] truncate">{btPrinterName}</span>
                <button
                  type="button"
                  onClick={handleDisconnectBluetooth}
                  className="ml-0.5 text-emerald-600 hover:text-rose-600 p-0.5 rounded transition-colors"
                  title="Putuskan sambungan printer bluetooth"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectBluetooth}
                className="btn-secondary text-xs flex items-center gap-1.5 shrink-0 justify-center border-blue-200 text-blue-700 bg-blue-50/70 hover:bg-blue-100"
                title="Sambungkan printer thermal bluetooth (tanpa aplikasi tambahan)"
              >
                <Bluetooth className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Hubungkan</span> Bluetooth
              </button>
            )}

            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="btn-secondary text-xs flex items-center gap-1.5 shrink-0 justify-center border-primary-200 text-primary-700 bg-primary-50/70 hover:bg-primary-100"
            >
              <Receipt className="w-3.5 h-3.5 text-primary-600" />
              Riwayat Struk
            </button>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="btn-secondary text-xs flex items-center gap-1.5 shrink-0 justify-center"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
              Catat Pengeluaran Kas
            </button>
          </div>
        </div>

        {/* Tipe Menu / Kategori Filter Pills */}
        {posCategories && posCategories.length > 0 && (
          <div className="px-4 py-2 border-b border-surface-200 bg-white flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
            <span className="text-[11px] font-semibold text-surface-400 whitespace-nowrap flex items-center gap-1 mr-1">
              <Tag className="w-3 h-3" /> Tipe:
            </span>
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                selectedCategory === 'ALL'
                  ? 'bg-primary-600 text-white shadow-2xs'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              Semua Menu
            </button>
            {posCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-primary-600 text-white shadow-2xs'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {isLoadingProducts ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : productData && productData.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-surface-700">Tidak ada produk ditemukan</p>
              <p className="text-xs text-surface-400 mt-1">
                Silakan tambah menu di menu "Manajemen Menu" terlebih dahulu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {productData?.map((product) => {
                const inCart = cart.find((i) => i.product.id === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="card p-3.5 text-left hover:border-primary-400 hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden active:scale-98"
                  >
                    {inCart && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-primary-600 text-white font-bold text-[10px] rounded-md shadow-xs">
                        {inCart.quantity}x
                      </span>
                    )}
                    <div>
                      {product.category && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 border border-primary-200/50 mb-1 inline-block">
                          {product.category}
                        </span>
                      )}
                      <span className="text-[10px] font-mono font-medium text-surface-400 block truncate">
                        {product.code}
                      </span>
                      <h4 className="font-semibold text-surface-900 text-xs sm:text-sm line-clamp-2 mt-0.5 group-hover:text-primary-600 transition-colors">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-surface-100 flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold text-primary-600">
                        {formatRupiah(product.sellingPrice)}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {product.unit}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart & Checkout Sidebar */}
      <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-surface-200 flex flex-col shadow-lg z-10 h-1/2 lg:h-full">
        {/* Cart Header */}
        <div className="p-4 border-b border-surface-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary-600" />
            <h2 className="font-bold text-sm text-surface-900">Pesanan Aktif</h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary-50 text-primary-700">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} item
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Kosongkan
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-surface-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-surface-400 p-6">
              <ShoppingCart className="w-12 h-12 stroke-1 mb-2 text-surface-300" />
              <p className="text-xs font-medium">Keranjang masih kosong</p>
              <p className="text-[11px] text-surface-400 mt-0.5">
                Pilih produk di katalog sebelah kiri untuk memulai
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="pt-3 first:pt-0 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-surface-900 truncate">
                    {item.product.name}
                  </p>
                  <p className="text-[11px] text-surface-500 font-mono">
                    {formatRupiah(item.product.sellingPrice)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="w-6 h-6 rounded-md bg-surface-100 hover:bg-surface-200 flex items-center justify-center text-surface-700 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-7 text-center font-bold text-xs text-surface-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="w-6 h-6 rounded-md bg-surface-100 hover:bg-surface-200 flex items-center justify-center text-surface-700 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="w-6 h-6 rounded-md text-surface-400 hover:text-rose-600 flex items-center justify-center transition-colors ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculation & Payment Button */}
        <div className="p-4 border-t border-surface-200 bg-surface-50/50 space-y-2">
          <div className="flex justify-between text-xs text-surface-600">
            <span>Subtotal</span>
            <span className="font-mono font-medium">{formatRupiah(subtotal)}</span>
          </div>

          <div className="flex justify-between text-xs text-surface-600 items-center">
            <span>Diskon (Rp)</span>
            <input
              type="number"
              min="0"
              value={discount || ''}
              onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="0"
              className="w-24 text-right px-2 py-0.5 rounded border border-surface-200 text-xs font-mono"
            />
          </div>

          <div className="pt-2 border-t border-surface-200 flex justify-between items-baseline">
            <span className="font-bold text-sm text-surface-900">Total Tagihan</span>
            <span className="font-bold text-lg text-primary-600 font-mono">
              {formatRupiah(grandTotal)}
            </span>
          </div>

          <button
            id="btn-process-payment"
            disabled={cart.length === 0}
            onClick={() => setIsPaymentModalOpen(true)}
            className="btn-primary w-full py-3 mt-2 font-bold text-sm shadow-md shadow-primary-600/25 flex items-center justify-center gap-2"
          >
            <Banknote className="w-4 h-4" />
            Bayar (F9) — {formatRupiah(grandTotal)}
          </button>
        </div>
      </div>

      {/* MODAL PEMBAYARAN */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-surface-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100 mb-4">
              <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Proses Pembayaran
              </h2>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-surface-400 hover:text-surface-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4">
              {/* Grand Total Display */}
              <div className="p-4 rounded-xl bg-primary-50 border border-primary-100 text-center">
                <p className="text-xs text-primary-700 font-medium">Total yang harus dibayar</p>
                <p className="text-2xl font-extrabold text-primary-700 font-mono mt-0.5">
                  {formatRupiah(grandTotal)}
                </p>
              </div>

              {/* Metode Pembayaran */}
              <div>
                <label className="label mb-2">Metode Pembayaran</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['TUNAI', 'TRANSFER', 'QRIS', 'DEBIT'] as const).map((method) => {
                    const isSelected = paymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                            : 'bg-surface-50 border-surface-200 text-surface-700 hover:bg-surface-100'
                        }`}
                      >
                        {method === 'TUNAI' && <Banknote className="w-4 h-4" />}
                        {method === 'TRANSFER' && <CreditCard className="w-4 h-4" />}
                        {method === 'QRIS' && <QrCode className="w-4 h-4" />}
                        {method === 'DEBIT' && <CreditCard className="w-4 h-4" />}
                        <span>{method}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash Paid Input & Quick Buttons (jika TUNAI) */}
              {paymentMethod === 'TUNAI' && (
                <div className="space-y-2">
                  <label className="label">Uang Diterima (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={cashPaid}
                    onChange={(e) => setCashPaid(e.target.value)}
                    placeholder="0"
                    className="input text-lg font-mono font-bold text-surface-900"
                    autoFocus
                  />

                  {/* Quick Cash Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {[grandTotal, 50000, 100000, 200000, 500000].map((nominal) => (
                      <button
                        key={nominal}
                        type="button"
                        onClick={() => setCashPaid(nominal.toString())}
                        className="px-2.5 py-1 rounded-lg bg-surface-100 hover:bg-surface-200 text-surface-700 text-xs font-mono font-medium transition-colors"
                      >
                        {nominal === grandTotal ? 'Uang Pas' : formatRupiah(nominal)}
                      </button>
                    ))}
                  </div>

                  {/* Change calculation */}
                  <div className="p-3 rounded-xl bg-surface-100 border border-surface-200 flex justify-between items-center mt-2">
                    <span className="text-xs font-semibold text-surface-700">Kembalian:</span>
                    <span
                      className={`text-base font-bold font-mono ${
                        numCashPaid >= grandTotal ? 'text-emerald-600' : 'text-rose-500'
                      }`}
                    >
                      {formatRupiah(change)}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="label">Catatan Transaksi (Opsional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Meja 5 / Takeaway"
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="btn-secondary text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saleMutation.isPending || (paymentMethod === 'TUNAI' && numCashPaid < grandTotal)}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  {saleMutation.isPending && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Selesaikan Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL STRUK CETAK THERMAL */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-surface-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6 shadow-2xl flex flex-col items-center">
            {/* Printable Receipt Container (Thermal 58/80mm compatible) */}
            <div
              ref={receiptRef}
              className="w-full bg-white text-black p-4 font-mono text-[11px] leading-tight border border-dashed border-gray-300 rounded-lg shadow-xs"
            >
              <div className="text-center pb-2 border-b border-dashed border-gray-300 mb-2">
                <h3 className="font-bold text-sm uppercase">{completedSale.businessName || 'ROBIN GROUP'}</h3>
                {completedSale.businessAddress && <p className="text-[10px]">{completedSale.businessAddress}</p>}
                {completedSale.businessPhone && <p className="text-[10px]">Telp: {completedSale.businessPhone}</p>}
              </div>

              <div className="space-y-1 mb-2 pb-2 border-b border-dashed border-gray-300 text-[10px]">
                <div className="flex justify-between">
                  <span>No: {completedSale.nomorBukti}</span>
                  <span>{formatTanggalJam(completedSale.transactionDate)}</span>
                </div>
                <div>Kasir: {completedSale.cashier || 'Kasir'}</div>
              </div>

              <div className="space-y-1.5 mb-2 pb-2 border-b border-dashed border-gray-300">
                {completedSale.items?.map((it: any, idx: number) => (
                  <div key={idx}>
                    <div className="truncate font-semibold">{it.product.name}</div>
                    <div className="flex justify-between text-[10px] text-gray-700">
                      <span>{it.quantity} x {formatRupiah(it.product.sellingPrice)}</span>
                      <span>{formatRupiah(it.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pb-2 border-b border-dashed border-gray-300">
                <div className="flex justify-between font-bold text-xs">
                  <span>TOTAL</span>
                  <span>{formatRupiah(completedSale.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Metode:</span>
                  <span>{completedSale.paymentMethod}</span>
                </div>
                {completedSale.cashPaid !== null && (
                  <>
                    <div className="flex justify-between text-[10px]">
                      <span>Tunai Diterima:</span>
                      <span>{formatRupiah(completedSale.cashPaid)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span>Kembalian:</span>
                      <span>{formatRupiah(completedSale.changeAmount)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-center pt-3 text-[10px]">
                <p>Terima Kasih Atas Kunjungan Anda</p>
                <p className="text-[9px] text-gray-500 mt-0.5">Robin Group Offline POS</p>
              </div>
            </div>

            {/* Format Kertas Thermal Bluetooth */}
            <div className="flex items-center justify-between w-full px-2.5 py-1.5 bg-surface-50 rounded-lg text-xs border border-surface-200 mt-2.5 text-surface-600">
              <span className="font-semibold text-[11px] flex items-center gap-1">
                <Bluetooth className="w-3.5 h-3.5 text-blue-600" />
                Ukuran Thermal:
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPaperWidth('58mm')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                    paperWidth === '58mm'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-surface-200 text-surface-700 hover:bg-surface-300'
                  }`}
                >
                  58mm (Kecil)
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth('80mm')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                    paperWidth === '80mm'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-surface-200 text-surface-700 hover:bg-surface-300'
                  }`}
                >
                  80mm (Besar)
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full mt-3.5">
              <button
                type="button"
                onClick={() => handlePrintBluetooth(completedSale)}
                disabled={isPrintingBt}
                className="btn-primary flex-1 text-xs py-2.5 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs active:scale-98"
              >
                <Bluetooth className="w-4 h-4" />
                {isPrintingBt ? 'Mengirim Data...' : 'Cetak Bluetooth'}
              </button>
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="btn-secondary text-xs px-3 py-2.5 flex items-center justify-center gap-1.5"
                title="Cetak lewat dialog browser / print spooler"
              >
                <Printer className="w-4 h-4" /> Cetak Browser
              </button>
              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="btn-secondary text-xs px-3.5 py-2.5"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENGELUARAN KAS */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-surface-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100 mb-4">
              <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-rose-500" />
                Catat Pengeluaran Kas
              </h2>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-surface-400 hover:text-surface-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="label">Pos Akun Beban (CoA) *</label>
                <select
                  required
                  value={expenseAccountId}
                  onChange={(e) => setExpenseAccountId(Number(e.target.value))}
                  className="input text-xs"
                >
                  <option value="">Pilih Pos Beban...</option>
                  {expenseAccounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Nominal Pengeluaran (Rp) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="Contoh: 150000"
                  className="input font-mono text-sm"
                />
              </div>

              <div>
                <label className="label">Metode Pembayaran *</label>
                <select
                  value={expensePaymentMethod}
                  onChange={(e) => setExpensePaymentMethod(e.target.value as any)}
                  className="input text-xs"
                >
                  <option value="TUNAI">Kas Tunai Kasir</option>
                  <option value="TRANSFER">Transfer Rekening Bank</option>
                </select>
              </div>

              <div>
                <label className="label">Keterangan Pengeluaran *</label>
                <textarea
                  rows={2}
                  required
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="Contoh: Beli gas elpiji 3kg 2 tabung..."
                  className="input text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={expenseMutation.isPending}
                  className="btn-danger text-xs flex items-center gap-2"
                >
                  {expenseMutation.isPending && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RIWAYAT STRUK PENJUALAN KASIR */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="card w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-up overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-surface-200 flex items-center justify-between bg-surface-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-surface-900 text-sm">Riwayat Struk Penjualan Kasir</h3>
                  <p className="text-xs text-surface-500">
                    Daftar struk transaksi POS kasir ({activeBusiness?.name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-surface-400 hover:text-surface-700 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-3 border-b border-surface-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Cari berdasarkan No. Struk (TRX-...), kasir, atau catatan..."
                  className="input pl-9 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setHistoryFilterDate('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    historyFilterDate === 'today'
                      ? 'bg-primary-600 text-white shadow-2xs'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilterDate('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    historyFilterDate === 'all'
                      ? 'bg-primary-600 text-white shadow-2xs'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  Semua Riwayat
                </button>
              </div>
            </div>

            {/* Receipt Table List */}
            <div className="flex-1 overflow-y-auto p-3">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-16 text-surface-400">
                  <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="text-xs">Memuat riwayat transaksi struk kasir...</span>
                </div>
              ) : receiptHistory && receiptHistory.length === 0 ? (
                <div className="text-center py-16 text-surface-400">
                  <Receipt className="w-12 h-12 text-surface-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-surface-600">Belum ada transaksi struk</p>
                  <p className="text-[11px] text-surface-400 mt-0.5">
                    Transaksi baru yang dibuat di kasir akan muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="table-container border border-surface-200 rounded-lg">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>No. Struk</th>
                        <th>Waktu</th>
                        <th>Kasir</th>
                        <th>Metode</th>
                        <th className="text-right">Total Tagihan</th>
                        <th className="text-center">Status</th>
                        <th className="text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptHistory
                        ?.filter((r: any) => {
                          if (!historySearch) return true;
                          const s = historySearch.toLowerCase();
                          return (
                            r.nomorBukti.toLowerCase().includes(s) ||
                            (r.cashier && r.cashier.toLowerCase().includes(s)) ||
                            (r.notes && r.notes.toLowerCase().includes(s))
                          );
                        })
                        .map((r: any) => (
                          <tr key={r.id} className="hover:bg-surface-50/80 transition-colors">
                            <td>
                              <div>
                                <span className="font-mono text-xs font-bold text-surface-900 block">
                                  {r.nomorBukti}
                                </span>
                                {r.notes && (
                                  <span className="text-[10px] text-surface-400 truncate max-w-xs block">
                                    {r.notes}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-xs text-surface-600 whitespace-nowrap">
                              {formatTanggalJam(r.transactionDate)}
                            </td>
                            <td className="text-xs text-surface-700">{r.cashier || 'Kasir'}</td>
                            <td>
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-100 text-surface-700 border border-surface-200">
                                {r.paymentMethod}
                              </span>
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
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Cetak Bluetooth Cepat */}
                                <button
                                  type="button"
                                  onClick={() => handlePrintBluetooth(r)}
                                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Cetak Langsung via Bluetooth ESC/POS"
                                >
                                  <Bluetooth className="w-4 h-4" />
                                </button>

                                {/* Cetak Browser */}
                                <button
                                  type="button"
                                  onClick={() => handleReprintReceipt(r.id)}
                                  className="p-1.5 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors"
                                  title="Cetak Struk (Dialog Browser)"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>

                                {/* Rincian Struk */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(r.id)}
                                  className="p-1.5 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors"
                                  title="Lihat Rincian Item"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {/* Edit Catatan / Metode */}
                                {!r.isVoided && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(r)}
                                    className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                                    title="Edit Catatan / Metode Bayar"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Batalkan / Void */}
                                {!r.isVoided && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const confirmed = await confirmDialog({
                                        title: 'Batalkan / Void Struk Transaksi?',
                                        message: `Apakah Anda yakin ingin membatalkan struk "${r.nomorBukti}" sebesar ${formatRupiah(r.grandTotal)}? Transaksi akan dibatalkan, jurnal pembalik akan dicatat otomatis, dan stok barang akan dikembalikan.`,
                                        confirmText: 'Ya, Batalkan Transaksi',
                                        cancelText: 'Kembali',
                                        type: 'danger',
                                        itemDetails: [
                                          { label: 'No. Struk', value: r.nomorBukti },
                                          { label: 'Waktu', value: formatTanggalJam(r.transactionDate) },
                                          { label: 'Total Bayar', value: formatRupiah(r.grandTotal) },
                                          { label: 'Metode', value: r.paymentMethod },
                                        ],
                                      });

                                      if (confirmed) {
                                        const reason =
                                          window.prompt('Masukkan alasan pembatalan struk:') ||
                                          'Dibatalkan oleh kasir';
                                        voidReceiptMutation.mutate({ id: r.id, reason });
                                      }
                                    }}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Batalkan / Void Transaksi"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-surface-200 bg-surface-50 flex justify-between items-center text-xs text-surface-500">
              <span>Total data struk: {receiptHistory?.length || 0}</span>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="btn-secondary text-xs px-4"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RINCIAN STRUK DETAIL */}
      {detailReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card w-full max-w-md shadow-2xl animate-scale-up overflow-hidden">
            <div className="p-4 border-b border-surface-200 flex items-center justify-between bg-surface-50">
              <h3 className="font-bold text-surface-900 text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary-600" />
                Rincian Struk #{detailReceipt.nomorBukti}
              </h3>
              <button
                type="button"
                onClick={() => setDetailReceipt(null)}
                className="text-surface-400 hover:text-surface-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-mono max-h-[70vh] overflow-y-auto">
              <div className="space-y-1 pb-3 border-b border-surface-200">
                <div className="flex justify-between">
                  <span className="text-surface-500">Waktu:</span>
                  <span>{formatTanggalJam(detailReceipt.transactionDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Kasir:</span>
                  <span>{detailReceipt.cashier || 'Kasir'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">Metode Bayar:</span>
                  <span className="font-bold text-primary-700">{detailReceipt.paymentMethod}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 pb-3 border-b border-dashed border-surface-200">
                <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">
                  Daftar Pesanan Menu:
                </p>
                {detailReceipt.items?.map((it: any) => (
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
                  <span>{formatRupiah(detailReceipt.totalAmount)}</span>
                </div>
                {detailReceipt.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(detailReceipt.discountAmount)}</span>
                  </div>
                )}
                {detailReceipt.taxAmount > 0 && (
                  <div className="flex justify-between text-surface-600">
                    <span>Pajak:</span>
                    <span>+{formatRupiah(detailReceipt.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-surface-900 pt-1">
                  <span>TOTAL TAGIHAN:</span>
                  <span className="text-emerald-600">{formatRupiah(detailReceipt.grandTotal)}</span>
                </div>
                {detailReceipt.cashPaid !== null && (
                  <>
                    <div className="flex justify-between text-surface-600 pt-1">
                      <span>Tunai Diterima:</span>
                      <span>{formatRupiah(detailReceipt.cashPaid)}</span>
                    </div>
                    <div className="flex justify-between text-surface-600">
                      <span>Kembalian:</span>
                      <span>{formatRupiah(detailReceipt.changeAmount || 0)}</span>
                    </div>
                  </>
                )}
              </div>

              {detailReceipt.notes && (
                <div className="p-2.5 bg-surface-50 rounded-lg text-surface-600">
                  <span className="font-bold text-surface-500">Catatan:</span> {detailReceipt.notes}
                </div>
              )}

              {detailReceipt.isVoided && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
                  <p className="font-bold">STATUS TRANSAKSI: DIBATALKAN</p>
                  <p className="text-[11px] mt-0.5">Alasan: {detailReceipt.voidReason || '-'}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-surface-50 border-t border-surface-200 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintBluetooth(detailReceipt)}
                  disabled={isPrintingBt}
                  className="btn-primary text-xs flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  <Bluetooth className="w-3.5 h-3.5" /> {isPrintingBt ? 'Mencetak...' : 'Cetak Bluetooth'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleReprintReceipt(detailReceipt.id);
                    setDetailReceipt(null);
                  }}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                  title="Cetak lewat dialog browser / Android"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Browser
                </button>
              </div>
              <button
                type="button"
                onClick={() => setDetailReceipt(null)}
                className="btn-secondary text-xs px-4"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT CATATAN & METODE BAYAR STRUK */}
      {editingReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100 mb-4">
              <h2 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-600" />
                Edit Transaksi #{editingReceipt.nomorBukti}
              </h2>
              <button
                type="button"
                onClick={() => setEditingReceipt(null)}
                className="text-surface-400 hover:text-surface-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="label">Total Transaksi</label>
                <p className="font-mono text-base font-bold text-surface-900">
                  {formatRupiah(editingReceipt.grandTotal)}
                </p>
              </div>

              <div>
                <label className="label">Metode Pembayaran *</label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value as any)}
                  className="input text-xs"
                >
                  <option value="TUNAI">Kas Tunai Kasir</option>
                  <option value="QRIS">QRIS Statis/Dinamis</option>
                  <option value="TRANSFER">Transfer Rekening Bank</option>
                  <option value="DEBIT">Kartu Debit</option>
                </select>
                <p className="text-[11px] text-surface-400 mt-1">
                  Jurnal akuntansi (Kas vs Bank) akan disesuaikan otomatis jika metode diubah.
                </p>
              </div>

              <div>
                <label className="label">Catatan Transaksi / Pembeli</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Contoh: Meja 4, pesanan dibungkus, pelanggan a/n Bpk Budi..."
                  className="input text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-200">
                <button
                  type="button"
                  onClick={() => setEditingReceipt(null)}
                  className="btn-secondary text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateReceiptMutation.isPending}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {updateReceiptMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PANDUAN AKTIVASI BLUETOOTH DI CHROME ANDROID */}
      {isBtHelpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 shadow-2xl animate-scale-up space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Bluetooth className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-surface-900">Aktivasi Bluetooth di Tablet Android</h2>
                  <p className="text-[11px] text-surface-500">Panduan 1 Menit untuk Google Chrome</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBtHelpModalOpen(false)}
                className="text-surface-400 hover:text-surface-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                Mengapa pesan ini muncul?
              </p>
              <p className="text-amber-800 text-[11px]">
                Google Chrome Android memblokir fitur Bluetooth jika website dibuka via IP lokal (HTTP biasa). Anda hanya perlu mengizinkan alamat server ini <b>satu kali saja</b> di pengaturan Chrome.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-surface-50 border border-surface-200 rounded-xl space-y-1.5">
                <label className="text-[11px] font-semibold text-surface-600 block">
                  1. Salin Alamat URL Server Ini:
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-surface-300 px-3 py-1.5 rounded-lg text-xs font-mono text-surface-800 select-all overflow-x-auto">
                    {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(window.location.origin);
                        setCopiedUrl(true);
                        toast.success('Alamat URL berhasil disalin!');
                        setTimeout(() => setCopiedUrl(false), 3000);
                      }
                    }}
                    className={`btn text-xs px-3 py-1.5 flex items-center gap-1 font-semibold ${
                      copiedUrl ? 'bg-emerald-600 text-white' : 'btn-primary'
                    }`}
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Tersalin
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Salin URL
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs text-surface-700">
                <p className="font-semibold text-surface-800">2. Ikuti 3 Langkah Mudah Berikut di Chrome Tablet:</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed text-surface-600">
                  <li>
                    Buka <b>Tab Baru</b> di Google Chrome, lalu ketik pada kolom URL:{' '}
                    <code className="bg-surface-100 text-blue-600 px-1 py-0.5 rounded font-mono font-bold select-all">
                      chrome://flags
                    </code>
                  </li>
                  <li>
                    Pada kotak pencarian (<i>Search flags</i>), ketik:{' '}
                    <code className="bg-surface-100 text-surface-800 px-1 py-0.5 rounded font-mono font-bold">
                      Insecure origins treated as secure
                    </code>
                  </li>
                  <li>
                    <b>Tempelkan (Paste)</b> URL yang sudah Anda salin tadi ke dalam kotak teks yang tersedia.
                  </li>
                  <li>
                    Ubah tombol pilihan dari <b>Disabled</b> menjadi <b>Enabled</b>.
                  </li>
                  <li>
                    Tekan tombol biru <b>Relaunch</b> (Restart Chrome) di sudut kanan bawah layar.
                  </li>
                </ol>
              </div>

              <div className="p-3 bg-surface-100 rounded-xl text-[11px] text-surface-600 space-y-1 border border-surface-200">
                <p className="font-semibold text-surface-800">Tips Tambahan:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Pastikan <b>GPS / Lokasi</b> di tablet Android dalam posisi menyala (ON).</li>
                  <li>Beri izin <i>"Perangkat di sekitar (Nearby devices)"</i> untuk aplikasi Google Chrome di Pengaturan Android.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-200">
              <button
                type="button"
                onClick={() => setIsBtHelpModalOpen(false)}
                className="btn-primary text-xs px-5 py-2"
              >
                Saya Mengerti, Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PosPage;
