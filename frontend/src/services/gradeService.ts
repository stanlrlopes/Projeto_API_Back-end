import { api } from './api';
import { fetchAllPages } from '../utils/paginationHelper';
import {
  ApiResponse,
  Grade,
  PaginatedResponse,
  StudentAverageIndicator,
} from '../types/api.types';

export interface CreateGradePayload {
  studentId: string;
  activityId: string;
  score: number;
}

export interface UpdateGradePayload {
  score: number;
}

export const gradeService = {
  async list(page = 1, limit = 10): Promise<PaginatedResponse<Grade>> {
    const response = await api.get<PaginatedResponse<Grade>>('/grades', {
      params: { page, limit },
    });
    return response.data;
  },

  async listAll(): Promise<Grade[]> {
    return fetchAllPages<Grade>('/grades');
  },

  async getById(id: string): Promise<Grade> {
    const response = await api.get<ApiResponse<Grade>>(`/grades/${id}`);
    return response.data.data;
  },

  async create(payload: CreateGradePayload): Promise<Grade> {
    const response = await api.post<ApiResponse<Grade>>('/grades', {
      studentId: payload.studentId,
      activityId: payload.activityId,
      score: Number(payload.score),
    });
    return response.data.data;
  },

  async update(id: string, payload: UpdateGradePayload): Promise<Grade> {
    const response = await api.put<ApiResponse<Grade>>(`/grades/${id}`, {
      score: Number(payload.score),
    });
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/grades/${id}`);
  },

  async getStudentAverage(studentId: string): Promise<StudentAverageIndicator> {
    const response = await api.get<ApiResponse<StudentAverageIndicator>>(
      `/indicators/students/${studentId}/average`,
    );
    return response.data.data;
  },
};
