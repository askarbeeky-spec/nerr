import api from './api';
import { storage } from './storage.service';
import type { ApiResponse, AuthTokens, User } from '../types';

export const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post<ApiResponse<AuthTokens>>('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = data.data;
    await storage.setAccessToken(accessToken);
    if (refreshToken) {
      await storage.setRefreshToken(refreshToken);
    }
    return { accessToken, user };
  },

  async register(email: string, password: string, role = 'employee') {
    const { data } = await api.post<ApiResponse<AuthTokens>>('/auth/register', { email, password, role });
    const { accessToken, refreshToken, user } = data.data;
    await storage.setAccessToken(accessToken);
    if (refreshToken) {
      await storage.setRefreshToken(refreshToken);
    }
    return { accessToken, user };
  },

  async getMe() {
    const { data } = await api.get<ApiResponse<User>>('/auth/me');
    return data.data;
  },

  async logout() {
    try {
      const refreshToken = await storage.getRefreshToken();
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore server errors on logout
    }
    await storage.clearTokens();
  },
};
