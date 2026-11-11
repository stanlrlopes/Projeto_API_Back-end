import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  GraduationCap,
  Users,
  School,
  BookOpen,
  ClipboardList,
  Award,
  CalendarCheck,
  AlertTriangle,
  Info,
  Filter,
  Search,
  CheckCircle2,
  TrendingUp,
  Layers,
  Calculator,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { indicatorService } from '../../services/indicatorService';
import { classService } from '../../services/classService';
import { subjectService } from '../../services/subjectService';
import { enrollmentService } from '../../services/enrollmentService';
import { activityService } from '../../services/activityService';
import { gradeService } from '../../services/gradeService';
import { attendanceService } from '../../services/attendanceService';
import { studentService } from '../../services/studentService';
import {
  Card,
  Badge,
  Button,
  Input,
  Label,
  Alert,
  Spinner,
  EmptyState,
} from '../../components/ui';
import {
  PerformanceBarChart,
  PerformanceBarItem,
} from '../../components/charts/PerformanceBarChart';
import { AttendanceDonutChart } from '../../components/charts/AttendanceDonutChart';

const MIN_PASSING_AVERAGE = 6.0;

/**
 * Formata média com segurança contra NaN / Infinity
 */
function formatAverage(
  value: number | null | undefined,
  hasRecords = true,
): string {
  if (
    !hasRecords ||
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return 'Sem lançamentos';
  }
  return value.toFixed(2);
}

/**
 * Formata percentual com segurança contra NaN / Infinity
 */
function formatPercentageSafe(
  value: number | null | undefined,
  hasRecords = true,
): string {
  if (
    !hasRecords ||
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return 'Sem registros (0,00%)';
  }
  return `${value.toFixed(2)}%`;
}

/**
 * Calcula média aritmética segura (mesma fórmula do IndicatorService no Back-End)
 */
function computeSafeAverage(scores: number[]): number {
  if (!scores || scores.length === 0) return 0;
  const total = scores.reduce((acc, curr) => acc + curr, 0);
  const avg = total / scores.length;
  return Number.isFinite(avg) ? Number(avg.toFixed(2)) : 0;
}

/**
 * Calcula percentual de presença seguro (mesma fórmula do IndicatorService no Back-End)
 */
function computeSafeAttendancePercentage(
  present: number,
  total: number,
): number {
  if (!total || total <= 0) return 0;
  const pct = (present / total) * 100;
  return Number.isFinite(pct) ? Number(pct.toFixed(2)) : 0;
}

