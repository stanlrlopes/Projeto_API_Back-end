import { api } from './api';
import { fetchAllPages } from '../utils/paginationHelper';
import {
  ApiResponse,
  ClassEntity,
  PaginatedResponse,
} from '../types/api.types';

export interface CreateClassPayload {
  name: string;
  year: number;
  semester: number;
  teacherId: string;
  subjectId: string;
}

export interface UpdateClassPayload {
  name?: string;
  year?: number;
  semester?: number;
  teacherId?: string;
  subjectId?: string;
}

export const classService = {
  async list(page = 1, limit = 10): Promise<PaginatedResponse<ClassEntity>> {
    const response = await api.get<PaginatedResponse<ClassEntity>>('/classes', {
      params: { page, limit },
    });
    return response.data;
  },

  async listAll(): Promise<ClassEntity[]> {
    return fetchAllPages<ClassEntity>('/classes');
  },

  async getById(id: string): Promise<ClassEntity> {
    const response = await api.get<ApiResponse<ClassEntity>>(`/classes/${id}`);
    return response.data.data;
  },

  async create(payload: CreateClassPayload): Promise<ClassEntity> {
    const response = await api.post<ApiResponse<ClassEntity>>(
      '/classes',
      payload,
    );
    return response.data.data;
  },

  async update(id: string, payload: UpdateClassPayload): Promise<ClassEntity> {
    const response = await api.put<ApiResponse<ClassEntity>>(
      `/classes/${id}`,
      payload,
    );
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/classes/${id}`);
  },
};
