import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Axios instance dengan base URL mengarah ke backend
const apiClient = axios.create({
  baseURL: '/api', // Akan di-proxy oleh Vite ke http://localhost:4000
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 detik timeout
});

// Request Interceptor: Tambahkan token JWT dan active business_id ke setiap request
apiClient.interceptors.request.use(
  (config) => {
    const store = useAuthStore.getState();
    const token = store.token || localStorage.getItem('robin_group_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (store.activeBusiness?.id) {
      config.headers['x-business-id'] = String(store.activeBusiness.id);
    } else {
      const authStorage = localStorage.getItem('robin_group_auth');
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          if (parsed.state?.activeBusiness?.id) {
            config.headers['x-business-id'] = String(parsed.state.activeBusiness.id);
          }
        } catch {
          // ignore parse error
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Tangani error global (mis: token expired => redirect ke login)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      // Token expired atau tidak valid → bersihkan state dan storage
      useAuthStore.getState().logout();
      localStorage.removeItem('robin_group_token');
      localStorage.removeItem('robin_group_auth');

      // Cegah reload berulang jika sudah berada di halaman login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

