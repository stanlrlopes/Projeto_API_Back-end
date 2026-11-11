import { api } from './api';
import { fetchAllPages } from '../utils/paginationHelper';
import {
  Activity,
  ApiResponse,
  PaginatedResponse,
} from '../types/api.types';

export interface CreateActivityPayload {
  title: string;
  description?: string;
  contentId: string;
  classId: string;
  dueDate: string;
  maxScore: number;
}

export interface UpdateActivityPayload {
  title?: string;
  description?: string;
  contentId?: string;
  classId?: string;
  dueDate?: string;
  maxScore?: number;
}

export const activityService = {
  async list(page = 1, limit = 10): Promise<PaginatedResponse<Activity>> {
    const response = await api.get<PaginatedResponse<Activity>>('/activities', {
      params: { page, limit },
    });
    return response.data;
  },

  async listAll(): Promise<Activity[]> {
    return fetchAllPages<Activity>('/activities');
  },

  async getById(id: string): Promise<Activity> {
    const response = await api.get<ApiResponse<Activity>>(`/activities/${id}`);
    return response.data.data;
  },

  async create(payload: CreateActivityPayload): Promise<Activity> {
    const normalizedPayload: CreateActivityPayload = {
      ...payload,
      dueDate: payload.dueDate.includes('T')
        ? payload.dueDate
        : new Date(payload.dueDate).toISOString(),
    };
    const response = await api.post<ApiResponse<Activity>>(
      '/activities',
      normalizedPayload,
    );
    return response.data.data;
  },

  async update(id: string, payload: UpdateActivityPayload): Promise<Activity> {
    const normalizedPayload: UpdateActivityPayload = {
      ...payload,
      ...(payload.dueDate
        ? {
            dueDate: payload.dueDate.includes('T')
              ? payload.dueDate
              : new Date(payload.dueDate).toISOString(),
          }
        : {}),
    };
    const response = await api.put<ApiResponse<Activity>>(
      `/activities/${id}`,
      normalizedPayload,
    );
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/activities/${id}`);
  },
};
