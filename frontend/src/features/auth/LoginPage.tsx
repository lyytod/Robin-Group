import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, User, Eye, EyeOff, ShieldCheck, Building2, ArrowRight } from 'lucide-react';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { ApiResponse, User as UserType, Business } from '../../types/index';

interface LoginResponseData {
  token: string;
  user: UserType;
  businesses: Business[];
}

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error('Silakan masukkan username Anda');
      return;
    }

    if (!password) {
      toast.error('Silakan masukkan kata sandi Anda');
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', {
        username: username.trim(),
        password,
      });

      if (response.data.success && response.data.data) {
        const { token, user, businesses } = response.data.data;
        login(token, user, businesses);

        toast.success(`Selamat datang kembali, ${user.fullName}!`);
        navigate('/dashboard', { replace: true });
      } else {
        toast.error(response.data.message || 'Login gagal, periksa kembali akun Anda.');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Gagal terhubung ke server backend lokal.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-950 via-surface-900 to-primary-950 p-4 selection:bg-primary-500 selection:text-white">
      {/* Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-accent-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Card Container */}
        <div className="glass-card backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 bg-surface-900/80 text-white">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-primary-600 to-primary-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/25 ring-1 ring-white/20">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Robin Group</h1>
            <p className="text-surface-400 text-sm mt-1">
              Sistem Pembukuan & Kasir Multi-Usaha Offline
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              100% Local-First Network
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-surface-300 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: superadmin"
                  disabled={isLoading}
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-950/60 border border-surface-700/80 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-surface-300 mb-2">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-2.5 bg-surface-950/60 border border-surface-700/80 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-surface-400 hover:text-white transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 active:from-primary-700 active:to-primary-600 text-white font-medium rounded-xl shadow-lg shadow-primary-600/30 flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed group text-sm"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t border-surface-800/80 flex items-center justify-between text-xs text-surface-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary-400" />
              Keamanan Terenkripsi
            </span>
            <span>Versi 1.0 (Offline)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
