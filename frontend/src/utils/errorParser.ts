import axios from 'axios';
import { ApiErrorPayload } from '../types/api.types';

export interface ParsedError {
  message: string;
  code: string;
  status?: number;
}

export function parseApiError(error: unknown): ParsedError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const apiError = error.response?.data?.error as ApiErrorPayload | undefined;

    if (apiError?.message) {
      return {
        message: apiError.message,
        code: apiError.code || 'API_ERROR',
        status,
      };
    }

    if (error.code === 'ERR_NETWORK') {
      return {
        message: 'Não foi possível conectar ao servidor da EducaAPI (http://localhost:3000).',
        code: 'ERR_NETWORK',
        status: 0,
      };
    }

    return {
      message: error.message || 'Ocorreu um erro na comunicação com a API.',
      code: error.code || 'HTTP_ERROR',
      status,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'CLIENT_ERROR',
    };
  }

  return {
    message: 'Erro inesperado na aplicação.',
    code: 'UNKNOWN_ERROR',
  };
}
