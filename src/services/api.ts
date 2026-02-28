import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: her isteğe accessToken ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: 401 gelirse refresh token ile yenile
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        setTokens(data.accessToken, data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function getAccessToken() {
  return localStorage.getItem('accessToken');
}

export default api;
