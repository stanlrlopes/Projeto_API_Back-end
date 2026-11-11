import axios, { AxiosError } from 'axios';
import { ApiErrorPayload } from '../types/api.types';

export const TOKEN_STORAGE_KEY = '@EducaAPI:token';
export const UNAUTHORIZED_EVENT = 'educaapi:unauthorized';
export const FORBIDDEN_EVENT = 'educaapi:forbidden';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Valida estruturalmente o formato compacto de um JWT (header.payload.signature em Base64URL)
 * para evitar o envio ou armazenamento de valores malformados em localStorage.
 */
export function isValidJwtStructure(token: string | null | undefined): token is string {
  if (!token || typeof token !== 'string') return false;
  return /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token.trim());
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (isValidJwtStructure(token) && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (token) {
    // Remove imediatamente qualquer valor corrompido ou malformado
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ success?: boolean; error?: ApiErrorPayload }>) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    // Segurança de logs: remove o cabeçalho Authorization do objeto de erro antes de propagá-lo,
    // garantindo que o token JWT nunca seja exposto em logs de erro ou ferramentas de inspeção.
    if (error.config?.headers && 'Authorization' in error.config.headers) {
      delete error.config.headers.Authorization;
    }

    // 401 Unauthorized: limpa token e notifica AuthContext (exceto em tentativas explícitas de /auth/login)
    if (status === 401 && !requestUrl.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(
        new CustomEvent(UNAUTHORIZED_EVENT, {
          detail: {
            message:
              error.response?.data?.error?.message ||
              'Sua sessão expirou ou o token é inválido. Faça login novamente.',
          },
        }),
      );
    }

    // 403 Forbidden: preserva sessão autenticada, notificando apenas a restrição de permissão
    if (status === 403) {
      window.dispatchEvent(
        new CustomEvent(FORBIDDEN_EVENT, {
          detail: {
            message:
              error.response?.data?.error?.message ||
              'Acesso negado: seu perfil não possui permissão para executar esta operação.',
          },
        }),
      );
    }

    return Promise.reject(error);
  },
);

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro inesperado ao comunicar com o servidor.',
): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data?.error as ApiErrorPayload | undefined;
    if (apiError?.message) {
      return apiError.message;
    }
    if (error.response?.status === 401) {
      return 'Credenciais inválidas ou sessão expirada.';
    }
    if (error.response?.status === 403) {
      return 'Acesso negado para o seu perfil de usuário.';
    }
    if (error.response?.status === 409) {
      return 'Já existe um registro cadastrado com os dados informados.';
    }
    if (error.code === 'ERR_NETWORK') {
      return 'Não foi possível conectar ao servidor da EducaAPI. Verifique se o Back-End está em execução.';
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
}
