export type Role = 'ADMIN' | 'PROFESSOR' | 'ALUNO';

export type EnrollmentStatus = 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'COMPLETED';

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorPayload {
  message: string;
  code: string;
  details?: ApiErrorDetail[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ApiErrorPayload;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
}

export interface Student {
  id: string;
  userId: string;
  name: string;
  email: string;
  birthDate: string;
  registration: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Teacher {
  id: string;
  userId: string;
  name: string;
  email: string;
  registration: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  studentId?: string | null;
  teacherId?: string | null;
  student?: Student | null;
  teacher?: Teacher | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthLoginResponse {
  token: string;
  user: User;
}

export interface Subject {
  id: string;
  name: string;
  description?: string | null;
  workload: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassEntity {
  id: string;
  name: string;
  year: number;
  semester: number;
  teacherId: string;
  subjectId: string;
  teacher?: Teacher;
  subject?: Subject;
  enrollments?: Enrollment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
  status: EnrollmentStatus;
  enrollmentDate?: string;
  student?: Student;
  class?: ClassEntity;
  createdAt?: string;
  updatedAt?: string;
}

export interface Content {
  id: string;
  title: string;
  description?: string | null;
  subjectId: string;
  subject?: Subject;
  activities?: Activity[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Activity {
  id: string;
  title: string;
  description?: string | null;
  contentId: string;
  classId: string;
  dueDate: string;
  maxScore: number;
  content?: Content;
  class?: ClassEntity;
  grades?: Grade[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Grade {
  id: string;
  studentId: string;
  activityId: string;
  score: number;
  evaluationDate?: string;
  student?: Student;
  activity?: Activity;
  createdAt?: string;
  updatedAt?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  present: boolean;
  student?: Student;
  class?: ClassEntity;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentAverageIndicator {
  studentId: string;
  average: number;
}

export interface StudentAttendanceIndicator {
  studentId: string;
  totalClasses: number;
  present: number;
  absent: number;
  attendancePercentage: number;
}

export interface LowPerformanceStudent {
  studentId: string;
  name: string;
  average: number;
}

export interface DashboardMetrics {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  generalAverage: number;
  generalAttendancePercentage: number;
  lowPerformanceCount: number;
}
