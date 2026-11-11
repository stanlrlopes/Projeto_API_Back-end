import { api } from './api';
import { fetchAllPages } from '../utils/paginationHelper';
import {
  ApiResponse,
  PaginatedResponse,
  Student,
  StudentAttendanceIndicator,
  StudentAverageIndicator,
} from '../types/api.types';

export interface CreateStudentPayload {
  userId?: string;
  password?: string;
  name: string;
  email: string;
  birthDate: string;
  registration: string;
}

export interface UpdateStudentPayload {
  name?: string;
  email?: string;
  birthDate?: string;
  registration?: string;
}

export const studentService = {
  async list(page = 1, limit = 10): Promise<PaginatedResponse<Student>> {
    const response = await api.get<PaginatedResponse<Student>>('/students', {
      params: { page, limit },
    });
    return response.data;
  },

  async listAll(): Promise<Student[]> {
    return fetchAllPages<Student>('/students');
  },

  async getById(id: string): Promise<Student> {
    const response = await api.get<ApiResponse<Student>>(`/students/${id}`);
    return response.data.data;
  },

  async create(payload: CreateStudentPayload): Promise<Student> {
    const normalizedPayload: CreateStudentPayload = {
      ...payload,
      birthDate: payload.birthDate.includes('T')
        ? payload.birthDate
        : new Date(payload.birthDate).toISOString(),
    };
    const response = await api.post<ApiResponse<Student>>(
      '/students',
      normalizedPayload,
    );
    return response.data.data;
  },

  async update(id: string, payload: UpdateStudentPayload): Promise<Student> {
    const normalizedPayload: UpdateStudentPayload = {
      ...payload,
      ...(payload.birthDate
        ? {
            birthDate: payload.birthDate.includes('T')
              ? payload.birthDate
              : new Date(payload.birthDate).toISOString(),
          }
        : {}),
    };
    const response = await api.put<ApiResponse<Student>>(
      `/students/${id}`,
      normalizedPayload,
    );
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/students/${id}`);
  },

  async getAverage(id: string): Promise<StudentAverageIndicator> {
    const response = await api.get<ApiResponse<StudentAverageIndicator>>(
      `/indicators/students/${id}/average`,
    );
    return response.data.data;
  },

  async getAttendance(id: string): Promise<StudentAttendanceIndicator> {
    const response = await api.get<ApiResponse<StudentAttendanceIndicator>>(
      `/indicators/students/${id}/attendance`,
    );
    return response.data.data;
  },
};