export const IndicatorsPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role ?? 'ALUNO';
  const isAdmin = role === 'ADMIN';
  const isTeacher = role === 'PROFESSOR';
  const isStudent = role === 'ALUNO';
  const loggedStudentId = user?.studentId ?? '';

  // Filtros analíticos
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [inspectedStudentId, setInspectedStudentId] = useState<string>('');

  // 1. Indicadores Globais Oficiais do Back-End (Restrito ao ADMIN para garantir que PROFESSOR veja apenas suas turmas)
  const dashboardMetricsQuery = useQuery({
    queryKey: ['indicators', 'dashboard', 'admin'],
    queryFn: () => indicatorService.getDashboardMetrics(),
    enabled: isAdmin,
  });

  const lowPerformanceQuery = useQuery({
    queryKey: ['indicators', 'low-performance', 'admin'],
    queryFn: () => indicatorService.getLowPerformanceStudents(),
    enabled: isAdmin,
  });

  // 2. Indicadores Individuais Oficiais do Back-End para o ALUNO logado (ou estudante inspecionado por ADMIN/PROFESSOR)
  const targetStudentIdForApi = isStudent ? loggedStudentId : inspectedStudentId;

  const studentAverageQuery = useQuery({
    queryKey: ['indicators', 'student-average', targetStudentIdForApi],
    queryFn: () => indicatorService.getStudentAverage(targetStudentIdForApi),
    enabled: Boolean(targetStudentIdForApi),
  });

  const studentAttendanceQuery = useQuery({
    queryKey: ['indicators', 'student-attendance', targetStudentIdForApi],
    queryFn: () => indicatorService.getStudentAttendance(targetStudentIdForApi),
    enabled: Boolean(targetStudentIdForApi),
  });

  // 3. Dados estruturados e já isolados por RBAC no Back-End para recortes por Turma, Disciplina, Período e Atividade
  const classesQuery = useQuery({
    queryKey: ['classes', 'indicators-scope', role, user?.id],
    queryFn: () => classService.listAll(),
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects', 'indicators-scope'],
    queryFn: () => subjectService.listAll(),
  });

  const enrollmentsQuery = useQuery({
    queryKey: ['enrollments', 'indicators-scope', role, user?.id],
    queryFn: () => enrollmentService.listAll(),
  });

  const activitiesQuery = useQuery({
    queryKey: ['activities', 'indicators-scope', role, user?.id],
    queryFn: () => activityService.listAll(),
  });

  const gradesQuery = useQuery({
    queryKey: ['grades', 'indicators-scope', role, user?.id],
    queryFn: () => gradeService.listAll(),
  });

  const attendanceQuery = useQuery({
    queryKey: ['attendance', 'indicators-scope', role, user?.id],
    queryFn: () => attendanceService.listAll(),
  });

  const studentsQuery = useQuery({
    queryKey: ['students', 'indicators-scope', role, user?.id],
    queryFn: () => studentService.listAll(),
    enabled: isAdmin || isTeacher,
  });

  const isLoading =
    classesQuery.isLoading ||
    subjectsQuery.isLoading ||
    enrollmentsQuery.isLoading ||
    activitiesQuery.isLoading ||
    gradesQuery.isLoading ||
    attendanceQuery.isLoading ||
    (isAdmin &&
      (dashboardMetricsQuery.isLoading || lowPerformanceQuery.isLoading)) ||
    (isStudent &&
      (studentAverageQuery.isLoading || studentAttendanceQuery.isLoading));

  const classes = useMemo(
    () => classesQuery.data ?? [],
    [classesQuery.data],
  );
  const subjects = useMemo(
    () => subjectsQuery.data ?? [],
    [subjectsQuery.data],
  );
  const enrollments = useMemo(
    () => enrollmentsQuery.data ?? [],
    [enrollmentsQuery.data],
  );
  const activities = useMemo(
    () => activitiesQuery.data ?? [],
    [activitiesQuery.data],
  );
  const grades = useMemo(() => gradesQuery.data ?? [], [gradesQuery.data]);
  const attendances = useMemo(
    () => attendanceQuery.data ?? [],
    [attendanceQuery.data],
  );
  const students = useMemo(
    () => studentsQuery.data ?? [],
    [studentsQuery.data],
  );

  // Lista de períodos (ano/semestre) existentes nas turmas acessíveis
  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((cls) => {
      if (cls.year && cls.semester) {
        set.add(`${cls.year}/${cls.semester}`);
      }
    });
    return Array.from(set).sort().reverse();
  }, [classes]);

  // Disciplinas acessíveis ao perfil (Para PROFESSOR e ALUNO, apenas disciplinas vinculadas às turmas acessíveis)
  const accessibleSubjects = useMemo(() => {
    if (isAdmin) return subjects;
    const subjectIdsInClasses = new Set(classes.map((c) => c.subjectId));
    return subjects.filter((s) => subjectIdsInClasses.has(s.id));
  }, [isAdmin, subjects, classes]);

  // Turmas filtradas por Período, Disciplina e Turma
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const periodKey = `${cls.year}/${cls.semester}`;
      if (selectedPeriod && periodKey !== selectedPeriod) return false;
      if (selectedSubjectId && cls.subjectId !== selectedSubjectId) return false;
      if (selectedClassId && cls.id !== selectedClassId) return false;
      return true;
    });
  }, [classes, selectedPeriod, selectedSubjectId, selectedClassId]);

  const filteredClassIds = useMemo(
    () => new Set(filteredClasses.map((c) => c.id)),
    [filteredClasses],
  );

  // Mapa rápido de turmas, disciplinas, atividades e estudantes
  const classMap = useMemo(() => {
    const map = new Map<string, (typeof classes)[number]>();
    classes.forEach((c) => map.set(c.id, c));
    return map;
  }, [classes]);

  const subjectMap = useMemo(() => {
    const map = new Map<string, (typeof subjects)[number]>();
    subjects.forEach((s) => map.set(s.id, s));
    return map;
  }, [subjects]);

  const activityMap = useMemo(() => {
    const map = new Map<string, (typeof activities)[number]>();
    activities.forEach((a) => map.set(a.id, a));
    return map;
  }, [activities]);

  const studentMap = useMemo(() => {
    const map = new Map<string, (typeof students)[number]>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  // Recortes filtrados pelas turmas/períodos/disciplinas selecionadas
  const filteredEnrollments = useMemo(
    () => enrollments.filter((e) => filteredClassIds.has(e.classId)),
    [enrollments, filteredClassIds],
  );

  const activeFilteredEnrollments = useMemo(
    () => filteredEnrollments.filter((e) => e.status === 'ACTIVE'),
    [filteredEnrollments],
  );

  const filteredActivities = useMemo(
    () => activities.filter((a) => filteredClassIds.has(a.classId)),
    [activities, filteredClassIds],
  );

  const filteredGrades = useMemo(() => {
    return grades.filter((g) => {
      const act = activityMap.get(g.activityId);
      const classId = act?.classId ?? g.activity?.classId;
      if (!classId) {
        return !selectedPeriod && !selectedSubjectId && !selectedClassId;
      }
      return filteredClassIds.has(classId);
    });
  }, [
    grades,
    activityMap,
    filteredClassIds,
    selectedPeriod,
    selectedSubjectId,
    selectedClassId,
  ]);

  const filteredAttendances = useMemo(
    () => attendances.filter((att) => filteredClassIds.has(att.classId)),
    [attendances, filteredClassIds],
  );

  // Rótulo claro do período em exibição
  const currentPeriodLabel = useMemo(() => {
    if (selectedPeriod) return `Semestre Letivo ${selectedPeriod}`;
    if (availablePeriods.length === 1) {
      return `Semestre Letivo ${availablePeriods[0]}`;
    }
    if (availablePeriods.length > 1) {
      return `Todos os períodos (${availablePeriods[availablePeriods.length - 1]} a ${availablePeriods[0]})`;
    }
    return 'Período atual (Sem turmas cadastradas)';
  }, [selectedPeriod, availablePeriods]);

  // Cálculos do recorte filtrado (usando exatamente as fórmulas do IndicatorService)
  const scopedAverage = useMemo(
    () => computeSafeAverage(filteredGrades.map((g) => g.score)),
    [filteredGrades],
  );

  const scopedPresentCount = useMemo(
    () => filteredAttendances.filter((a) => a.present).length,
    [filteredAttendances],
  );

  const scopedAbsentCount = useMemo(
    () => filteredAttendances.filter((a) => !a.present).length,
    [filteredAttendances],
  );

  const scopedAttendancePercentage = useMemo(
    () =>
      computeSafeAttendancePercentage(
        scopedPresentCount,
        filteredAttendances.length,
      ),
    [scopedPresentCount, filteredAttendances.length],
  );

  // Distribuição de Notas por Faixa (0–3.9, 4.0–5.9, 6.0–7.9, 8.0–10.0)
  const gradeDistributionData = useMemo(() => {
    const bands = [
      { label: '0,0 a 3,9 (Crítico)', min: 0, max: 3.999, count: 0 },
      { label: '4,0 a 5,9 (< 6,0)', min: 4.0, max: 5.999, count: 0 },
      { label: '6,0 a 7,9 (Regular)', min: 6.0, max: 7.999, count: 0 },
      { label: '8,0 a 10+ (Elevado)', min: 8.0, max: Infinity, count: 0 },
    ];
    filteredGrades.forEach((g) => {
      for (const b of bands) {
        if (g.score >= b.min && g.score <= b.max) {
          b.count += 1;
          break;
        }
      }
    });
    const total = filteredGrades.length;
    return bands.map((b) => ({
      label: b.label,
      count: b.count,
      percentage: total > 0 ? Number(((b.count / total) * 100).toFixed(1)) : 0,
    }));
  }, [filteredGrades]);

  // Indicadores Consolidados por Turma e Disciplina
  const classIndicatorsBreakdown = useMemo(() => {
    return filteredClasses.map((cls) => {
      const subjectName =
        cls.subject?.name ??
        subjectMap.get(cls.subjectId)?.name ??
        'Disciplina vinculada';
      const classEnrollments = enrollments.filter(
        (e) => e.classId === cls.id && e.status === 'ACTIVE',
      );
      const classActivities = activities.filter((a) => a.classId === cls.id);
      const classActivityIds = new Set(classActivities.map((a) => a.id));
      const classGrades = grades.filter((g) =>
        classActivityIds.has(g.activityId),
      );
      const classAttendances = attendances.filter((a) => a.classId === cls.id);
      const presentCount = classAttendances.filter((a) => a.present).length;
      const absentCount = classAttendances.length - presentCount;

      return {
        classId: cls.id,
        className: cls.name,
        subjectId: cls.subjectId,
        subjectName,
        period: `${cls.year}/${cls.semester}`,
        activeEnrollmentsCount: classEnrollments.length,
        activitiesCount: classActivities.length,
        gradesCount: classGrades.length,
        averageScore: computeSafeAverage(classGrades.map((g) => g.score)),
        totalAttendanceRecords: classAttendances.length,
        presentCount,
        absentCount,
        attendancePercentage: computeSafeAttendancePercentage(
          presentCount,
          classAttendances.length,
        ),
      };
    });
  }, [filteredClasses, subjectMap, enrollments, activities, grades, attendances]);

  // Indicadores Consolidados por Disciplina
  const subjectIndicatorsBreakdown = useMemo(() => {
    const grouped = new Map<
      string,
      {
        subjectId: string;
        subjectName: string;
        classesCount: number;
        scores: number[];
        present: number;
        totalAttendance: number;
      }
    >();

    filteredClasses.forEach((cls) => {
      const subjectId = cls.subjectId;
      const subjectName =
        cls.subject?.name ??
        subjectMap.get(subjectId)?.name ??
        'Disciplina vinculada';
      if (!grouped.has(subjectId)) {
        grouped.set(subjectId, {
          subjectId,
          subjectName,
          classesCount: 0,
          scores: [],
          present: 0,
          totalAttendance: 0,
        });
      }
      const entry = grouped.get(subjectId)!;
      entry.classesCount += 1;

      const classActivityIds = new Set(
        activities.filter((a) => a.classId === cls.id).map((a) => a.id),
      );
      grades
        .filter((g) => classActivityIds.has(g.activityId))
        .forEach((g) => entry.scores.push(g.score));

      const classAttendances = attendances.filter((a) => a.classId === cls.id);
      entry.totalAttendance += classAttendances.length;
      entry.present += classAttendances.filter((a) => a.present).length;
    });

    return Array.from(grouped.values()).map((item) => ({
      subjectId: item.subjectId,
      subjectName: item.subjectName,
      classesCount: item.classesCount,
      gradesCount: item.scores.length,
      averageScore: computeSafeAverage(item.scores),
      totalAttendance: item.totalAttendance,
      attendancePercentage: computeSafeAttendancePercentage(
        item.present,
        item.totalAttendance,
      ),
    }));
  }, [filteredClasses, subjectMap, activities, grades, attendances]);

  // Média por Atividade (Especialmente relevante para PROFESSOR e ADMIN)
  const activityIndicatorsBreakdown = useMemo(() => {
    return filteredActivities.map((act) => {
      const cls = classMap.get(act.classId);
      const subjectName =
        cls?.subject?.name ??
        (cls ? subjectMap.get(cls.subjectId)?.name : undefined) ??
        'Disciplina';
      const actGrades = grades.filter((g) => g.activityId === act.id);
      const scores = actGrades.map((g) => g.score);
      const belowMinCount = scores.filter((s) => s < MIN_PASSING_AVERAGE).length;

      return {
        activityId: act.id,
        title: act.title,
        maxScore: act.maxScore,
        dueDate: act.dueDate,
        className: cls?.name ?? act.class?.name ?? 'Turma',
        period: cls ? `${cls.year}/${cls.semester}` : 'N/A',
        subjectName,
        gradesCount: actGrades.length,
        averageScore: computeSafeAverage(scores),
        belowMinCount,
      };
    });
  }, [filteredActivities, classMap, subjectMap, grades]);

  // Análise de Desempenho e Assiduidade por Estudante no Escopo Acessível (ADMIN ou PROFESSOR)
  const scopedStudentSummaries = useMemo(() => {
    if (isStudent) return [];

    const studentIdsInScope = new Set<string>();
    filteredEnrollments.forEach((e) => studentIdsInScope.add(e.studentId));
    filteredGrades.forEach((g) => studentIdsInScope.add(g.studentId));
    filteredAttendances.forEach((a) => studentIdsInScope.add(a.studentId));

    const summaries = Array.from(studentIdsInScope).map((studentId) => {
      const studentObj = studentMap.get(studentId);
      const enrollmentWithStudent = filteredEnrollments.find(
        (e) => e.studentId === studentId && e.student,
      );
      const gradeWithStudent = filteredGrades.find(
        (g) => g.studentId === studentId && g.student,
      );
      const attWithStudent = filteredAttendances.find(
        (a) => a.studentId === studentId && a.student,
      );

      const name =
        studentObj?.name ??
        enrollmentWithStudent?.student?.name ??
        gradeWithStudent?.student?.name ??
        attWithStudent?.student?.name ??
        `Estudante #${studentId.slice(0, 8)}`;

      const registration =
        studentObj?.registration ??
        enrollmentWithStudent?.student?.registration ??
        gradeWithStudent?.student?.registration ??
        attWithStudent?.student?.registration ??
        '—';

      const stGrades = filteredGrades.filter((g) => g.studentId === studentId);
      const stAttendances = filteredAttendances.filter(
        (a) => a.studentId === studentId,
      );
      const presentCount = stAttendances.filter((a) => a.present).length;
      const absentCount = stAttendances.length - presentCount;

      const average = computeSafeAverage(stGrades.map((g) => g.score));
      const attendancePct = computeSafeAttendancePercentage(
        presentCount,
        stAttendances.length,
      );

      const enrolledClassesNames = Array.from(
        new Set(
          filteredEnrollments
            .filter((e) => e.studentId === studentId)
            .map((e) => classMap.get(e.classId)?.name ?? e.class?.name ?? 'Turma'),
        ),
      );

      const isLowPerformance =
        stGrades.length > 0 && average < MIN_PASSING_AVERAGE;
      const hasAbsences = absentCount > 0;

      return {
        studentId,
        name,
        registration,
        enrolledClassesNames,
        gradesCount: stGrades.length,
        average,
        totalClasses: stAttendances.length,
        presentCount,
        absentCount,
        attendancePct,
        isLowPerformance,
        hasAbsences,
        needsFollowUp: isLowPerformance || hasAbsences,
      };
    });

    return summaries
      .filter((s) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          s.name.toLowerCase().includes(term) ||
          s.registration.toLowerCase().includes(term) ||
          s.enrolledClassesNames.some((c) => c.toLowerCase().includes(term))
        );
      })
      .sort((a, b) => {
        if (a.isLowPerformance !== b.isLowPerformance) {
          return a.isLowPerformance ? -1 : 1;
        }
        return a.average - b.average;
      });
  }, [
    isStudent,
    filteredEnrollments,
    filteredGrades,
    filteredAttendances,
    studentMap,
    classMap,
    searchTerm,
  ]);

  // Para ALUNO: Evolução de Notas no Tempo
  const studentGradeEvolutionChartData: PerformanceBarItem[] = useMemo(() => {
    if (!isStudent) return [];
    const sorted = [...filteredGrades].sort((a, b) => {
      const dateA = a.evaluationDate ? new Date(a.evaluationDate).getTime() : 0;
      const dateB = b.evaluationDate ? new Date(b.evaluationDate).getTime() : 0;
      return dateA - dateB;
    });

    return sorted.map((g, idx) => {
      const act = activityMap.get(g.activityId);
      const title = act?.title ?? g.activity?.title ?? `Avaliação ${idx + 1}`;
      const shortTitle = title.length > 18 ? `${title.slice(0, 18)}…` : title;
      return {
        label: shortTitle,
        score: g.score,
        maxScore: act?.maxScore ?? g.activity?.maxScore ?? 10,
        subtitle: title,
      };
    });
  }, [isStudent, filteredGrades, activityMap]);

  // Dados para o Gráfico de Barras principal
  const mainBarChartItems: PerformanceBarItem[] = useMemo(() => {
    if (isStudent) {
      return subjectIndicatorsBreakdown
        .filter((s) => s.gradesCount > 0)
        .map((s) => ({
          label:
            s.subjectName.length > 18
              ? `${s.subjectName.slice(0, 18)}…`
              : s.subjectName,
          score: s.averageScore,
          subtitle: s.subjectName,
        }));
    }

    if (isTeacher) {
      return activityIndicatorsBreakdown
        .filter((a) => a.gradesCount > 0)
        .slice(0, 10)
        .map((a) => ({
          label: a.title.length > 18 ? `${a.title.slice(0, 18)}…` : a.title,
          score: a.averageScore,
          subtitle: `${a.title} (${a.className})`,
        }));
    }

    // ADMIN: Média por Turma
    return classIndicatorsBreakdown
      .filter((c) => c.gradesCount > 0)
      .map((c) => ({
        label:
          c.className.length > 18 ? `${c.className.slice(0, 18)}…` : c.className,
        score: c.averageScore,
        subtitle: `${c.className} — ${c.subjectName}`,
      }));
  }, [
    isStudent,
    isTeacher,
    subjectIndicatorsBreakdown,
    activityIndicatorsBreakdown,
    classIndicatorsBreakdown,
  ]);

  const inspectedStudentRecord = useMemo(() => {
    if (!inspectedStudentId) return undefined;
    return (
      studentMap.get(inspectedStudentId) ??
      scopedStudentSummaries.find((s) => s.studentId === inspectedStudentId)
    );
  }, [inspectedStudentId, studentMap, scopedStudentSummaries]);

  const handleClearFilters = () => {
    setSelectedPeriod('');
    setSelectedSubjectId('');
    setSelectedClassId('');
    setSearchTerm('');
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500">
          Calculando indicadores educacionais e sincronizando séries acadêmicas...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com Diferenciação Explícita de Escopo */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge
              variant={isAdmin ? 'primary' : isTeacher ? 'info' : 'success'}
            >
              {isAdmin && 'ESCOPO INSTITUCIONAL — ADMIN'}
              {isTeacher && 'ESCOPO PEDAGÓGICO — PROFESSOR'}
              {isStudent && 'ESCOPO INDIVIDUAL — ALUNO'}
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
              {currentPeriodLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              <Calculator className="w-3.5 h-3.5 text-emerald-600" />
              Média Mínima de Referência: {MIN_PASSING_AVERAGE.toFixed(1)}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-[#2563EB]" />
            {isAdmin && 'Indicadores Educacionais Institucionais (ODS 4)'}
            {isTeacher && 'Indicadores de Gestão Pedagógica das Minhas Turmas'}
            {isStudent && 'Meus Indicadores Acadêmicos e Evolução Individual'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {isAdmin &&
              'Monitoramento consolidado do corpo discente, docente, turmas, matrículas ativas, distribuição de notas e assiduidade escolar.'}
            {isTeacher &&
              'Análise pedagógica restrita às suas turmas alocadas: médias por disciplina e atividade, assiduidade e identificação de estudantes para acompanhamento.'}
            {isStudent &&
              'Acompanhamento individual da sua média geral e por disciplina, evolução cronológica nas avaliações e histórico de assiduidade.'}
          </p>
        </div>
      </div>

      {/* Nota Metodológica Obrigatória (Transparência Estatística e Governança ODS 4) */}
      <Alert
        variant="info"
        title="Nota Metodológica e Escopo dos Indicadores (Alinhamento Interno ao ODS 4)"
      >
        Os indicadores apresentados neste painel são{' '}
        <strong>métricas acadêmicas internas da instituição</strong> (calculadas
        a partir dos lançamentos reais de matrículas, notas e chamadas no
        EducaAPI) inspiradas nas diretrizes de monitoramento de qualidade
        educacional do ODS 4.{' '}
        <strong>Não constituem estatísticas oficiais da ONU/UNESCO/INEP.</strong>{' '}
        Critério interno de desempenho: média aritmética mínima de aprovação
        igual a <strong>6,0</strong> (<code>MIN_PASSING_AVERAGE = 6.0</code>). O
        percentual de frequência reflete a proporção de presenças registradas
        sobre o total de chamadas lançadas (sem presunção de corte automático de
        reprovação por frequência de 75%).
      </Alert>

      {/* Barra de Filtros Analíticos (Período, Disciplina, Turma e Busca) */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Filtros de Recorte Analítico (Período, Disciplina e Turma)
            </h2>
          </div>
          {(selectedPeriod ||
            selectedSubjectId ||
            selectedClassId ||
            searchTerm) && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Limpar Filtros
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="filter-period">Período Letivo (Ano/Semestre)</Label>
            <select
              id="filter-period"
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setSelectedClassId('');
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            >
              <option value="">Todos os períodos registrados</option>
              {availablePeriods.map((p) => (
                <option key={p} value={p}>
                  Semestre {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="filter-subject">Disciplina</Label>
            <select
              id="filter-subject"
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedClassId('');
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            >
              <option value="">Todas as disciplinas do escopo</option>
              {accessibleSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="filter-class">Turma</Label>
            <select
              id="filter-class"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            >
              <option value="">Todas as turmas do recorte</option>
              {classes
                .filter((cls) => {
                  const periodKey = `${cls.year}/${cls.semester}`;
                  if (selectedPeriod && periodKey !== selectedPeriod)
                    return false;
                  if (selectedSubjectId && cls.subjectId !== selectedSubjectId)
                    return false;
                  return true;
                })
                .map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.year}/{cls.semester})
                  </option>
                ))}
            </select>
          </div>

          {!isStudent ? (
            <div>
              <Label htmlFor="filter-search">Buscar Estudante ou Turma</Label>
              <Input
                id="filter-search"
                placeholder="Nome, matrícula ou turma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
          ) : (
            <div className="flex flex-col justify-end">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <span className="font-semibold text-slate-800 block">
                  Isolamento Individual Ativo
                </span>
                Exibindo exclusivamente os seus dados acadêmicos.
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* =====================================================================
          VISÃO 1: ADMIN — GESTÃO INSTITUCIONAL
         ===================================================================== */}
      {isAdmin && (
        <div className="space-y-6">
          {/* Cards de Totais Institucionais e Indicadores Globais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card className="p-4 border-l-4 border-l-[#2563EB]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Total de Alunos
                </span>
                <GraduationCap className="w-5 h-5 text-[#2563EB]" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {dashboardMetricsQuery.data?.totalStudents ?? students.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Base: Cadastros no banco • Matrículas ativas no recorte:{' '}
                <strong className="text-slate-700">
                  {activeFilteredEnrollments.length}
                </strong>
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-indigo-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Professores & Disciplinas
                </span>
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {dashboardMetricsQuery.data?.totalTeachers ?? 0} doc. /{' '}
                {dashboardMetricsQuery.data?.totalSubjects ?? subjects.length}{' '}
                disc.
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Base: Quadro docente e catálogo curricular ativo
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-sky-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Turmas & Matrículas Ativas
                </span>
                <School className="w-5 h-5 text-sky-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {filteredClasses.length} turmas /{' '}
                {activeFilteredEnrollments.length} matr.
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Base: {currentPeriodLabel} (Status = ACTIVE)
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-emerald-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Média Geral de Desempenho
                </span>
                <Award className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {selectedPeriod || selectedSubjectId || selectedClassId
                  ? formatAverage(scopedAverage, filteredGrades.length > 0)
                  : formatAverage(
                      dashboardMetricsQuery.data?.generalAverage,
                      grades.length > 0,
                    )}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Fórmula: ∑ notas ÷ {filteredGrades.length} avaliações lançadas
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-teal-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Percentual de Frequência
                </span>
                <CalendarCheck className="w-5 h-5 text-teal-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {selectedPeriod || selectedSubjectId || selectedClassId
                  ? formatPercentageSafe(
                      scopedAttendancePercentage,
                      filteredAttendances.length > 0,
                    )
                  : formatPercentageSafe(
                      dashboardMetricsQuery.data?.generalAttendancePercentage,
                      attendances.length > 0,
                    )}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Fórmula: ({scopedPresentCount} presenças ÷{' '}
                {filteredAttendances.length} chamadas) × 100
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Média Abaixo de 6,0
                </span>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-700 mt-2">
                {selectedPeriod || selectedSubjectId || selectedClassId
                  ? scopedStudentSummaries.filter((s) => s.isLowPerformance)
                      .length
                  : (lowPerformanceQuery.data?.length ?? 0)}{' '}
                aluno(s)
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Critério: Estudantes avaliados com média &lt; 6,0
              </p>
            </Card>
          </div>

          {/* Gráficos Institucionais: Média por Turma + Assiduidade */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-5 lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Média de Desempenho por Turma
                  </h3>
                  <p className="text-xs text-slate-500">
                    Período: {currentPeriodLabel} • Base: Média aritmética das
                    notas lançadas em cada turma (Referência = 6,0)
                  </p>
                </div>
                <Badge variant="info">
                  {classIndicatorsBreakdown.length} turma(s)
                </Badge>
              </div>
              <PerformanceBarChart
                items={mainBarChartItems}
                valueLabel="Média da Turma"
                emptyTitle="Nenhuma nota lançada nas turmas do recorte"
                emptyDescription="Não há avaliações registradas para calcular a média por turma neste filtro."
              />
            </Card>

            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900">
                  Proporção Institucional de Assiduidade
                </h3>
                <p className="text-xs text-slate-500">
                  Período: {currentPeriodLabel} • Base:{' '}
                  {filteredAttendances.length} registros de chamada
                </p>
              </div>
              <AttendanceDonutChart
                present={scopedPresentCount}
                absent={scopedAbsentCount}
                attendancePercentage={scopedAttendancePercentage}
              />
            </Card>
          </div>

          {/* Distribuição de Notas por Faixas e Estudantes com Média < 6,0 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Distribuição de Notas por Faixa de Desempenho
                  </h3>
                  <p className="text-xs text-slate-500">
                    Período: {currentPeriodLabel} • Base:{' '}
                    {filteredGrades.length} notas individuais lançadas
                  </p>
                </div>
                <Badge variant="neutral">{filteredGrades.length} notas</Badge>
              </div>

              {filteredGrades.length === 0 ? (
                <EmptyState
                  title="Sem notas lançadas no período"
                  description="Não há avaliações corrigidas para calcular a distribuição por faixas."
                />
              ) : (
                <div className="space-y-4">
                  {gradeDistributionData.map((band) => (
                    <div
                      key={band.label}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1.5">
                        <span>{band.label}</span>
                        <span>
                          {band.count} lançamento(s) (
                          {band.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            band.label.includes('Crítico')
                              ? 'bg-red-500'
                              : band.label.includes('< 6,0')
                                ? 'bg-amber-500'
                                : band.label.includes('Regular')
                                  ? 'bg-[#2563EB]'
                                  : 'bg-emerald-600'
                          }`}
                          style={{ width: `${Math.min(100, band.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Estudantes com Média Abaixo de 6,0 (Atenção Acadêmica)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Endpoint oficial:{' '}
                    <code>GET /api/indicators/low-performance</code> • Critério:
                    Média aritmética &lt; 6,0
                  </p>
                </div>
                <Badge variant="warning">
                  {(lowPerformanceQuery.data ?? []).length} estudante(s)
                </Badge>
              </div>

              {(lowPerformanceQuery.data ?? []).length === 0 ? (
                <div className="p-6 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-emerald-900">
                    Nenhum estudante com média global inferior a 6,0
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Todos os estudantes avaliados encontram-se com média igual
                    ou superior ao patamar mínimo de 6,0.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500">
                        <th className="py-2.5 px-3">Estudante</th>
                        <th className="py-2.5 px-3">Matrícula</th>
                        <th className="py-2.5 px-3 text-center">Média Geral</th>
                        <th className="py-2.5 px-3 text-right">Inspeção</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {(lowPerformanceQuery.data ?? []).map((st) => {
                        const studentObj = studentMap.get(st.studentId);
                        return (
                          <tr key={st.studentId} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {st.name}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-xs text-slate-600">
                              {studentObj?.registration ?? '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge variant="danger">
                                {st.average.toFixed(2)}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setInspectedStudentId(st.studentId)
                                }
                              >
                                Consultar API Individual
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Tabela de Indicadores Consolidados por Turma e Disciplina */}
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Indicadores Detalhados por Turma e Disciplina
                </h3>
                <p className="text-xs text-slate-500">
                  Período: {currentPeriodLabel} • Base de cálculo: Matrículas
                  ativas, média aritmética das avaliações e proporção de
                  presença por turma
                </p>
              </div>
              <Badge variant="primary">
                {classIndicatorsBreakdown.length} turma(s) no recorte
              </Badge>
            </div>

            {classIndicatorsBreakdown.length === 0 ? (
              <EmptyState
                title="Nenhuma turma encontrada para os filtros selecionados"
                description="Ajuste os filtros de período, disciplina ou turma para visualizar os indicadores consolidados."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500 bg-slate-50">
                      <th className="py-3 px-3">Turma</th>
                      <th className="py-3 px-3">Disciplina</th>
                      <th className="py-3 px-3 text-center">Período</th>
                      <th className="py-3 px-3 text-center">
                        Matrículas Ativas
                      </th>
                      <th className="py-3 px-3 text-center">
                        Atividades / Notas
                      </th>
                      <th className="py-3 px-3 text-center">Média da Turma</th>
                      <th className="py-3 px-3 text-center">
                        Presenças / Chamadas
                      </th>
                      <th className="py-3 px-3 text-center">% Frequência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {classIndicatorsBreakdown.map((item) => (
                      <tr key={item.classId} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {item.className}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {item.subjectName}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-xs text-slate-600">
                          {item.period}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-slate-800">
                          {item.activeEnrollmentsCount}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600">
                          {item.activitiesCount} ativ. / {item.gradesCount} notas
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.gradesCount === 0 ? (
                            <span className="text-xs text-slate-400">
                              Sem lançamentos
                            </span>
                          ) : (
                            <Badge
                              variant={
                                item.averageScore >= MIN_PASSING_AVERAGE
                                  ? 'success'
                                  : 'warning'
                              }
                            >
                              {item.averageScore.toFixed(2)}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600">
                          {item.presentCount} / {item.totalAttendanceRecords} (
                          {item.absentCount} faltas)
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-800">
                          {formatPercentageSafe(
                            item.attendancePercentage,
                            item.totalAttendanceRecords > 0,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Resumo por Disciplina */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Indicadores Consolidados por Disciplina Curricular
                </h3>
                <p className="text-xs text-slate-500">
                  Período: {currentPeriodLabel} • Agregação das turmas
                  vinculadas a cada disciplina
                </p>
              </div>
              <Badge variant="neutral">
                {subjectIndicatorsBreakdown.length} disciplina(s)
              </Badge>
            </div>

            {subjectIndicatorsBreakdown.length === 0 ? (
              <EmptyState
                title="Sem disciplinas no recorte"
                description="Nenhuma turma vinculada a disciplinas no período selecionado."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectIndicatorsBreakdown.map((sub) => (
                  <div
                    key={sub.subjectId}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#2563EB]" />
                        {sub.subjectName}
                      </span>
                      <Badge variant="neutral">
                        {sub.classesCount} turma(s)
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-xs">
                      <div>
                        <span className="text-slate-500 block">
                          Média Aritmética:
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {formatAverage(
                            sub.averageScore,
                            sub.gradesCount > 0,
                          )}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          ({sub.gradesCount} notas)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">
                          Assiduidade:
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {formatPercentageSafe(
                            sub.attendancePercentage,
                            sub.totalAttendance > 0,
                          )}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          ({sub.totalAttendance} chamadas)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* =====================================================================
          VISÃO 2: PROFESSOR — GESTÃO PEDAGÓGICA (ESTRITAMENTE SUAS TURMAS)
         ===================================================================== */}
      {isTeacher && (
        <div className="space-y-6">
          {/* KPIs Pedagógicos das Próprias Turmas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-4 border-l-4 border-l-[#2563EB]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Minhas Turmas no Recorte
                </span>
                <School className="w-5 h-5 text-[#2563EB]" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {filteredClasses.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Período: {currentPeriodLabel}
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-indigo-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Matrículas Ativas
                </span>
                <ClipboardList className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {activeFilteredEnrollments.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Base: Estudantes ativos nas minhas turmas
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-emerald-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Média das Minhas Turmas
                </span>
                <Award className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatAverage(scopedAverage, filteredGrades.length > 0)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Fórmula: ∑ notas ÷ {filteredGrades.length} avaliações lançadas
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-teal-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Frequência das Turmas
                </span>
                <CalendarCheck className="w-5 h-5 text-teal-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatPercentageSafe(
                  scopedAttendancePercentage,
                  filteredAttendances.length > 0,
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Fórmula: ({scopedPresentCount} presenças ÷{' '}
                {filteredAttendances.length} chamadas) × 100
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Acompanhamento Pedagógico
                </span>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-700 mt-2">
                {scopedStudentSummaries.filter((s) => s.needsFollowUp).length}{' '}
                aluno(s)
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Critério: Média &lt; 6,0 ou faltas registradas na turma
              </p>
            </Card>
          </div>

          {/* Gráficos Pedagógicos: Média por Atividade + Assiduidade das Turmas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-5 lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Média de Desempenho por Atividade Avaliativa
                  </h3>
                  <p className="text-xs text-slate-500">
                    Período: {currentPeriodLabel} • Base: Notas lançadas nas
                    atividades das suas turmas (Referência = 6,0)
                  </p>
                </div>
                <Badge variant="info">
                  {activityIndicatorsBreakdown.length} atividade(s)
                </Badge>
              </div>
              <PerformanceBarChart
                items={mainBarChartItems}
                valueLabel="Média da Atividade"
                emptyTitle="Sem atividades avaliadas no recorte"
                emptyDescription="Nenhuma atividade com notas lançadas nas suas turmas para este filtro."
              />
            </Card>

            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900">
                  Assiduidade Consolidada das Minhas Turmas
                </h3>
                <p className="text-xs text-slate-500">
                  Período: {currentPeriodLabel} • Base:{' '}
                  {filteredAttendances.length} registros de chamada
                </p>
              </div>
              <AttendanceDonutChart
                present={scopedPresentCount}
                absent={scopedAbsentCount}
                attendancePercentage={scopedAttendancePercentage}
              />
            </Card>
          </div>

          {/* Desempenho por Disciplina e por Atividade */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Média por Disciplina Lecionada e Turma
                  </h3>
                  <p className="text-xs text-slate-500">
                    Período: {currentPeriodLabel} • Desempenho consolidado das
                    turmas sob sua regência
                  </p>
                </div>
              </div>

              {classIndicatorsBreakdown.length === 0 ? (
                <EmptyState
                  title="Nenhuma turma alocada no recorte"
                  description="Não foram encontradas turmas sob sua responsabilidade com os filtros atuais."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500 bg-slate-50">
                        <th className="py-2.5 px-3">Turma / Período</th>
                        <th className="py-2.5 px-3">Disciplina</th>
                        <th className="py-2.5 px-3 text-center">Média</th>
                        <th className="py-2.5 px-3 text-center">% Presença</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {classIndicatorsBreakdown.map((cls) => (
                        <tr key={cls.classId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {cls.className}{' '}
                            <span className="text-xs font-normal text-slate-500">
                              ({cls.period})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {cls.subjectName}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {cls.gradesCount === 0 ? (
                              <span className="text-xs text-slate-400">
                                Sem notas
                              </span>
                            ) : (
                              <Badge
                                variant={
                                  cls.averageScore >= MIN_PASSING_AVERAGE
                                    ? 'success'
                                    : 'warning'
                                }
                              >
                                {cls.averageScore.toFixed(2)}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium text-slate-800">
                            {formatPercentageSafe(
                              cls.attendancePercentage,
                              cls.totalAttendanceRecords > 0,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Desempenho Detalhado por Atividade Avaliativa
                  </h3>
                  <p className="text-xs text-slate-500">
                    Base: Média das notas lançadas por atividade e contagem de
                    notas abaixo de 6,0
                  </p>
                </div>
              </div>

              {activityIndicatorsBreakdown.length === 0 ? (
                <EmptyState
                  title="Sem atividades cadastradas"
                  description="Nenhuma atividade avaliativa registrada para as turmas filtradas."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500 bg-slate-50">
                        <th className="py-2.5 px-3">Atividade</th>
                        <th className="py-2.5 px-3">Turma</th>
                        <th className="py-2.5 px-3 text-center">Lançamentos</th>
                        <th className="py-2.5 px-3 text-center">Média</th>
                        <th className="py-2.5 px-3 text-center">
                          Notas &lt; 6,0
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {activityIndicatorsBreakdown.map((act) => (
                        <tr key={act.activityId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {act.title}
                            <span className="block text-[11px] text-slate-500">
                              {act.subjectName} • Valor máx:{' '}
                              {act.maxScore.toFixed(1)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-600">
                            {act.className} ({act.period})
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-700">
                            {act.gradesCount}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {act.gradesCount === 0 ? (
                              <span className="text-xs text-slate-400">
                                Sem notas
                              </span>
                            ) : (
                              <Badge
                                variant={
                                  act.averageScore >= MIN_PASSING_AVERAGE
                                    ? 'success'
                                    : 'warning'
                                }
                              >
                                {act.averageScore.toFixed(2)}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {act.belowMinCount > 0 ? (
                              <Badge variant="danger">
                                {act.belowMinCount} aluno(s)
                              </Badge>
                            ) : (
                              <span className="text-xs text-emerald-700 font-medium">
                                0
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* =====================================================================
          SEÇÃO COMPARTILHADA (ADMIN & PROFESSOR):
          ACOMPANHAMENTO DE ESTUDANTES + INSPETOR INDIVIDUAL VIA API OFICIAL
         ===================================================================== */}
      {(isAdmin || isTeacher) && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isTeacher
                    ? 'Identificação de Estudantes para Acompanhamento Pedagógico (Minhas Turmas)'
                    : 'Panorama de Desempenho e Assiduidade por Estudante no Escopo'}
                </h3>
                <p className="text-xs text-slate-500">
                  Período: {currentPeriodLabel} • Estudantes ordenados por
                  prioridade de atenção acadêmica (média &lt; 6,0 em destaque)
                </p>
              </div>
              <Badge variant="primary">
                {scopedStudentSummaries.length} estudante(s) listado(s)
              </Badge>
            </div>

            {scopedStudentSummaries.length === 0 ? (
              <EmptyState
                title="Nenhum estudante encontrado no recorte"
                description="Não há matrículas, notas ou chamadas que correspondam aos filtros selecionados."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500 bg-slate-50">
                      <th className="py-3 px-3">Estudante</th>
                      <th className="py-3 px-3">Turmas no Recorte</th>
                      <th className="py-3 px-3 text-center">Avaliações</th>
                      <th className="py-3 px-3 text-center">
                        Média no Recorte
                      </th>
                      <th className="py-3 px-3 text-center">
                        Presenças / Chamadas
                      </th>
                      <th className="py-3 px-3 text-center">% Frequência</th>
                      <th className="py-3 px-3 text-center">
                        Status Pedagógico
                      </th>
                      <th className="py-3 px-3 text-right">
                        Indicador Oficial API
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {scopedStudentSummaries.map((st) => (
                      <tr key={st.studentId} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-900 block">
                            {st.name}
                          </span>
                          <span className="font-mono text-xs text-slate-500">
                            Matrícula: {st.registration}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-700">
                          {st.enrolledClassesNames.length > 0
                            ? st.enrolledClassesNames.join(', ')
                            : '—'}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-700">
                          {st.gradesCount}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {st.gradesCount === 0 ? (
                            <span className="text-xs text-slate-400">
                              Sem notas
                            </span>
                          ) : (
                            <Badge
                              variant={
                                st.average >= MIN_PASSING_AVERAGE
                                  ? 'success'
                                  : 'danger'
                              }
                            >
                              {st.average.toFixed(2)}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-700">
                          {st.presentCount} / {st.totalClasses} (
                          {st.absentCount} faltas)
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-800">
                          {formatPercentageSafe(
                            st.attendancePct,
                            st.totalClasses > 0,
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {st.isLowPerformance ? (
                            <Badge variant="danger">
                              Acompanhamento (Média &lt; 6,0)
                            </Badge>
                          ) : st.hasAbsences ? (
                            <Badge variant="warning">
                              Monitorar Assiduidade ({st.absentCount} falta(s))
                            </Badge>
                          ) : st.gradesCount === 0 && st.totalClasses === 0 ? (
                            <Badge variant="neutral">Sem lançamentos</Badge>
                          ) : (
                            <Badge variant="success">Desempenho Regular</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            variant={
                              inspectedStudentId === st.studentId
                                ? 'primary'
                                : 'outline'
                            }
                            size="sm"
                            onClick={() =>
                              setInspectedStudentId(
                                inspectedStudentId === st.studentId
                                  ? ''
                                  : st.studentId,
                              )
                            }
                          >
                            {inspectedStudentId === st.studentId
                              ? 'Ocultar'
                              : 'Ver Indicador Global'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Painel de Inspeção Individual via Endpoints Oficiais (/students/:id/average e /attendance) */}
          {inspectedStudentId && (
            <Card className="p-5 border-2 border-[#2563EB]/30 bg-blue-50/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#2563EB]" />
                    Consulta Consolidada Individual no Back-End (
                    <code>/api/indicators/students/:id/*</code>)
                  </h3>
                  <p className="text-xs text-slate-600">
                    Retorno direto do <code>IndicatorService</code> validado
                    pelo <code>checkStudentAccess</code> para o estudante
                    selecionado.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInspectedStudentId('')}
                >
                  Fechar Inspeção
                </Button>
              </div>

              {studentAverageQuery.isLoading ||
              studentAttendanceQuery.isLoading ? (
                <div className="py-6 flex items-center justify-center gap-2">
                  <Spinner size="sm" />
                  <span className="text-xs text-slate-600">
                    Consultando endpoints individuais de indicadores...
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <span className="text-xs font-semibold uppercase text-slate-500">
                      Identificação do Estudante
                    </span>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {inspectedStudentRecord?.name ?? 'Estudante'}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      ID: {inspectedStudentId}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <span className="text-xs font-semibold uppercase text-slate-500">
                      Média Global Oficial (GET /average)
                    </span>
                    <p className="text-2xl font-bold text-[#2563EB] mt-1">
                      {studentAverageQuery.data
                        ? formatAverage(studentAverageQuery.data.average, true)
                        : '—'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Fórmula: Média aritmética global de todas as avaliações do
                      estudante
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <span className="text-xs font-semibold uppercase text-slate-500">
                      Assiduidade Oficial (GET /attendance)
                    </span>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                      {studentAttendanceQuery.data
                        ? formatPercentageSafe(
                            studentAttendanceQuery.data.attendancePercentage,
                            studentAttendanceQuery.data.totalClasses > 0,
                          )
                        : '—'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Presenças:{' '}
                      <strong>
                        {studentAttendanceQuery.data?.present ?? 0}
                      </strong>{' '}
                      • Faltas:{' '}
                      <strong>
                        {studentAttendanceQuery.data?.absent ?? 0}
                      </strong>{' '}
                      • Total:{' '}
                      <strong>
                        {studentAttendanceQuery.data?.totalClasses ?? 0}
                      </strong>
                    </p>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* =====================================================================
          VISÃO 3: ALUNO — ACOMPANHAMENTO INDIVIDUAL
         ===================================================================== */}
      {isStudent && (
        <div className="space-y-6">
          {/* Cards Individuais do Estudante */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-l-4 border-l-[#2563EB]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Minha Média Geral Oficial
                </span>
                <Award className="w-5 h-5 text-[#2563EB]" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {selectedPeriod || selectedSubjectId || selectedClassId
                  ? formatAverage(scopedAverage, filteredGrades.length > 0)
                  : formatAverage(
                      studentAverageQuery.data?.average,
                      grades.length > 0,
                    )}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Fórmula: ∑ notas ÷ {filteredGrades.length} avaliações • Meta ≥
                6,0
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-emerald-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Meu Percentual de Frequência
                </span>
                <CalendarCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {selectedPeriod || selectedSubjectId || selectedClassId
                  ? formatPercentageSafe(
                      scopedAttendancePercentage,
                      filteredAttendances.length > 0,
                    )
                  : formatPercentageSafe(
                      studentAttendanceQuery.data?.attendancePercentage,
                      (studentAttendanceQuery.data?.totalClasses ?? 0) > 0,
                    )}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Base:{' '}
                {selectedPeriod || selectedSubjectId || selectedClassId
                  ? `${scopedPresentCount} presenças e ${scopedAbsentCount} faltas (${filteredAttendances.length} chamadas)`
                  : `${studentAttendanceQuery.data?.present ?? 0} presenças e ${studentAttendanceQuery.data?.absent ?? 0} faltas (${studentAttendanceQuery.data?.totalClasses ?? 0} chamadas)`}
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-indigo-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Disciplinas & Turmas no Recorte
                </span>
                <Layers className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {subjectIndicatorsBreakdown.length} disc. /{' '}
                {filteredClasses.length} turmas
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Período: {currentPeriodLabel}
              </p>
            </Card>

            <Card className="p-4 border-l-4 border-l-sky-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Situação de Desempenho
                </span>
                <TrendingUp className="w-5 h-5 text-sky-600" />
              </div>
              <div className="mt-2">
                {filteredGrades.length === 0 ? (
                  <Badge variant="neutral">Sem avaliações lançadas</Badge>
                ) : scopedAverage >= MIN_PASSING_AVERAGE ? (
                  <Badge variant="success">
                    Acima da Média de Referência (≥ 6,0)
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    Abaixo da Média de Referência (&lt; 6,0)
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {filteredGrades.length} nota(s) lançada(s) de{' '}
                {filteredActivities.length} atividade(s)
              </p>
            </Card>
          </div>

          {/* Gráficos do Estudante: Evolução das Notas + Assiduidade */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-5 lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Evolução Cronológica das Minhas Notas por Avaliação
                  </h3>
                  <p className="text-xs text-slate-500">
                    Período: {currentPeriodLabel} • Notas ordenadas pela data de
                    avaliação comparadas à referência 6,0
                  </p>
                </div>
                <Badge variant="primary">
                  {studentGradeEvolutionChartData.length} avaliação(ões)
                </Badge>
              </div>
              <PerformanceBarChart
                items={studentGradeEvolutionChartData}
                valueLabel="Minha Nota"
                emptyTitle="Sem notas lançadas no período"
                emptyDescription="Você ainda não possui notas lançadas nas atividades deste período."
              />
            </Card>

            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900">
                  Minha Assiduidade no Período
                </h3>
                <p className="text-xs text-slate-500">
                  Período: {currentPeriodLabel} • Proporção entre presenças e
                  faltas registradas
                </p>
              </div>
              <AttendanceDonutChart
                present={scopedPresentCount}
                absent={scopedAbsentCount}
                attendancePercentage={scopedAttendancePercentage}
              />
            </Card>
          </div>

          {/* Média por Disciplina e Histórico de Desempenho */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Minha Média e Assiduidade por Disciplina
                  </h3>
                  <p className="text-xs text-slate-500">
                    Período: {currentPeriodLabel} • Consolidação por componente
                    curricular
                  </p>
                </div>
              </div>

              {subjectIndicatorsBreakdown.length === 0 ? (
                <EmptyState
                  title="Nenhuma disciplina vinculada"
                  description="Você não possui matrículas registradas para os filtros selecionados."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500 bg-slate-50">
                        <th className="py-2.5 px-3">Disciplina</th>
                        <th className="py-2.5 px-3 text-center">Notas</th>
                        <th className="py-2.5 px-3 text-center">Minha Média</th>
                        <th className="py-2.5 px-3 text-center">% Presença</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {subjectIndicatorsBreakdown.map((sub) => (
                        <tr key={sub.subjectId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {sub.subjectName}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600">
                            {sub.gradesCount}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {sub.gradesCount === 0 ? (
                              <span className="text-xs text-slate-400">
                                Sem notas
                              </span>
                            ) : (
                              <Badge
                                variant={
                                  sub.averageScore >= MIN_PASSING_AVERAGE
                                    ? 'success'
                                    : 'warning'
                                }
                              >
                                {sub.averageScore.toFixed(2)}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium text-slate-800">
                            {formatPercentageSafe(
                              sub.attendancePercentage,
                              sub.totalAttendance > 0,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Histórico Individual de Desempenho por Avaliação
                  </h3>
                  <p className="text-xs text-slate-500">
                    Detalhamento cronológico das avaliações corrigidas
                  </p>
                </div>
              </div>

              {filteredGrades.length === 0 ? (
                <EmptyState
                  title="Sem histórico de notas"
                  description="Nenhuma nota foi registrada para suas atividades até o momento."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500 bg-slate-50">
                        <th className="py-2.5 px-3">Avaliação / Disciplina</th>
                        <th className="py-2.5 px-3 text-center">Data</th>
                        <th className="py-2.5 px-3 text-center">Nota Obtida</th>
                        <th className="py-2.5 px-3 text-center">Referência</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredGrades.map((g) => {
                        const act = activityMap.get(g.activityId);
                        const cls = act
                          ? classMap.get(act.classId)
                          : undefined;
                        const subName =
                          cls?.subject?.name ??
                          (cls
                            ? subjectMap.get(cls.subjectId)?.name
                            : undefined) ??
                          'Disciplina';
                        return (
                          <tr key={g.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-900 block">
                                {act?.title ?? g.activity?.title ?? 'Avaliação'}
                              </span>
                              <span className="text-xs text-slate-500">
                                {subName} •{' '}
                                {cls
                                  ? `${cls.name} (${cls.year}/${cls.semester})`
                                  : ''}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center text-xs text-slate-600">
                              {g.evaluationDate
                                ? new Date(g.evaluationDate).toLocaleDateString(
                                    'pt-BR',
                                  )
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge
                                variant={
                                  g.score >= MIN_PASSING_AVERAGE
                                    ? 'success'
                                    : 'warning'
                                }
                              >
                                {g.score.toFixed(2)}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-center text-xs text-slate-600">
                              {g.score >= MIN_PASSING_AVERAGE
                                ? '≥ 6,0 (Satisfatório)'
                                : '< 6,0 (Atenção)'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Rodapé Técnico de Fórmulas e Base de Cálculo */}
      <Card className="p-4 bg-slate-50 border border-slate-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">
              Especificação Técnica das Fórmulas Utilizadas (Conformidade com{' '}
              <code>IndicatorService</code>):
            </p>
            <p>
              •{' '}
              <strong>
                Média de Desempenho (Geral / Turma / Disciplina / Estudante):
              </strong>{' '}
              <code>
                grades.length === 0 ? 0 : Number((∑ score /
                grades.length).toFixed(2))
              </code>{' '}
              — Média aritmética simples das notas lançadas. Quando não há notas
              registradas, exibe <em>&quot;Sem lançamentos&quot;</em> (evitando
              divisão por zero).
            </p>
            <p>
              •{' '}
              <strong>
                Critério de Baixo Desempenho (Atenção Acadêmica):
              </strong>{' '}
              <code>grades.length &gt; 0 &amp;&amp; average &lt; 6.0</code> (
              <code>MIN_PASSING_AVERAGE = 6.0</code>).
            </p>
            <p>
              • <strong>Percentual de Frequência (Assiduidade):</strong>{' '}
              <code>
                totalClasses === 0 ? 0 : Number(((present / totalClasses) *
                100).toFixed(2))
              </code>{' '}
              — Proporção de presenças sobre o total de chamadas lançadas (sem
              presunção de limiar reprovatório de 75%).
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
