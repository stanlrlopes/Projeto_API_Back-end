import { api } from './api';
import { fetchAllPages } from '../utils/paginationHelper';
import {
  Activity,
  ApiResponse,
  Attendance,
  ClassEntity,
  Content,
  DashboardMetrics,
  Enrollment,
  Grade,
  LowPerformanceStudent,
  StudentAttendanceIndicator,
  StudentAverageIndicator,
  Subject,
} from '../types/api.types';
import { PerformanceBarItem } from '../components/charts/PerformanceBarChart';
import { MIN_PASSING_AVERAGE } from '../utils/formatters';

export interface ActivityWithGradingStatus extends Activity {
  activeStudentsCount: number;
  gradedCount: number;
  pendingCount: number;
}

export interface AdminDashboardData {
  metrics: DashboardMetrics;
  lowPerformance: LowPerformanceStudent[];
  classes: ClassEntity[];
  enrollments: Enrollment[];
  activities: Activity[];
  grades: Grade[];
  attendances: Attendance[];
  contents: Content[];
  presentCount: number;
  absentCount: number;
  studentPerformanceChart: PerformanceBarItem[];
}

export interface TeacherDashboardData {
  classes: ClassEntity[];
  subjects: Subject[];
  enrollments: Enrollment[];
  activeEnrollmentsCount: number;
  uniqueStudentsCount: number;
  activities: ActivityWithGradingStatus[];
  totalPendingGradesCount: number;
  grades: Grade[];
  teacherGeneralAverage: number;
  attendances: Attendance[];
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
  lowPerformanceStudents: LowPerformanceStudent[];
  contents: Content[];
  activityPerformanceChart: PerformanceBarItem[];
}

export interface StudentDashboardData {
  hasStudentLink: boolean;
  average: number;
  attendanceIndicator: StudentAttendanceIndicator;
  classes: ClassEntity[];
  subjects: Subject[];
  enrollments: Enrollment[];
  activities: Activity[];
  pendingActivities: Activity[];
  completedActivitiesCount: number;
  grades: Grade[];
  attendances: Attendance[];
  contents: Content[];
  gradePerformanceChart: PerformanceBarItem[];
}

