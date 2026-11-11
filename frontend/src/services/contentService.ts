import { api } from './api';
import { fetchAllPages } from '../utils/paginationHelper';
import {
  ApiResponse,
  Content,
  PaginatedResponse,
} from '../types/api.types';

export interface CreateContentPayload {
  title: string;
  description?: string;
  subjectId: string;
}

export interface UpdateContentPayload {
  title?: string;
  description?: string;
  subjectId?: string;
}

export const contentService = {
  async list(page = 1, limit = 10): Promise<PaginatedResponse<Content>> {
    const response = await api.get<PaginatedResponse<Content>>('/contents', {
      params: { page, limit },
    });
    return response.data;
  },

  async listAll(): Promise<Content[]> {
    return fetchAllPages<Content>('/contents');
  },

  async getById(id: string): Promise<Content> {
    const response = await api.get<ApiResponse<Content>>(`/contents/${id}`);
    return response.data.data;
  },

  async create(payload: CreateContentPayload): Promise<Content> {
    const response = await api.post<ApiResponse<Content>>('/contents', payload);
    return response.data.data;
  },

  async update(id: string, payload: UpdateContentPayload): Promise<Content> {
    const response = await api.put<ApiResponse<Content>>(
      `/contents/${id}`,
      payload,
    );
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/contents/${id}`);
  },
};
