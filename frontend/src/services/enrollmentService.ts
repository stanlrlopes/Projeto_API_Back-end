import { api } from './api';
import { fetchAllPages } from '../utils/paginationHelper';
import {
  ApiResponse,
  Enrollment,
  EnrollmentStatus,
  PaginatedResponse,
} from '../types/api.types';

export interface CreateEnrollmentPayload {
  studentId: string;
  classId: string;
  status?: EnrollmentStatus;
}

export interface UpdateEnrollmentPayload {
  status: EnrollmentStatus;
}

export const enrollmentService = {
  async list(page = 1, limit = 10): Promise<PaginatedResponse<Enrollment>> {
    const response = await api.get<PaginatedResponse<Enrollment>>(
      '/enrollments',
      {
        params: { page, limit },
      },
    );
    return response.data;
  },

  async listAll(): Promise<Enrollment[]> {
    return fetchAllPages<Enrollment>('/enrollments');
  },

  async getById(id: string): Promise<Enrollment> {
    const response = await api.get<ApiResponse<Enrollment>>(
      `/enrollments/${id}`,
    );
    return response.data.data;
  },

  async create(payload: CreateEnrollmentPayload): Promise<Enrollment> {
    const response = await api.post<ApiResponse<Enrollment>>(
      '/enrollments',
      payload,
    );
    return response.data.data;
  },

  async update(
    id: string,
    payload: UpdateEnrollmentPayload,
  ): Promise<Enrollment> {
    const response = await api.put<ApiResponse<Enrollment>>(
      `/enrollments/${id}`,
      payload,
    );
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/enrollments/${id}`);
  },
};
