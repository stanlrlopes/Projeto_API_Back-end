import { api } from './api';
import { ApiResponse, AuthLoginResponse, User } from '../types/api.types';
import { LoginFormInput, RegisterApiPayload } from '../schemas';

export const authService = {
  /**
   * Realiza autenticação em POST /api/auth/login
   */
  async login(credentials: LoginFormInput): Promise<AuthLoginResponse> {
    const response = await api.post<ApiResponse<AuthLoginResponse>>(
      '/auth/login',
      credentials,
    );
    return response.data.data;
  },

  /**
   * Realiza cadastro público de ALUNO em POST /api/auth/register
   * Nunca envia o campo `role` no cadastro público.
   */
  async register(payload: RegisterApiPayload): Promise<User> {
    const cleanPayload: RegisterApiPayload = {
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    };
    const response = await api.post<ApiResponse<User>>(
      '/auth/register',
      cleanPayload,
    );
    return response.data.data;
  },

  /**
   * Recupera e valida a sessão atual em GET /api/auth/me
   */
  async me(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  },
};
