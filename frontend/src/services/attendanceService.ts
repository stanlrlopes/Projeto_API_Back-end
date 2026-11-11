import { api } from './api';
import { fetchAllPages } from '../utils/paginationHelper';
import {
  ApiResponse,
  Attendance,
  PaginatedResponse,
  StudentAttendanceIndicator,
} from '../types/api.types';

export interface CreateAttendancePayload {
  studentId: string;
  classId: string;
  date: string;
  present: boolean;
}

export interface UpdateAttendancePayload {
  present: boolean;
}

export const attendanceService = {
  async list(page = 1, limit = 10): Promise<PaginatedResponse<Attendance>> {
    const response = await api.get<PaginatedResponse<Attendance>>(
      '/attendance',
      {
        params: { page, limit },
      },
    );
    return response.data;
  },

  async listAll(): Promise<Attendance[]> {
    return fetchAllPages<Attendance>('/attendance');
  },

  async getById(id: string): Promise<Attendance> {
    const response = await api.get<ApiResponse<Attendance>>(
      `/attendance/${id}`,
    );
    return response.data.data;
  },

  async create(payload: CreateAttendancePayload): Promise<Attendance> {
    const normalizedDate = payload.date.includes('T')
      ? payload.date
      : `${payload.date}T00:00:00.000Z`;

    const response = await api.post<ApiResponse<Attendance>>('/attendance', {
      studentId: payload.studentId,
      classId: payload.classId,
      date: normalizedDate,
      present: Boolean(payload.present),
    });
    return response.data.data;
  },

  async update(
    id: string,
    payload: UpdateAttendancePayload,
  ): Promise<Attendance> {
    const response = await api.put<ApiResponse<Attendance>>(
      `/attendance/${id}`,
      {
        present: Boolean(payload.present),
      },
    );
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/attendance/${id}`);
  },

  async getStudentAttendance(
    studentId: string,
  ): Promise<StudentAttendanceIndicator> {
    const response = await api.get<ApiResponse<StudentAttendanceIndicator>>(
      `/indicators/students/${studentId}/attendance`,
    );
    return response.data.data;
  },
};
