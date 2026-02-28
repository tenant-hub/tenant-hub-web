import api, { setTokens, clearTokens } from './api';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export async function loginApi(credentials: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', credentials);
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function logoutApi(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // logout endpoint yoksa sessizce devam et
  } finally {
    clearTokens();
  }
}
