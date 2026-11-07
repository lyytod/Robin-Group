import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { useAuthStore } from './store/authStore';
import AppLayout from './components/layout/AppLayout';

// Lazy load pages untuk performa optimal
const LoginPage = React.lazy(() => import('./features/auth/LoginPage'));
const DashboardPage = React.lazy(() => import('./features/dashboard/DashboardPage'));
const BusinessListPage = React.lazy(() => import('./features/businesses/BusinessListPage'));
const UserListPage = React.lazy(() => import('./features/users/UserListPage'));
const PosPage = React.lazy(() => import('./features/pos/PosPage'));
const MenuManagementPage = React.lazy(() => import('./features/menu/MenuManagementPage'));
const InventoryPage = React.lazy(() => import('./features/inventory/InventoryPage'));
const AccountingPage = React.lazy(() => import('./features/accounting/AccountingPage'));
const ReportsPage = React.lazy(() => import('./features/reports/ReportsPage'));
const SalaryManagementPage = React.lazy(() =>
  import('./features/salaries/SalaryManagementPage').then((m) => ({ default: m.SalaryManagementPage }))
);
const AttendancePage = React.lazy(() => import('./features/attendance/AttendancePage'));
const OperationalHoursPage = React.lazy(() => import('./features/shifts/OperationalHoursPage'));

// Konfigurasi TanStack React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 menit
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Guard Protected Route (Akses memerlukan login)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// Guard Public Route (Redirect jika sudah login sesuai peran)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();
  if (token) {
    if (user?.role === 'KASIR' || user?.role === 'AGENT') {
      return <Navigate to="/pos" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

// Guard Role-Based Route (Membatasi akses per peran: SUPER_ADMIN, ADMIN, KASIR, AGENT)
function RoleRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: ('SUPER_ADMIN' | 'ADMIN' | 'KASIR' | 'AGENT')[];
}) {
  const { user } = useAuthStore();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role as any)) {
    // Jika kasir atau agent mencoba mengakses halaman yang tidak diizinkan, alihkan langsung ke kasir POS
    if (user.role === 'KASIR' || user.role === 'AGENT') {
      return <Navigate to="/pos" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Default Redirect handler berdasarkan status login dan peran
function DefaultRedirect() {
  const { token, user } = useAuthStore();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role === 'KASIR' || user?.role === 'AGENT') {
    return <Navigate to="/pos" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

function PageLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-surface-500 text-xs">Memuat aplikasi...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <React.Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* Public route */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />

            {/* Protected routes wrapped in AppLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard: Hanya Super Admin & Admin Usaha */}
              <Route
                path="/dashboard"
                element={
                  <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <DashboardPage />
                  </RoleRoute>
                }
              />

              {/* Kelola Unit Usaha & Manajemen Staf: Khusus Super Admin */}
              <Route
                path="/businesses"
                element={
                  <RoleRoute allowedRoles={['SUPER_ADMIN']}>
                    <BusinessListPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <RoleRoute allowedRoles={['SUPER_ADMIN']}>
                    <UserListPage />
                  </RoleRoute>
                }
              />

              {/* Absensi Karyawan: Dapat diakses oleh Super Admin, Admin, Kasir, dan Agent */}
              <Route
                path="/attendance"
                element={
                  <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'KASIR', 'AGENT']}>
                    <AttendancePage />
                  </RoleRoute>
                }
              />

              {/* Jam Operasional & Kedisiplinan: Hanya Super Admin & Admin */}
              <Route
                path="/operational-hours"
                element={
                  <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <OperationalHoursPage />
                  </RoleRoute>
                }
              />

              {/* Manajemen Gaji: Hanya Super Admin & Admin */}
              <Route
                path="/salaries"
                element={
                  <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <SalaryManagementPage />
                  </RoleRoute>
                }
              />

              {/* Kasir POS: Dapat diakses oleh Super Admin, Admin, Kasir, dan Agent */}
              <Route
                path="/pos"
                element={
                  <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'KASIR', 'AGENT']}>
                    <PosPage />
                  </RoleRoute>
                }
              />

              {/* Manajemen Menu: Hanya Super Admin & Admin */}
              <Route
                path="/menu"
                element={
                  <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <MenuManagementPage />
                  </RoleRoute>
                }
              />
              {/* Inventaris & Stok: Dapat diakses dan dikelola oleh Super Admin, Admin, dan Agent */}
              <Route
                path="/inventory"
                element={
                  <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'AGENT']}>
                    <InventoryPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/accounting"
                element={
                  <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <AccountingPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <ReportsPage />
                  </RoleRoute>
                }
              />
            </Route>

            {/* Default fallback */}
            <Route path="/" element={<DefaultRedirect />} />
            <Route path="*" element={<DefaultRedirect />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>

      {/* Global Confirmation Dialog Modal */}
      <ConfirmDialog />

      {/* Toast Notifications Global */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '13px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#f43f5e',
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
