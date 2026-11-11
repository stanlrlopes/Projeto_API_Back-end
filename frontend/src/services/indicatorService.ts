import { api } from './api';
import {
  ApiResponse,
  DashboardMetrics,
  LowPerformanceStudent,
  StudentAttendanceIndicator,
  StudentAverageIndicator,
} from '../types/api.types';

export const indicatorService = {
  /**
   * Indicadores agregados institucionais (Restrito a ADMIN e PROFESSOR no Back-End)
   * GET /api/indicators/dashboard
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await api.get<ApiResponse<DashboardMetrics>>(
      '/indicators/dashboard',
    );
    return response.data.data;
  },

  /**
   * Lista de estudantes com média aritmética inferior a 6.0 (Restrito a ADMIN e PROFESSOR)
   * GET /api/indicators/low-performance
   */
  async getLowPerformanceStudents(): Promise<LowPerformanceStudent[]> {
    const response = await api.get<ApiResponse<LowPerformanceStudent[]>>(
      '/indicators/low-performance',
    );
    return response.data.data ?? [];
  },

  /**
   * Média aritmética individual do estudante (Validado por checkStudentAccess)
   * GET /api/indicators/students/:id/average
   */
  async getStudentAverage(studentId: string): Promise<StudentAverageIndicator> {
    const response = await api.get<ApiResponse<StudentAverageIndicator>>(
      `/indicators/students/${studentId}/average`,
    );
    return response.data.data;
  },

  /**
   * Assiduidade individual do estudante (Validado por checkStudentAccess)
   * GET /api/indicators/students/:id/attendance
   */
  async getStudentAttendance(
    studentId: string,
  ): Promise<StudentAttendanceIndicator> {
    const response = await api.get<ApiResponse<StudentAttendanceIndicator>>(
      `/indicators/students/${studentId}/attendance`,
    );
    return response.data.data;
  },
};
