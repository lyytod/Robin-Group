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
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { formatRupiah, formatTanggalJam } from '../../utils/formatters';
import toast from 'react-hot-toast';
import type { ApiResponse } from '../../types/index';

interface ProductItem {
  id: number;
  code: string;
  name: string;
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

  // Expense Modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseAccountId, setExpenseAccountId] = useState<number | ''>('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'TUNAI' | 'TRANSFER'>('TUNAI');
  const [expenseNotes, setExpenseNotes] = useState('');

  // Fetch products for active business
  const { data: productData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', activeBusiness?.id, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', '50');
      const res = await apiClient.get<ApiResponse<ProductItem[]>>(`/products?${params.toString()}`);
      return res.data.data ?? [];
    },
    enabled: !!activeBusiness?.id,
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

  const handlePrintReceipt = () => {
    window.print();
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
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="btn-secondary text-xs flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-center"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
            Catat Pengeluaran Kas
          </button>
        </div>

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

            <div className="flex gap-2 w-full mt-4">
              <button
                onClick={handlePrintReceipt}
                className="btn-primary flex-1 text-xs py-2.5 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Cetak Struk
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="btn-secondary text-xs px-4 py-2.5"
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
    </div>
  );
}

export default PosPage;
