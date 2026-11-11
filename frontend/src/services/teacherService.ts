import { api } from './api';
import { fetchAllPages } from '../utils/paginationHelper';
import { ApiResponse, PaginatedResponse, Teacher } from '../types/api.types';

export interface CreateTeacherPayload {
  userId?: string;
  password?: string;
  name: string;
  email: string;
  registration: string;
}

export interface UpdateTeacherPayload {
  name?: string;
  email?: string;
  registration?: string;
}

export const teacherService = {
  async list(page = 1, limit = 10): Promise<PaginatedResponse<Teacher>> {
    const response = await api.get<PaginatedResponse<Teacher>>('/teachers', {
      params: { page, limit },
    });
    return response.data;
  },

  async listAll(): Promise<Teacher[]> {
    return fetchAllPages<Teacher>('/teachers');
  },

  async getById(id: string): Promise<Teacher> {
    const response = await api.get<ApiResponse<Teacher>>(`/teachers/${id}`);
    return response.data.data;
  },

  async create(payload: CreateTeacherPayload): Promise<Teacher> {
    const response = await api.post<ApiResponse<Teacher>>('/teachers', payload);
    return response.data.data;
  },

  async update(id: string, payload: UpdateTeacherPayload): Promise<Teacher> {
    const response = await api.put<ApiResponse<Teacher>>(
      `/teachers/${id}`,
      payload,
    );
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/teachers/${id}`);
  },
};
