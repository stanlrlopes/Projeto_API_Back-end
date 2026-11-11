import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';
import { AppLayout } from '../layouts/AppLayout';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { StudentsPage } from '../pages/students/StudentsPage';
import { TeachersPage } from '../pages/teachers/TeachersPage';
import { SubjectsPage } from '../pages/subjects/SubjectsPage';
import { ClassesPage } from '../pages/classes/ClassesPage';
import { EnrollmentsPage } from '../pages/enrollments/EnrollmentsPage';
import { ContentsPage } from '../pages/contents/ContentsPage';
import { ActivitiesPage } from '../pages/activities/ActivitiesPage';
import { GradesPage } from '../pages/grades/GradesPage';
import { AttendancePage } from '../pages/attendance/AttendancePage';
import { IndicatorsPage } from '../pages/indicators/IndicatorsPage';
import { SystemStatusPage } from '../pages/SystemStatusPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AdminGovernancePage } from '../pages/AdminGovernancePage';
import { DesignSystemPage } from '../pages/DesignSystemPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Rotas Protegidas (Requerem Autenticação JWT) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Módulos da Fase 3.3.2 (Alunos, Professores e Disciplinas) */}
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/teachers" element={<TeachersPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />

          {/* Módulos da Fase 3.3.3 (Turmas e Matrículas) */}
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/enrollments" element={<EnrollmentsPage />} />

          {/* Módulos da Fase 3.3.4 (Conteúdos e Atividades) */}
          <Route path="/contents" element={<ContentsPage />} />
          <Route path="/activities" element={<ActivitiesPage />} />

          {/* Módulo da Fase 3.3.5 (Notas e Boletim) */}
          <Route path="/grades" element={<GradesPage />} />

          {/* Módulo da Fase 3.3.6 (Frequência Escolar) */}
          <Route path="/attendance" element={<AttendancePage />} />

          {/* Módulo da Fase 3.3.7 (Indicadores ODS 4) */}
          <Route path="/indicators" element={<IndicatorsPage />} />

          {/* Páginas Institucionais e de Governança */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/design-system" element={<DesignSystemPage />} />
          <Route path="/system-status" element={<SystemStatusPage />} />

          {/* Rota Restrita a ADMIN (Protegida por RoleGuard) */}
          <Route
            path="/admin-governance"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AdminGovernancePage />
              </RoleGuard>
            }
          />
        </Route>
      </Route>

      {/* Fallback Global */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