export const dashboardService = {
  /**
   * Carrega todos os dados reais do Dashboard Institucional (ADMIN)
   */
  async getAdminDashboard(): Promise<AdminDashboardData> {
    const [
      metricsRes,
      lowPerfRes,
      classes,
      enrollments,
      activities,
      grades,
      attendances,
      contents,
    ] = await Promise.all([
      api.get<ApiResponse<DashboardMetrics>>('/indicators/dashboard'),
      api.get<ApiResponse<LowPerformanceStudent[]>>(
        '/indicators/low-performance',
      ),
      fetchAllPages<ClassEntity>('/classes'),
      fetchAllPages<Enrollment>('/enrollments'),
      fetchAllPages<Activity>('/activities'),
      fetchAllPages<Grade>('/grades'),
      fetchAllPages<Attendance>('/attendance'),
      fetchAllPages<Content>('/contents'),
    ]);

    const metrics = metricsRes.data.data;
    const lowPerformance = lowPerfRes.data.data ?? [];

    const presentCount = attendances.filter((a) => a.present).length;
    const absentCount = attendances.length - presentCount;

    // Agrupa notas por aluno para construir o gráfico real de médias por estudante
    const gradesByStudent = new Map<
      string,
      { name: string; total: number; count: number }
    >();

    for (const grade of grades) {
      const studentId = grade.studentId;
      const studentName = grade.student?.name || `Aluno ${studentId.slice(0, 6)}`;
      const current = gradesByStudent.get(studentId) || {
        name: studentName,
        total: 0,
        count: 0,
      };
      current.total += grade.score;
      current.count += 1;
      gradesByStudent.set(studentId, current);
    }

    const studentPerformanceChart: PerformanceBarItem[] = Array.from(
      gradesByStudent.values(),
    ).map((item) => {
      const avg = Number((item.total / item.count).toFixed(2));
      const shortName = item.name.split(' ').slice(0, 2).join(' ');
      return {
        label: shortName,
        score: avg,
        subtitle: `${item.name} (${item.count} aval.)`,
      };
    });

    return {
      metrics,
      lowPerformance,
      classes,
      enrollments,
      activities,
      grades,
      attendances,
      contents,
      presentCount,
      absentCount,
      studentPerformanceChart,
    };
  },

  /**
   * Carrega os dados reais do Dashboard Pedagógico (PROFESSOR),
   * respeitando o isolamento horizontal das turmas do docente.
   */
  async getTeacherDashboard(): Promise<TeacherDashboardData> {
    const [classes, enrollments, activities, grades, attendances, allContents] =
      await Promise.all([
        fetchAllPages<ClassEntity>('/classes'),
        fetchAllPages<Enrollment>('/enrollments'),
        fetchAllPages<Activity>('/activities'),
        fetchAllPages<Grade>('/grades'),
        fetchAllPages<Attendance>('/attendance'),
        fetchAllPages<Content>('/contents'),
      ]);

    // Disciplinas únicas ministradas pelo professor em suas turmas
    const subjectMap = new Map<string, Subject>();
    for (const cls of classes) {
      if (cls.subject && cls.subjectId) {
        subjectMap.set(cls.subjectId, cls.subject);
      }
    }
    const subjects = Array.from(subjectMap.values());

    // Matrículas ativas e alunos únicos nas turmas do professor
    const activeEnrollments = enrollments.filter((e) => e.status === 'ACTIVE');
    const uniqueStudentIds = new Set(activeEnrollments.map((e) => e.studentId));

    // Cálculo real de atividades com lançamentos de notas pendentes
    let totalPendingGradesCount = 0;
    const activitiesWithStatus: ActivityWithGradingStatus[] = activities.map(
      (activity) => {
        const activeInClass = activeEnrollments.filter(
          (e) => e.classId === activity.classId,
        ).length;
        const gradedForActivity = grades.filter(
          (g) => g.activityId === activity.id,
        ).length;
        const pendingCount = Math.max(0, activeInClass - gradedForActivity);
        totalPendingGradesCount += pendingCount;

        return {
          ...activity,
          activeStudentsCount: activeInClass,
          gradedCount: gradedForActivity,
          pendingCount,
        };
      },
    );

    // Média geral real das notas lançadas nas turmas do professor
    const teacherGeneralAverage =
      grades.length === 0
        ? 0
        : Number(
            (
              grades.reduce((acc, curr) => acc + curr.score, 0) / grades.length
            ).toFixed(2),
          );

    // Frequência real nas turmas do professor
    const presentCount = attendances.filter((a) => a.present).length;
    const absentCount = attendances.length - presentCount;
    const attendancePercentage =
      attendances.length === 0
        ? 0
        : Number(((presentCount / attendances.length) * 100).toFixed(2));

    // Alunos em baixo desempenho (< 6.0) exclusivamente nas turmas do professor
    const studentGradesMap = new Map<
      string,
      { studentId: string; name: string; sum: number; count: number }
    >();
    for (const grade of grades) {
      const name =
        grade.student?.name || `Estudante ${grade.studentId.slice(0, 6)}`;
      const entry = studentGradesMap.get(grade.studentId) || {
        studentId: grade.studentId,
        name,
        sum: 0,
        count: 0,
      };
      entry.sum += grade.score;
      entry.count += 1;
      studentGradesMap.set(grade.studentId, entry);
    }

    const lowPerformanceStudents: LowPerformanceStudent[] = Array.from(
      studentGradesMap.values(),
    )
      .map((item) => ({
        studentId: item.studentId,
        name: item.name,
        average: Number((item.sum / item.count).toFixed(2)),
      }))
      .filter((s) => s.average < MIN_PASSING_AVERAGE);

    // Gráfico de desempenho médio por atividade nas turmas do professor
    const activityPerformanceChart: PerformanceBarItem[] = activities.map(
      (act) => {
        const actGrades = grades.filter((g) => g.activityId === act.id);
        const avg =
          actGrades.length === 0
            ? 0
            : Number(
                (
                  actGrades.reduce((sum, g) => sum + g.score, 0) /
                  actGrades.length
                ).toFixed(2),
              );
        return {
          label:
            act.title.length > 16 ? `${act.title.slice(0, 15)}…` : act.title,
          score: avg,
          maxScore: act.maxScore,
          subtitle: `${act.title} (${actGrades.length} nota(s) lançada(s))`,
        };
      },
    );

    // Conteúdos programáticos vinculados às disciplinas do professor
    const teacherSubjectIds = new Set(classes.map((c) => c.subjectId));
    const contents = allContents.filter((c) =>
      teacherSubjectIds.has(c.subjectId),
    );

    return {
      classes,
      subjects,
      enrollments,
      activeEnrollmentsCount: activeEnrollments.length,
      uniqueStudentsCount: uniqueStudentIds.size,
      activities: activitiesWithStatus,
      totalPendingGradesCount,
      grades,
      teacherGeneralAverage,
      attendances,
      presentCount,
      absentCount,
      attendancePercentage,
      lowPerformanceStudents,
      contents,
      activityPerformanceChart,
    };
  },

  /**
   * Carrega os dados reais e isolados do Dashboard do Estudante (ALUNO)
   */
  async getStudentDashboard(
    studentId: string | null,
  ): Promise<StudentDashboardData> {
    if (!studentId) {
      return {
        hasStudentLink: false,
        average: 0,
        attendanceIndicator: {
          studentId: '',
          totalClasses: 0,
          present: 0,
          absent: 0,
          attendancePercentage: 0,
        },
        classes: [],
        subjects: [],
        enrollments: [],
        activities: [],
        pendingActivities: [],
        completedActivitiesCount: 0,
        grades: [],
        attendances: [],
        contents: [],
        gradePerformanceChart: [],
      };
    }

    const [
      avgRes,
      attRes,
      classes,
      enrollments,
      activities,
      grades,
      attendances,
      allContents,
    ] = await Promise.all([
      api.get<ApiResponse<StudentAverageIndicator>>(
        `/indicators/students/${studentId}/average`,
      ),
      api.get<ApiResponse<StudentAttendanceIndicator>>(
        `/indicators/students/${studentId}/attendance`,
      ),
      fetchAllPages<ClassEntity>('/classes'),
      fetchAllPages<Enrollment>('/enrollments'),
      fetchAllPages<Activity>('/activities'),
      fetchAllPages<Grade>('/grades'),
      fetchAllPages<Attendance>('/attendance'),
      fetchAllPages<Content>('/contents'),
    ]);

    const average = avgRes.data.data?.average ?? 0;
    const attendanceIndicator = attRes.data.data ?? {
      studentId,
      totalClasses: 0,
      present: 0,
      absent: 0,
      attendancePercentage: 0,
    };

    // Disciplinas matriculadas (extraídas das turmas ativas e matrículas do aluno)
    const subjectMap = new Map<string, Subject>();
    for (const cls of classes) {
      if (cls.subject && cls.subjectId) {
        subjectMap.set(cls.subjectId, cls.subject);
      }
    }
    for (const enr of enrollments) {
      if (enr.class?.subject && enr.class.subjectId) {
        subjectMap.set(enr.class.subjectId, enr.class.subject);
      }
    }
    const subjects = Array.from(subjectMap.values());

    // Atividades avaliadas vs pendentes de nota para o estudante
    const gradedActivityIds = new Set(grades.map((g) => g.activityId));
    const pendingActivities = activities.filter(
      (a) => !gradedActivityIds.has(a.id),
    );
    const completedActivitiesCount = activities.length - pendingActivities.length;

    // Conteúdos publicados das disciplinas nas quais o aluno está matriculado
    const enrolledSubjectIds = new Set(subjectMap.keys());
    const contents = allContents.filter((c) =>
      enrolledSubjectIds.has(c.subjectId),
    );

    // Gráfico de notas individuais do aluno por atividade
    const gradePerformanceChart: PerformanceBarItem[] = grades.map((g) => {
      const actTitle =
        g.activity?.title || `Atividade ${g.activityId.slice(0, 6)}`;
      return {
        label: actTitle.length > 16 ? `${actTitle.slice(0, 15)}…` : actTitle,
        score: g.score,
        maxScore: g.activity?.maxScore,
        subtitle: actTitle,
      };
    });

    return {
      hasStudentLink: true,
      average,
      attendanceIndicator,
      classes,
      subjects,
      enrollments,
      activities,
      pendingActivities,
      completedActivitiesCount,
      grades,
      attendances,
      contents,
      gradePerformanceChart,
    };
  },
};
