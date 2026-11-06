import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShoppingCart,
  UtensilsCrossed,
  Boxes,
  BookOpen,
  BarChart3,
  LogOut,
  ChevronDown,
  Check,
  Menu,
  X,
  Store,
  Shield,
  Banknote,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export function AppLayout() {
  const { user, businesses, activeBusiness, setActiveBusiness, logout } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Anda berhasil keluar dari sistem');
    navigate('/login', { replace: true });
  };

  const isKasir = user?.role === 'KASIR';

  const navItems = isKasir
    ? [{ name: 'Kasir (POS)', path: '/pos', icon: ShoppingCart }]
    : [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        ...(isSuperAdmin
          ? [
              { name: 'Unit Usaha', path: '/businesses', icon: Building2 },
              { name: 'Manajemen Staf', path: '/users', icon: Users },
            ]
          : []),
        { name: 'Manajemen Gaji', path: '/salaries', icon: Banknote },
        { name: 'Kasir (POS)', path: '/pos', icon: ShoppingCart },
        { name: 'Manajemen Menu', path: '/menu', icon: UtensilsCrossed },
        { name: 'Inventaris & Stok', path: '/inventory', icon: Boxes },
        { name: 'Buku Akuntansi', path: '/accounting', icon: BookOpen },
        { name: 'Laporan Keuangan', path: '/reports', icon: BarChart3 },
      ];

  return (
    <div className="min-h-screen bg-surface-100 flex flex-col md:flex-row text-surface-900 font-sans">
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-surface-900 text-white border-b border-surface-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center font-bold text-white text-sm">
            RG
          </div>
          <span className="font-semibold text-sm">Robin Group</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-surface-900 text-surface-200 flex flex-col border-r border-surface-800 transition-transform duration-200 md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-surface-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center font-bold text-white shadow-md shadow-primary-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white leading-tight">Robin Group</h1>
            <p className="text-[11px] text-surface-400">POS & Multi-Accounting</p>
          </div>
        </div>

        {/* Business Context Switcher */}
        <div className="p-3 border-b border-surface-800/80 bg-surface-950/40">
          <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider px-2 mb-1.5">
            Unit Usaha Aktif
          </p>
          <div className="relative">
            <button
              id="business-context-switcher"
              onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-surface-800/80 hover:bg-surface-800 border border-surface-700/60 text-left transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Store className="w-4 h-4 text-primary-400 shrink-0" />
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate">
                    {activeBusiness?.name || 'Pilih Unit Usaha'}
                  </p>
                  <p className="text-[10px] text-surface-400 font-mono">
                    {activeBusiness?.code || '-'}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-surface-400 shrink-0 transition-transform ${
                  isSwitcherOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isSwitcherOpen && (
              <>
                {/* Backdrop untuk klik di luar dropdown */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsSwitcherOpen(false)}
                />

                <div className="absolute top-full left-0 right-0 mt-2 p-1.5 bg-[#0f172a] border border-surface-700 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto space-y-1">
                  <div className="px-2 py-1 text-[10px] font-semibold text-surface-400 uppercase tracking-wider border-b border-surface-800 mb-1">
                    Pilih Cabang / Unit Usaha
                  </div>
                  {businesses.map((biz) => {
                    const isSelected = activeBusiness?.id === biz.id;
                    return (
                      <button
                        key={biz.id}
                        type="button"
                        onClick={() => {
                          setActiveBusiness(biz);
                          setIsSwitcherOpen(false);
                          toast.success(`Beralih ke unit usaha: ${biz.name}`);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs transition-all ${
                          isSelected
                            ? 'bg-primary-600 text-white font-bold shadow-xs'
                            : 'text-surface-200 hover:bg-surface-800 hover:text-white'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="font-semibold truncate">{biz.name}</p>
                          <span
                            className={`inline-block text-[10px] font-mono px-1.5 py-0.5 rounded mt-0.5 ${
                              isSelected
                                ? 'bg-primary-700 text-primary-100'
                                : 'bg-surface-800 text-surface-400'
                            }`}
                          >
                            {biz.code}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30'
                      : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-3 border-t border-surface-800/80 bg-surface-950/60">
          <div className="flex items-center justify-between p-2 rounded-xl bg-surface-900 border border-surface-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center font-bold text-xs text-primary-400">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-medium text-white truncate">{user?.fullName}</p>
                <span className="inline-flex items-center gap-1 text-[10px] text-surface-400">
                  <Shield className="w-2.5 h-2.5 text-primary-400" />
                  {user?.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar dari sistem"
              className="p-1.5 text-surface-400 hover:text-rose-400 hover:bg-surface-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 overflow-y-auto min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
