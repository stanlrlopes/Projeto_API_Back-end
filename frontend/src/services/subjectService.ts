import { api } from './api';
import { fetchAllPages } from '../utils/paginationHelper';
import { ApiResponse, PaginatedResponse, Subject } from '../types/api.types';

export interface CreateSubjectPayload {
  name: string;
  description?: string;
  workload: number;
}

export interface UpdateSubjectPayload {
  name?: string;
  description?: string;
  workload?: number;
}

export const subjectService = {
  async list(page = 1, limit = 10): Promise<PaginatedResponse<Subject>> {
    const response = await api.get<PaginatedResponse<Subject>>('/subjects', {
      params: { page, limit },
    });
    return response.data;
  },

  async listAll(): Promise<Subject[]> {
    return fetchAllPages<Subject>('/subjects');
  },

  async getById(id: string): Promise<Subject> {
    const response = await api.get<ApiResponse<Subject>>(`/subjects/${id}`);
    return response.data.data;
  },

  async create(payload: CreateSubjectPayload): Promise<Subject> {
    const response = await api.post<ApiResponse<Subject>>('/subjects', payload);
    return response.data.data;
  },

  async update(id: string, payload: UpdateSubjectPayload): Promise<Subject> {
    const response = await api.put<ApiResponse<Subject>>(
      `/subjects/${id}`,
      payload,
    );
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/subjects/${id}`);
  },
};
