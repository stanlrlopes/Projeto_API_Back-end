import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Award,
  Plus,
  Eye,
  Pencil,
  Trash2,
  GraduationCap,
  School,
  BookOpen,
  ClipboardCheck,
  RefreshCw,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
} from 'lucide-react';
import { gradeService } from '../../services/gradeService';
import { activityService } from '../../services/activityService';
import { classService } from '../../services/classService';
import { enrollmentService } from '../../services/enrollmentService';
import { studentService } from '../../services/studentService';
import { subjectService } from '../../services/subjectService';
import { getApiErrorMessage } from '../../services/api';
import {
  createGradeFormSchema,
  updateGradeFormSchema,
  CreateGradeFormInput,
  UpdateGradeFormInput,
} from '../../schemas';
import {
  Activity,
  ClassEntity,
  Grade,
  Student,
} from '../../types/api.types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import {
  formatDate,
  formatDecimal,
  MIN_PASSING_AVERAGE,
} from '../../utils/formatters';
import {
  Card,
  Badge,
  Button,
  Input,
  Label,
  Alert,
  Modal,
  StatCard,
  LoadingState,
  EmptyState,
  ErrorState,
  SearchInput,
  Pagination,
  ConfirmDialog,
} from '../../components/ui';

type ViewMode = 'GRADES_LIST' | 'REPORT_CARD';
type PerformanceFilter = 'ALL' | 'PASSING' | 'LOW';
type SortOption =
  | 'recent'
  | 'score-desc'
  | 'score-asc'
  | 'student-asc'
  | 'activity-asc';

interface EnrichedGrade extends Grade {
  studentName: string;
  studentRegistration: string;
  studentEmail: string;
  activityTitle: string;
  activityDueDate?: string;
  maxScore: number;
  classId: string;
  className: string;
  classPeriod: string;
  subjectId: string;
  subjectName: string;
  teacherName: string;
}

interface StudentAcademicSummary {
  studentId: string;
  name: string;
  registration: string;
  email: string;
  gradesCount: number;
  pendingActivitiesCount: number;
  average: number;
  activeClassesCount: number;
}

export const GradesPage: React.FC = () => {
  const { role, studentId: loggedStudentId, user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const canWrite = role === 'ADMIN' || role === 'PROFESSOR';

  // ALUNO inicia diretamente na visão de Boletim Escolar; ADMIN/PROFESSOR iniciam na Gestão de Notas
  const [viewMode, setViewMode] = useState<ViewMode>(
    role === 'ALUNO' ? 'REPORT_CARD' : 'GRADES_LIST',
  );

  // Filtros e paginação da aba de Lançamentos
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [activityFilter, setActivityFilter] = useState<string>('ALL');
  const [studentFilter, setStudentFilter] = useState<string>('ALL');
  const [performanceFilter, setPerformanceFilter] =
    useState<PerformanceFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Aluno selecionado na visão de Boletim Individual (ADMIN / PROFESSOR / ALUNO)
  const [selectedReportStudentId, setSelectedReportStudentId] =
    useState<string>('');
  const [modalClassIdForCreate, setModalClassIdForCreate] =
    useState<string>('ALL');

  // Estados de Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<EnrichedGrade | null>(null);
  const [deletingGrade, setDeletingGrade] = useState<EnrichedGrade | null>(
    null,
  );
  const [viewingGradeId, setViewingGradeId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // ============================================================================
  // Consultas Reais à API (Respeitando RBAC e Isolamento Horizontal do Back-End)
  // ============================================================================

  const {
    data: allGrades = [],
    isLoading: isGradesLoading,
    isError: isGradesError,
    error: gradesError,
    refetch: refetchGrades,
    isFetching: isGradesFetching,
  } = useQuery({
    queryKey: ['grades', 'all'],
    queryFn: () => gradeService.listAll(),
  });

  const { data: allActivities = [], isLoading: isActivitiesLoading } = useQuery(
    {
      queryKey: ['activities', 'all'],
      queryFn: () => activityService.listAll(),
    },
  );

  const { data: userVisibleClasses = [], isLoading: isClassesLoading } =
    useQuery({
      queryKey: ['classes', 'all'],
      queryFn: () => classService.listAll(),
    });

  const { data: allEnrollments = [], isLoading: isEnrollmentsLoading } =
    useQuery({
      queryKey: ['enrollments', 'all'],
      queryFn: () => enrollmentService.listAll(),
    });

  const { data: allStudents = [] } = useQuery({
    queryKey: ['students', 'all'],
    queryFn: () => studentService.listAll(),
  });

  const { data: allSubjects = [] } = useQuery({
    queryKey: ['subjects', 'all'],
    queryFn: () => subjectService.listAll(),
  });

  // Consulta individual de nota por ID (GET /api/grades/:id)
  const {
    data: gradeDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
  } = useQuery({
    queryKey: ['grades', 'detail', viewingGradeId],
    queryFn: () => gradeService.getById(viewingGradeId!),
    enabled: Boolean(viewingGradeId),
  });

  // Determina o ID efetivo do estudante para consulta da média oficial (GET /api/indicators/students/:id/average)
  const effectiveStudentIdForAverage = useMemo(() => {
    if (role === 'ALUNO') {
      return loggedStudentId || allStudents[0]?.id || '';
    }
    return selectedReportStudentId;
  }, [role, loggedStudentId, allStudents, selectedReportStudentId]);

  const {
    data: officialStudentAverage,
    isLoading: isAverageLoading,
  } = useQuery({
    queryKey: ['indicators', 'student-average', effectiveStudentIdForAverage],
    queryFn: () =>
      gradeService.getStudentAverage(effectiveStudentIdForAverage),
    enabled: Boolean(effectiveStudentIdForAverage),
  });

  // Também consulta a média oficial do aluno ao abrir o modal de detalhes de uma nota
  const detailStudentId = gradeDetail?.studentId || '';
  const { data: detailStudentAverage } = useQuery({
    queryKey: ['indicators', 'student-average', detailStudentId],
    queryFn: () => gradeService.getStudentAverage(detailStudentId),
    enabled: Boolean(detailStudentId),
  });

  // ============================================================================
  // Mapas de Enriquecimento Relacional (Sem alterar contratos do Back-End)
  // ============================================================================

  const subjectsMap = useMemo(() => {
    const map = new Map<string, string>();
    allSubjects.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [allSubjects]);

  const classesMap = useMemo(() => {
    const map = new Map<string, ClassEntity>();
    userVisibleClasses.forEach((c) => map.set(c.id, c));
    return map;
  }, [userVisibleClasses]);

  const activitiesMap = useMemo(() => {
    const map = new Map<string, Activity>();
    allActivities.forEach((a) => map.set(a.id, a));
    return map;
  }, [allActivities]);

  const studentsMap = useMemo(() => {
    const map = new Map<string, Student>();
    allStudents.forEach((s) => map.set(s.id, s));
    allEnrollments.forEach((e) => {
      if (e.student) map.set(e.student.id, e.student);
    });
    allGrades.forEach((g) => {
      if (g.student) map.set(g.student.id, g.student);
    });
    return map;
  }, [allStudents, allEnrollments, allGrades]);

  // Lista de estudantes no escopo do usuário logado
  const scopedStudents = useMemo(() => {
    if (role === 'ALUNO') {
      const ownId = loggedStudentId || allStudents[0]?.id;
      if (!ownId) return [];
      const st = studentsMap.get(ownId);
      return st ? [st] : [];
    }
    if (role === 'PROFESSOR') {
      const map = new Map<string, Student>();
      allEnrollments.forEach((e) => {
        if (e.student) map.set(e.student.id, e.student);
      });
      allGrades.forEach((g) => {
        if (g.student) map.set(g.student.id, g.student);
      });
      return Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR'),
      );
    }
    return Array.from(studentsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    );
  }, [role, loggedStudentId, allStudents, allEnrollments, allGrades, studentsMap]);

  // Inicializa o aluno selecionado no Boletim quando a lista de alunos carrega
  useEffect(() => {
    if (role === 'ALUNO') {
      const ownId = loggedStudentId || allStudents[0]?.id || '';
      if (ownId && selectedReportStudentId !== ownId) {
        setSelectedReportStudentId(ownId);
      }
    } else if (!selectedReportStudentId && scopedStudents.length > 0) {
      setSelectedReportStudentId(scopedStudents[0].id);
    }
  }, [role, loggedStudentId, allStudents, scopedStudents, selectedReportStudentId]);

  // Notas enriquecidas com dados de Turma, Disciplina, Professor, Atividade e Aluno
  const enrichedGrades = useMemo<EnrichedGrade[]>(() => {
    return allGrades.map((grade) => {
      const act = activitiesMap.get(grade.activityId) || grade.activity;
      const clsId = act?.classId || grade.activity?.classId || '';
      const cls = classesMap.get(clsId) || act?.class || grade.activity?.class;
      const subId = cls?.subjectId || act?.content?.subjectId || '';
      const subName =
        cls?.subject?.name ||
        subjectsMap.get(subId) ||
        'Disciplina Curricular';
      const st = studentsMap.get(grade.studentId) || grade.student;

      return {
        ...grade,
        studentName: st?.name || `Estudante ${grade.studentId.slice(0, 6)}`,
        studentRegistration: st?.registration || '—',
        studentEmail: st?.email || '—',
        activityTitle: act?.title || `Atividade ${grade.activityId.slice(0, 6)}`,
        activityDueDate: act?.dueDate,
        maxScore: act?.maxScore ?? 10,
        classId: clsId,
        className: cls?.name || 'Turma vinculada',
        classPeriod: cls ? `${cls.year}/${cls.semester}º Sem` : '—',
        subjectId: subId,
        subjectName: subName,
        teacherName: cls?.teacher?.name || 'Docente responsável',
      };
    });
  }, [allGrades, activitiesMap, classesMap, subjectsMap, studentsMap]);

  // ============================================================================
  // Indicadores e Resumos Acadêmicos (Consistentes com IndicatorService)
  // ============================================================================

  const activeEnrollments = useMemo(
    () => allEnrollments.filter((e) => e.status === 'ACTIVE'),
    [allEnrollments],
  );

  // Calcula quantos lançamentos de notas ainda estão pendentes nas atividades visíveis
  const pendingEvaluationsCount = useMemo(() => {
    if (role === 'ALUNO') {
      const gradedActivityIds = new Set(allGrades.map((g) => g.activityId));
      return allActivities.filter((a) => !gradedActivityIds.has(a.id)).length;
    }

    let pending = 0;
    for (const act of allActivities) {
      const activeInClass = activeEnrollments.filter(
        (e) => e.classId === act.classId,
      );
      for (const enr of activeInClass) {
        const hasGrade = allGrades.some(
          (g) => g.activityId === act.id && g.studentId === enr.studentId,
        );
        if (!hasGrade) pending += 1;
      }
    }
    return pending;
  }, [role, allActivities, activeEnrollments, allGrades]);

  // Resumo por estudante (usado na visão de Boletim para ADMIN e PROFESSOR)
  const studentSummaries = useMemo<StudentAcademicSummary[]>(() => {
    return scopedStudents.map((st) => {
      const stGrades = enrichedGrades.filter((g) => g.studentId === st.id);
      const stActiveEnrollments = activeEnrollments.filter(
        (e) => e.studentId === st.id,
      );
      const stClassIds = new Set(stActiveEnrollments.map((e) => e.classId));
      const stActivities = allActivities.filter((a) =>
        stClassIds.has(a.classId),
      );
      const gradedActIds = new Set(stGrades.map((g) => g.activityId));
      const pendingCount = stActivities.filter(
        (a) => !gradedActIds.has(a.id),
      ).length;

      // Mesma fórmula exata de IndicatorService.getStudentAverage: soma / quantidade com 2 casas decimais
      const avg =
        stGrades.length === 0
          ? 0
          : Number(
              (
                stGrades.reduce((acc, curr) => acc + curr.score, 0) /
                stGrades.length
              ).toFixed(2),
            );

      return {
        studentId: st.id,
        name: st.name,
        registration: st.registration,
        email: st.email,
        gradesCount: stGrades.length,
        pendingActivitiesCount: pendingCount,
        average: avg,
        activeClassesCount: stClassIds.size,
      };
    });
  }, [scopedStudents, enrichedGrades, activeEnrollments, allActivities]);

  const scopeGeneralAverage = useMemo(() => {
    if (role === 'ALUNO' && officialStudentAverage) {
      return officialStudentAverage.average;
    }
    if (enrichedGrades.length === 0) return 0;
    const sum = enrichedGrades.reduce((acc, g) => acc + g.score, 0);
    return Number((sum / enrichedGrades.length).toFixed(2));
  }, [role, officialStudentAverage, enrichedGrades]);

  const lowPerformanceStudentsCount = useMemo(() => {
    return studentSummaries.filter(
      (s) => s.gradesCount > 0 && s.average < MIN_PASSING_AVERAGE,
    ).length;
  }, [studentSummaries]);

  // ============================================================================
  // Boletim Estruturado por Disciplina / Turma e Atividade para o Aluno Selecionado
  // ============================================================================

  const reportCardSections = useMemo(() => {
    const targetStudentId = effectiveStudentIdForAverage;
    if (!targetStudentId) return [];

    // Identifica todas as turmas em que o estudante possui matrícula ativa ou notas lançadas
    const studentEnrollments = allEnrollments.filter(
      (e) => e.studentId === targetStudentId,
    );
    const studentGrades = enrichedGrades.filter(
      (g) => g.studentId === targetStudentId,
    );

    const relevantClassIds = new Set<string>();
    studentEnrollments.forEach((e) => {
      if (e.status === 'ACTIVE') relevantClassIds.add(e.classId);
    });
    studentGrades.forEach((g) => {
      if (g.classId) relevantClassIds.add(g.classId);
    });
    if (role === 'ALUNO') {
      userVisibleClasses.forEach((c) => relevantClassIds.add(c.id));
    }

    return Array.from(relevantClassIds).map((clsId) => {
      const cls = classesMap.get(clsId);
      const subId = cls?.subjectId || '';
      const subjectName =
        cls?.subject?.name || subjectsMap.get(subId) || cls?.name || 'Disciplina';
      const className = cls?.name || 'Turma';
      const period = cls ? `${cls.year}/${cls.semester}º Sem` : '—';
      const teacherName = cls?.teacher?.name || '—';
      const enrollment = studentEnrollments.find((e) => e.classId === clsId);

      // Atividades da turma + eventuais notas avulsas daquela turma
      const classActivities = allActivities.filter((a) => a.classId === clsId);
      const gradesInClass = studentGrades.filter((g) => g.classId === clsId);

      const items = classActivities.map((act) => {
        const foundGrade = gradesInClass.find((g) => g.activityId === act.id);
        return {
          activityId: act.id,
          activityTitle: act.title,
          dueDate: act.dueDate,
          maxScore: act.maxScore,
          grade: foundGrade || null,
        };
      });

      // Adiciona notas cujas atividades eventualmente não estivessem na lista de atividades
      for (const g of gradesInClass) {
        if (!items.some((item) => item.activityId === g.activityId)) {
          items.push({
            activityId: g.activityId,
            activityTitle: g.activityTitle,
            dueDate: g.activityDueDate || '',
            maxScore: g.maxScore,
            grade: g,
          });
        }
      }

      const gradedItems = items.filter((i) => i.grade !== null);
      const subjectAverage =
        gradedItems.length === 0
          ? null
          : Number(
              (
                gradedItems.reduce((acc, i) => acc + (i.grade?.score ?? 0), 0) /
                gradedItems.length
              ).toFixed(2),
            );

      return {
        classId: clsId,
        className,
        period,
        subjectId: subId,
        subjectName,
        teacherName,
        enrollmentStatus: enrollment?.status || 'ACTIVE',
        items,
        gradedCount: gradedItems.length,
        totalActivitiesCount: items.length,
        subjectAverage,
      };
    });
  }, [
    effectiveStudentIdForAverage,
    allEnrollments,
    enrichedGrades,
    role,
    userVisibleClasses,
    classesMap,
    subjectsMap,
    allActivities,
  ]);

  // ============================================================================
  // Formulários de Lançamento (POST) e Edição (PUT) de Notas
  // ============================================================================

  const createForm = useForm<CreateGradeFormInput>({
    resolver: zodResolver(createGradeFormSchema),
    defaultValues: {
      activityId: '',
      studentId: '',
      score: 0,
    },
  });

  const updateForm = useForm<UpdateGradeFormInput>({
    resolver: zodResolver(updateGradeFormSchema),
    defaultValues: {
      score: 0,
    },
  });

  const watchedCreateActivityId = createForm.watch('activityId');
  const selectedActivityForCreate = useMemo(
    () =>
      watchedCreateActivityId
        ? activitiesMap.get(watchedCreateActivityId) || null
        : null,
    [watchedCreateActivityId, activitiesMap],
  );

  // Filtra atividades no modal de criação pela turma selecionada
  const availableActivitiesForCreate = useMemo(() => {
    if (modalClassIdForCreate === 'ALL') return allActivities;
    return allActivities.filter((a) => a.classId === modalClassIdForCreate);
  }, [allActivities, modalClassIdForCreate]);

  // Estudantes com matrícula ACTIVE na turma da atividade selecionada
  const eligibleStudentsForSelectedActivity = useMemo(() => {
    if (!selectedActivityForCreate) return [];
    const targetClassId = selectedActivityForCreate.classId;

    const activeInClass = activeEnrollments.filter(
      (e) => e.classId === targetClassId,
    );

    const gradedStudentIdsForActivity = new Set(
      allGrades
        .filter((g) => g.activityId === selectedActivityForCreate.id)
        .map((g) => g.studentId),
    );

    return activeInClass.map((enr) => {
      const st = studentsMap.get(enr.studentId) || enr.student;
      const alreadyGraded = gradedStudentIdsForActivity.has(enr.studentId);
      const existingGrade = allGrades.find(
        (g) =>
          g.activityId === selectedActivityForCreate.id &&
          g.studentId === enr.studentId,
      );
      return {
        studentId: enr.studentId,
        name: st?.name || `Aluno ${enr.studentId.slice(0, 6)}`,
        registration: st?.registration || '—',
        alreadyGraded,
        existingScore: existingGrade?.score,
      };
    });
  }, [selectedActivityForCreate, activeEnrollments, allGrades, studentsMap]);

  // Mutations com invalidação automática de cache (Grades, Activities, Dashboard e Indicadores)
  const invalidateAcademicQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['grades'] }),
      queryClient.invalidateQueries({ queryKey: ['activities'] }),
      queryClient.invalidateQueries({ queryKey: ['indicators'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateGradeFormInput) => gradeService.create(payload),
    onSuccess: async () => {
      await invalidateAcademicQueries();
      toast.success(
        'Nota lançada com sucesso',
        'A avaliação foi registrada no boletim acadêmico.',
      );
      setIsCreateOpen(false);
      setFormError(null);
      createForm.reset({ activityId: '', studentId: '', score: 0 });
    },
    onError: (err) => {
      const msg = getApiErrorMessage(
        err,
        'Não foi possível registrar a nota. Verifique os dados informados.',
      );
      setFormError(msg);
      toast.error('Falha ao lançar nota', msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateGradeFormInput;
    }) => gradeService.update(id, payload),
    onSuccess: async () => {
      await invalidateAcademicQueries();
      toast.success(
        'Nota atualizada com sucesso',
        'A pontuação da avaliação foi recalculada no boletim.',
      );
      setEditingGrade(null);
      setFormError(null);
    },
    onError: (err) => {
      const msg = getApiErrorMessage(
        err,
        'Não foi possível atualizar a nota desta atividade.',
      );
      setFormError(msg);
      toast.error('Falha ao atualizar nota', msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => gradeService.remove(id),
    onSuccess: async () => {
      await invalidateAcademicQueries();
      toast.success(
        'Nota removida',
        'O lançamento da avaliação foi excluído com sucesso.',
      );
      setDeletingGrade(null);
    },
    onError: (err) => {
      const msg = getApiErrorMessage(
        err,
        'Não foi possível excluir o lançamento de nota.',
      );
      toast.error('Erro ao excluir nota', msg);
      setDeletingGrade(null);
    },
  });

  // Handlers de Abertura de Modais
  const handleOpenCreateModal = (prefill?: {
    classId?: string;
    activityId?: string;
    studentId?: string;
  }) => {
    setFormError(null);
    const defaultClassId = prefill?.classId || 'ALL';
    setModalClassIdForCreate(defaultClassId);

    const firstActivity =
      prefill?.activityId ||
      (defaultClassId !== 'ALL'
        ? allActivities.find((a) => a.classId === defaultClassId)?.id
        : allActivities[0]?.id) ||
      '';

    createForm.reset({
      activityId: firstActivity,
      studentId: prefill?.studentId || '',
      score: 0,
    });
    setIsCreateOpen(true);
  };

  const handleOpenEditModal = (grade: EnrichedGrade) => {
    setFormError(null);
    setEditingGrade(grade);
    updateForm.reset({
      score: grade.score,
    });
  };

  const onCreateSubmit = (values: CreateGradeFormInput) => {
    setFormError(null);
    const act = activitiesMap.get(values.activityId);
    if (!act) {
      setFormError('Selecione uma atividade avaliativa válida.');
      return;
    }
    if (values.score > act.maxScore) {
      createForm.setError('score', {
        type: 'manual',
        message: `A nota informada (${formatDecimal(values.score, 2)}) não pode exceder a nota máxima da atividade (${formatDecimal(act.maxScore, 2)}).`,
      });
      return;
    }

    const duplicate = allGrades.find(
      (g) =>
        g.activityId === values.activityId && g.studentId === values.studentId,
    );
    if (duplicate) {
      setFormError(
        'Este estudante já possui nota lançada para a atividade selecionada. Utilize a ação de Editar para atualizar a pontuação.',
      );
      return;
    }

    createMutation.mutate(values);
  };

  const onUpdateSubmit = (values: UpdateGradeFormInput) => {
    if (!editingGrade) return;
    setFormError(null);

    if (values.score > editingGrade.maxScore) {
      updateForm.setError('score', {
        type: 'manual',
        message: `A nota informada (${formatDecimal(values.score, 2)}) não pode exceder a nota máxima da atividade (${formatDecimal(editingGrade.maxScore, 2)}).`,
      });
      return;
    }

    updateMutation.mutate({
      id: editingGrade.id,
      payload: { score: values.score },
    });
  };

  // ============================================================================
  // Filtragem, Ordenação e Paginação da Lista de Notas
  // ============================================================================

  const filteredGrades = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = enrichedGrades.filter((g) => {
      if (classFilter !== 'ALL' && g.classId !== classFilter) return false;
      if (subjectFilter !== 'ALL' && g.subjectId !== subjectFilter) return false;
      if (activityFilter !== 'ALL' && g.activityId !== activityFilter)
        return false;
      if (studentFilter !== 'ALL' && g.studentId !== studentFilter) return false;

      if (performanceFilter === 'PASSING' && g.score < MIN_PASSING_AVERAGE)
        return false;
      if (performanceFilter === 'LOW' && g.score >= MIN_PASSING_AVERAGE)
        return false;

      if (!normalizedSearch) return true;

      return (
        g.studentName.toLowerCase().includes(normalizedSearch) ||
        g.studentRegistration.toLowerCase().includes(normalizedSearch) ||
        g.activityTitle.toLowerCase().includes(normalizedSearch) ||
        g.className.toLowerCase().includes(normalizedSearch) ||
        g.subjectName.toLowerCase().includes(normalizedSearch)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'score-desc') return b.score - a.score;
      if (sortBy === 'score-asc') return a.score - b.score;
      if (sortBy === 'student-asc')
        return a.studentName.localeCompare(b.studentName, 'pt-BR');
      if (sortBy === 'activity-asc')
        return a.activityTitle.localeCompare(b.activityTitle, 'pt-BR');

      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [
    enrichedGrades,
    searchTerm,
    classFilter,
    subjectFilter,
    activityFilter,
    studentFilter,
    performanceFilter,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredGrades.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedGrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGrades.slice(start, start + pageSize);
  }, [filteredGrades, currentPage]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setClassFilter('ALL');
    setSubjectFilter('ALL');
    setActivityFilter('ALL');
    setStudentFilter('ALL');
    setPerformanceFilter('ALL');
    setSortBy('recent');
    setPage(1);
  };

  // Opções únicas de disciplinas visíveis para o filtro
  const availableSubjects = useMemo(() => {
    const map = new Map<string, string>();
    userVisibleClasses.forEach((c) => {
      const name = c.subject?.name || subjectsMap.get(c.subjectId);
      if (c.subjectId && name) map.set(c.subjectId, name);
    });
    enrichedGrades.forEach((g) => {
      if (g.subjectId && g.subjectName) map.set(g.subjectId, g.subjectName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [userVisibleClasses, subjectsMap, enrichedGrades]);

  const isLoading =
    isGradesLoading ||
    isActivitiesLoading ||
    isClassesLoading ||
    isEnrollmentsLoading;

  if (isLoading) {
    return (
      <LoadingState label="Carregando notas, atividades avaliativas e boletim acadêmico..." />
    );
  }

  if (isGradesError) {
    return (
      <ErrorState
        title="Não foi possível carregar o módulo de Notas e Boletim"
        message={getApiErrorMessage(
          gradesError,
          'Ocorreu um erro ao consultar os lançamentos de notas na API.',
        )}
        onRetry={() => void refetchGrades()}
      />
    );
  }

  const selectedStudentObj = effectiveStudentIdForAverage
    ? studentsMap.get(effectiveStudentIdForAverage)
    : undefined;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Cabeçalho Institucional do Módulo */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">FASE 3.3.5 • AVALIAÇÕES</Badge>
            <Badge
              variant={
                role === 'ADMIN'
                  ? 'primary'
                  : role === 'PROFESSOR'
                    ? 'info'
                    : 'success'
              }
            >
              PERFIL: {role}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <Award className="w-6 h-6 text-[#2563EB] shrink-0" />
            <span>
              {role === 'ALUNO'
                ? 'Meu Boletim Escolar e Notas'
                : 'Gestão de Notas e Boletim Acadêmico'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
            {role === 'ADMIN' &&
              'Acompanhe o desempenho global da instituição, consulte boletins individuais por estudante e gerencie lançamentos por turma e atividade.'}
            {role === 'PROFESSOR' &&
              'Lance e atualize notas dos alunos com matrícula ativa nas suas turmas, respeitando os limites máximos de pontuação de cada atividade.'}
            {role === 'ALUNO' &&
              'Consulte exclusivamente suas notas lançadas, sua média geral oficial e o boletim organizado por disciplina e atividade.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={isGradesFetching}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => void refetchGrades()}
          >
            Atualizar
          </Button>

          {canWrite && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenCreateModal()}
            >
              Lançar Nota
            </Button>
          )}
        </div>
      </div>

      {/* Aviso de Escopo e Regras Acadêmicas */}
      <Alert
        variant={role === 'ALUNO' ? 'success' : 'info'}
        title={
          role === 'ADMIN'
            ? 'Governança Acadêmica e Regra de Cálculo de Médias'
            : role === 'PROFESSOR'
              ? 'Isolamento Docente Ativo — Lançamento Restrito às Suas Turmas'
              : 'Sigilo Estudantil Ativo — Visualização Exclusiva do Seu Boletim'
        }
      >
        {role === 'ADMIN' && (
          <span>
            As médias estudantis seguem estritamente a fórmula oficial da API (
            <code>GET /api/indicators/students/:id/average</code>: média
            aritmética simples das notas lançadas, com corte de aprovação{' '}
            <strong>{formatDecimal(MIN_PASSING_AVERAGE, 1)}</strong>). Nenhuma
            nota pode ultrapassar o <code>maxScore</code> da atividade.
          </span>
        )}
        {role === 'PROFESSOR' && (
          <span>
            Você visualiza e avalia exclusivamente os estudantes com matrícula{' '}
            <code>ACTIVE</code> nas turmas sob sua regência. A pontuação deve
            respeitar o limite máximo (<code>maxScore</code>) de cada atividade.
          </span>
        )}
        {role === 'ALUNO' && (
          <span>
            Olá, <strong>{user?.name}</strong>! Seus resultados são isolados no
            servidor por vínculo de matrícula. Sua média oficial é calculada em
            tempo real sobre as atividades avaliadas (referência mínima:{' '}
            <strong>{formatDecimal(MIN_PASSING_AVERAGE, 1)}</strong>).
          </span>
        )}
      </Alert>

      {/* Cards de Indicadores de Desempenho (KPIs) */}
      <section aria-label="Resumo de Indicadores de Notas">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <StatCard
            title={
              role === 'ALUNO' ? 'Minha Média Geral' : 'Média Geral (Escopo)'
            }
            value={formatDecimal(scopeGeneralAverage, 2)}
            subtitle={`Referência institucional: ${formatDecimal(MIN_PASSING_AVERAGE, 1)}`}
            badgeText={
              enrichedGrades.length === 0
                ? 'Sem avaliações'
                : scopeGeneralAverage >= MIN_PASSING_AVERAGE
                  ? 'Desempenho Regular'
                  : 'Atenção Pedagógica'
            }
            tone={
              enrichedGrades.length === 0
                ? 'neutral'
                : scopeGeneralAverage >= MIN_PASSING_AVERAGE
                  ? 'success'
                  : 'warning'
            }
            icon={<Award className="w-5 h-5" />}
          />

          <StatCard
            title="Notas Lançadas"
            value={enrichedGrades.length}
            subtitle={
              role === 'ALUNO'
                ? 'Atividades corrigidas no seu boletim'
                : `Em ${allActivities.length} atividade(s) disponível(is)`
            }
            badgeText="Avaliações"
            tone="primary"
            icon={<CheckCircle2 className="w-5 h-5" />}
          />

          <StatCard
            title={
              role === 'ALUNO'
                ? 'Atividades Pendentes'
                : 'Avaliações Pendentes'
            }
            value={pendingEvaluationsCount}
            subtitle={
              role === 'ALUNO'
                ? 'Aguardando lançamento de nota'
                : 'Matrículas ativas sem nota na atividade'
            }
            badgeText={
              pendingEvaluationsCount > 0 ? 'Aguardando nota' : '100% em dia'
            }
            tone={pendingEvaluationsCount > 0 ? 'warning' : 'success'}
            icon={<Clock className="w-5 h-5" />}
          />

          {role === 'ALUNO' ? (
            <StatCard
              title="Disciplinas no Boletim"
              value={reportCardSections.length}
              subtitle="Turmas vinculadas no período"
              badgeText="Currículo"
              tone="navy"
              icon={<BookOpen className="w-5 h-5" />}
            />
          ) : (
            <StatCard
              title="Estudantes em Atenção"
              value={lowPerformanceStudentsCount}
              subtitle={`Média abaixo de ${formatDecimal(MIN_PASSING_AVERAGE, 1)} no escopo`}
              badgeText={
                lowPerformanceStudentsCount > 0
                  ? `${lowPerformanceStudentsCount} em alerta`
                  : 'Regular'
              }
              tone={lowPerformanceStudentsCount > 0 ? 'warning' : 'success'}
              icon={<AlertTriangle className="w-5 h-5" />}
            />
          )}
        </div>
      </section>

      {/* Seletor de Modo de Visualização (Abas: Boletim Acadêmico vs. Tabela de Lançamentos) */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => setViewMode('REPORT_CARD')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            viewMode === 'REPORT_CARD'
              ? 'bg-[#2563EB] text-white shadow-2xs'
              : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-50'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>
            {role === 'ALUNO'
              ? 'Boletim por Disciplina e Atividade'
              : 'Boletim por Estudante e Disciplina'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('GRADES_LIST')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            viewMode === 'GRADES_LIST'
              ? 'bg-[#2563EB] text-white shadow-2xs'
              : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-50'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>
            {role === 'ALUNO'
              ? 'Histórico Detalhado de Notas'
              : 'Lançamentos por Turma e Atividade'}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              viewMode === 'GRADES_LIST'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {enrichedGrades.length}
          </span>
        </button>
      </div>

      {/* ====================================================================
          VISÃO 1: BOLETIM ACADÊMICO CONSOLIDADO POR DISCIPLINA E ATIVIDADE
         ==================================================================== */}
      {viewMode === 'REPORT_CARD' && (
        <div className="space-y-6">
          {/* Painel Superior de Seleção de Estudante (Para ADMIN e PROFESSOR) */}
          {role !== 'ALUNO' && (
            <Card
              title="Desempenho Consolidado por Estudante"
              subtitle="Selecione um estudante para inspecionar seu Boletim completo por disciplina e atividade ou lançar notas pendentes"
            >
              {studentSummaries.length === 0 ? (
                <EmptyState
                  compact
                  title="Nenhum estudante encontrado no seu escopo"
                  description="Não há alunos matriculados nas turmas visíveis ao seu perfil."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {studentSummaries.map((st) => {
                    const isSelected =
                      st.studentId === effectiveStudentIdForAverage;
                    const isPassing =
                      st.gradesCount === 0 ||
                      st.average >= MIN_PASSING_AVERAGE;

                    return (
                      <div
                        key={st.studentId}
                        onClick={() => setSelectedReportStudentId(st.studentId)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedReportStudentId(st.studentId);
                          }
                        }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#2563EB] bg-blue-50/40 ring-2 ring-[#2563EB]/15'
                            : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#0F172A] truncate">
                              {st.name}
                            </p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                              Matrícula: {st.registration}
                            </p>
                          </div>
                          <Badge
                            variant={
                              st.gradesCount === 0
                                ? 'neutral'
                                : isPassing
                                  ? 'success'
                                  : 'warning'
                            }
                          >
                            Média: {formatDecimal(st.average, 2)}
                          </Badge>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                          <span>
                            <strong>{st.gradesCount}</strong> nota(s) lançada(s)
                          </span>
                          <span>
                            {st.pendingActivitiesCount > 0 ? (
                              <span className="text-amber-700 font-medium">
                                {st.pendingActivitiesCount} pendente(s)
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-medium">
                                Completo
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Cabeçalho do Boletim Individual do Estudante Selecionado */}
          {selectedStudentObj && (
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center font-bold text-base shrink-0">
                    {selectedStudentObj.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
                        Boletim Escolar — {selectedStudentObj.name}
                      </h2>
                      <Badge variant="neutral">
                        Matrícula: {selectedStudentObj.registration}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      E-mail: {selectedStudentObj.email} • Média Oficial API (
                      <code>/indicators/students/:id/average</code>):{' '}
                      <strong className="text-[#0F172A] tabular-nums">
                        {isAverageLoading
                          ? 'Calculando...'
                          : formatDecimal(
                              officialStudentAverage?.average ?? 0,
                              2,
                            )}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={
                      (officialStudentAverage?.average ?? 0) >=
                      MIN_PASSING_AVERAGE
                        ? 'success'
                        : 'warning'
                    }
                  >
                    {(officialStudentAverage?.average ?? 0) >=
                    MIN_PASSING_AVERAGE
                      ? `Média Regular (>= ${formatDecimal(MIN_PASSING_AVERAGE, 1)})`
                      : `Atenção Pedagógica (< ${formatDecimal(MIN_PASSING_AVERAGE, 1)})`}
                  </Badge>
                </div>
              </div>
            </Card>
          )}

          {/* Seções do Boletim por Disciplina e Turma */}
          {reportCardSections.length === 0 ? (
            <Card>
              <EmptyState
                icon={<BookOpen className="w-6 h-6 text-[#2563EB]" />}
                title="Nenhuma disciplina ou avaliação vinculada ao boletim"
                description="Este estudante ainda não possui turmas com matrícula ativa ou avaliações registradas."
              />
            </Card>
          ) : (
            <div className="space-y-5">
              {reportCardSections.map((section) => {
                const isSubjectPassing =
                  section.subjectAverage === null ||
                  section.subjectAverage >= MIN_PASSING_AVERAGE;

                return (
                  <Card
                    key={section.classId}
                    title={`${section.subjectName} — ${section.className}`}
                    subtitle={`Período: ${section.period} • Docente: ${section.teacherName} • Avaliações concluídas: ${section.gradedCount}/${section.totalActivitiesCount}`}
                    action={
                      <div className="flex flex-wrap items-center gap-2">
                        {section.subjectAverage !== null ? (
                          <Badge
                            variant={isSubjectPassing ? 'success' : 'warning'}
                          >
                            Média na Disciplina:{' '}
                            {formatDecimal(section.subjectAverage, 2)}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Sem notas lançadas</Badge>
                        )}
                      </div>
                    }
                  >
                    {section.items.length === 0 ? (
                      <EmptyState
                        compact
                        title="Nenhuma atividade cadastrada nesta turma"
                        description="Ainda não existem atividades avaliativas publicadas para esta turma."
                      />
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {section.items.map((item) => {
                          const hasGrade = item.grade !== null;
                          const score = item.grade?.score ?? 0;
                          const percentage =
                            item.maxScore > 0
                              ? Math.min(
                                  100,
                                  Math.round((score / item.maxScore) * 100),
                                )
                              : 0;

                          return (
                            <div
                              key={item.activityId}
                              className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <FileText className="w-4 h-4 text-[#2563EB] shrink-0" />
                                  <p className="text-sm font-semibold text-[#0F172A]">
                                    {item.activityTitle}
                                  </p>
                                  {hasGrade ? (
                                    <Badge
                                      variant={
                                        score >= MIN_PASSING_AVERAGE
                                          ? 'success'
                                          : 'warning'
                                      }
                                    >
                                      Avaliada
                                    </Badge>
                                  ) : (
                                    <Badge variant="warning">
                                      Pendente de Nota
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600">
                                  Prazo de entrega:{' '}
                                  <strong>{formatDate(item.dueDate)}</strong> •
                                  Valor máximo:{' '}
                                  <strong className="tabular-nums">
                                    {formatDecimal(item.maxScore, 2)}
                                  </strong>
                                  {hasGrade && (
                                    <span>
                                      {' '}
                                      • Aproveitamento:{' '}
                                      <strong className="tabular-nums">
                                        {percentage}%
                                      </strong>
                                    </span>
                                  )}
                                </p>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                {hasGrade && item.grade ? (
                                  <>
                                    <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-right">
                                      <span className="text-[11px] text-slate-500 block leading-none">
                                        Nota Obtida
                                      </span>
                                      <span className="text-sm font-bold text-[#0F172A] tabular-nums">
                                        {formatDecimal(item.grade.score, 2)}{' '}
                                        <span className="text-xs font-normal text-slate-500">
                                          / {formatDecimal(item.maxScore, 1)}
                                        </span>
                                      </span>
                                    </div>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setViewingGradeId(item.grade!.id)
                                      }
                                      title="Ver detalhes da avaliação"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>

                                    {canWrite && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        leftIcon={
                                          <Pencil className="w-3.5 h-3.5" />
                                        }
                                        onClick={() =>
                                          handleOpenEditModal(item.grade!)
                                        }
                                      >
                                        Editar
                                      </Button>
                                    )}
                                  </>
                                ) : canWrite &&
                                  effectiveStudentIdForAverage ? (
                                  <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                                    onClick={() =>
                                      handleOpenCreateModal({
                                        classId: section.classId,
                                        activityId: item.activityId,
                                        studentId: effectiveStudentIdForAverage,
                                      })
                                    }
                                  >
                                    Lançar Nota
                                  </Button>
                                ) : (
                                  <span className="text-xs text-slate-500 italic">
                                    Aguardando lançamento pelo docente
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          VISÃO 2: TABELA E FILTROS DE LANÇAMENTOS DE NOTAS
         ==================================================================== */}
      {viewMode === 'GRADES_LIST' && (
        <div className="space-y-6">
          {/* Barra de Pesquisa e Filtros Combinados */}
          <Card>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5">
                  <SearchInput
                    value={searchTerm}
                    onChange={(val) => {
                      setSearchTerm(val);
                      setPage(1);
                    }}
                    placeholder="Buscar por aluno, matrícula, atividade, turma ou disciplina..."
                  />
                </div>

                <div className="md:col-span-3">
                  <select
                    aria-label="Filtrar por turma"
                    value={classFilter}
                    onChange={(e) => {
                      setClassFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="ALL">Todas as turmas</option>
                    {userVisibleClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.year}/{cls.semester}º)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <select
                    aria-label="Filtrar por atividade"
                    value={activityFilter}
                    onChange={(e) => {
                      setActivityFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="ALL">Todas as atividades</option>
                    {allActivities
                      .filter(
                        (a) =>
                          classFilter === 'ALL' || a.classId === classFilter,
                      )
                      .map((act) => (
                        <option key={act.id} value={act.id}>
                          {act.title} (Máx: {formatDecimal(act.maxScore, 1)})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <select
                    aria-label="Filtrar por disciplina"
                    value={subjectFilter}
                    onChange={(e) => {
                      setSubjectFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="ALL">Todas as disciplinas</option>
                    {availableSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                {role !== 'ALUNO' && (
                  <div>
                    <select
                      aria-label="Filtrar por estudante"
                      value={studentFilter}
                      onChange={(e) => {
                        setStudentFilter(e.target.value);
                        setPage(1);
                      }}
                      className="w-full h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    >
                      <option value="ALL">Todos os estudantes</option>
                      {scopedStudents.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.registration})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <select
                    aria-label="Filtrar por faixa de nota"
                    value={performanceFilter}
                    onChange={(e) => {
                      setPerformanceFilter(
                        e.target.value as PerformanceFilter,
                      );
                      setPage(1);
                    }}
                    className="w-full h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="ALL">Todas as faixas de nota</option>
                    <option value="PASSING">
                      Notas regulares (&gt;= {formatDecimal(MIN_PASSING_AVERAGE, 1)})
                    </option>
                    <option value="LOW">
                      Abaixo da referência (&lt;{' '}
                      {formatDecimal(MIN_PASSING_AVERAGE, 1)})
                    </option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    aria-label="Ordenar lançamentos"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="flex-1 h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="recent">Mais recentes</option>
                    <option value="score-desc">Maior nota</option>
                    <option value="score-asc">Menor nota</option>
                    <option value="student-asc">Nome do estudante (A-Z)</option>
                    <option value="activity-asc">Atividade (A-Z)</option>
                  </select>

                  {(searchTerm ||
                    classFilter !== 'ALL' ||
                    subjectFilter !== 'ALL' ||
                    activityFilter !== 'ALL' ||
                    studentFilter !== 'ALL' ||
                    performanceFilter !== 'ALL') && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      title="Limpar filtros"
                    >
                      <Filter className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Listagem Responsiva de Notas (Tabela Desktop + Cards Mobile) */}
          <Card
            title="Registros de Avaliações Lançadas"
            subtitle={`Exibindo ${filteredGrades.length} de ${enrichedGrades.length} lançamento(s) no escopo`}
          >
            {filteredGrades.length === 0 ? (
              <EmptyState
                icon={<Award className="w-6 h-6 text-[#2563EB]" />}
                title="Nenhum lançamento de nota encontrado"
                description={
                  enrichedGrades.length === 0
                    ? 'Ainda não existem notas registradas para as atividades deste escopo.'
                    : 'Nenhuma nota corresponde aos filtros selecionados.'
                }
                action={
                  canWrite ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={() => handleOpenCreateModal()}
                    >
                      Lançar Primeira Nota
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                {/* Visão Desktop (Tabela) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Estudante</th>
                        <th className="py-3 px-4">Atividade Avaliativa</th>
                        <th className="py-3 px-4">Turma / Disciplina</th>
                        <th className="py-3 px-4 text-right">Nota / Máx.</th>
                        <th className="py-3 px-4 text-center">Situação</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {paginatedGrades.map((grade) => {
                        const isGood = grade.score >= MIN_PASSING_AVERAGE;
                        const pct =
                          grade.maxScore > 0
                            ? Math.round((grade.score / grade.maxScore) * 100)
                            : 0;

                        return (
                          <tr
                            key={grade.id}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <p className="font-semibold text-[#0F172A]">
                                {grade.studentName}
                              </p>
                              <p className="text-xs text-slate-500 font-mono">
                                {grade.studentRegistration}
                              </p>
                            </td>

                            <td className="py-3.5 px-4">
                              <p className="font-medium text-[#0F172A]">
                                {grade.activityTitle}
                              </p>
                              <p className="text-xs text-slate-500">
                                Entrega: {formatDate(grade.activityDueDate)}
                              </p>
                            </td>

                            <td className="py-3.5 px-4">
                              <p className="font-medium text-slate-800">
                                {grade.subjectName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {grade.className} ({grade.classPeriod})
                              </p>
                            </td>

                            <td className="py-3.5 px-4 text-right tabular-nums">
                              <span className="font-bold text-[#0F172A] text-base">
                                {formatDecimal(grade.score, 2)}
                              </span>
                              <span className="text-xs text-slate-500">
                                {' '}
                                / {formatDecimal(grade.maxScore, 1)}
                              </span>
                              <span className="block text-[11px] text-slate-400">
                                {pct}% do valor
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <Badge variant={isGood ? 'success' : 'warning'}>
                                {isGood ? 'Regular' : 'Atenção'}
                              </Badge>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setViewingGradeId(grade.id)}
                                  title="Consultar detalhes da nota"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>

                                {canWrite && (
                                  <>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenEditModal(grade)}
                                      title="Editar pontuação"
                                    >
                                      <Pencil className="w-4 h-4 text-[#2563EB]" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeletingGrade(grade)}
                                      title="Excluir lançamento"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Visão Mobile (Cards Estruturados) */}
                <div className="md:hidden space-y-3">
                  {paginatedGrades.map((grade) => {
                    const isGood = grade.score >= MIN_PASSING_AVERAGE;

                    return (
                      <div
                        key={grade.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#0F172A] truncate">
                              {grade.studentName}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">
                              Matrícula: {grade.studentRegistration}
                            </p>
                          </div>
                          <Badge variant={isGood ? 'success' : 'warning'}>
                            Nota: {formatDecimal(grade.score, 2)} /{' '}
                            {formatDecimal(grade.maxScore, 1)}
                          </Badge>
                        </div>

                        <div className="text-xs text-slate-600 space-y-1">
                          <p>
                            <strong>Atividade:</strong> {grade.activityTitle}
                          </p>
                          <p>
                            <strong>Disciplina:</strong> {grade.subjectName} •{' '}
                            {grade.className}
                          </p>
                          <p>
                            <strong>Prazo:</strong>{' '}
                            {formatDate(grade.activityDueDate)}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => setViewingGradeId(grade.id)}
                          >
                            Detalhes
                          </Button>
                          {canWrite && (
                            <>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                leftIcon={<Pencil className="w-3.5 h-3.5" />}
                                onClick={() => handleOpenEditModal(grade)}
                              >
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                onClick={() => setDeletingGrade(grade)}
                              >
                                Excluir
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      page={currentPage}
                      totalPages={totalPages}
                      total={filteredGrades.length}
                      limit={pageSize}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {/* ====================================================================
          MODAL 1: LANÇAR NOVA NOTA (POST /api/grades)
         ==================================================================== */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Lançar Nota de Avaliação"
        description="Selecione a turma, a atividade avaliativa e o estudante com matrícula ativa."
        maxWidthClass="max-w-xl"
      >
        <form
          onSubmit={createForm.handleSubmit(onCreateSubmit)}
          className="space-y-4"
          noValidate
        >
          {formError && (
            <Alert variant="error" title="Não foi possível lançar a nota">
              {formError}
            </Alert>
          )}

          {/* Filtro auxiliar de Turma para facilitar localização da Atividade */}
          <div>
            <Label htmlFor="create-grade-class-filter">
              Filtrar Atividades por Turma Letiva
            </Label>
            <select
              id="create-grade-class-filter"
              value={modalClassIdForCreate}
              onChange={(e) => {
                const newClassId = e.target.value;
                setModalClassIdForCreate(newClassId);
                const firstAct =
                  newClassId === 'ALL'
                    ? allActivities[0]?.id || ''
                    : allActivities.find((a) => a.classId === newClassId)?.id ||
                      '';
                createForm.setValue('activityId', firstAct);
                createForm.setValue('studentId', '');
              }}
              className="mt-1 w-full h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="ALL">Todas as turmas disponíveis</option>
              {userVisibleClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} — {cls.subject?.name || subjectsMap.get(cls.subjectId)} (
                  {cls.year}/{cls.semester}º Sem)
                </option>
              ))}
            </select>
          </div>

          {/* Seleção da Atividade Avaliativa */}
          <div>
            <Label htmlFor="create-grade-activity" required>
              Atividade Avaliativa
            </Label>
            <select
              id="create-grade-activity"
              {...createForm.register('activityId', {
                onChange: () => {
                  createForm.setValue('studentId', '');
                },
              })}
              className="mt-1 w-full h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="">Selecione uma atividade...</option>
              {availableActivitiesForCreate.map((act) => {
                const cls = classesMap.get(act.classId);
                return (
                  <option key={act.id} value={act.id}>
                    {act.title} ({cls?.name || 'Turma'} • Máx:{' '}
                    {formatDecimal(act.maxScore, 1)})
                  </option>
                );
              })}
            </select>
            {createForm.formState.errors.activityId && (
              <p className="mt-1 text-xs text-red-600">
                {createForm.formState.errors.activityId.message}
              </p>
            )}
          </div>

          {/* Resumo da Atividade Selecionada e Nota Máxima */}
          {selectedActivityForCreate && (
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[#0F172A]">
                  {selectedActivityForCreate.title}
                </p>
                <p className="mt-0.5">
                  Entrega: {formatDate(selectedActivityForCreate.dueDate)}
                </p>
              </div>
              <Badge variant="primary">
                Nota Máxima: {formatDecimal(selectedActivityForCreate.maxScore, 2)}
              </Badge>
            </div>
          )}

          {/* Seleção do Estudante (Apenas alunos com matrícula ACTIVE na turma da atividade) */}
          <div>
            <Label htmlFor="create-grade-student" required>
              Estudante Matriculado (Status ACTIVE na Turma)
            </Label>
            <select
              id="create-grade-student"
              disabled={!selectedActivityForCreate}
              {...createForm.register('studentId')}
              className="mt-1 w-full h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:bg-slate-100"
            >
              <option value="">
                {!selectedActivityForCreate
                  ? 'Selecione primeiro uma atividade...'
                  : eligibleStudentsForSelectedActivity.length === 0
                    ? 'Nenhum aluno com matrícula ativa nesta turma'
                    : 'Selecione o estudante...'}
              </option>
              {eligibleStudentsForSelectedActivity.map((st) => (
                <option
                  key={st.studentId}
                  value={st.studentId}
                  disabled={st.alreadyGraded}
                >
                  {st.name} ({st.registration})
                  {st.alreadyGraded
                    ? ` — Nota já lançada (${formatDecimal(st.existingScore, 2)})`
                    : ''}
                </option>
              ))}
            </select>
            {createForm.formState.errors.studentId && (
              <p className="mt-1 text-xs text-red-600">
                {createForm.formState.errors.studentId.message}
              </p>
            )}
          </div>

          {/* Campo de Pontuação */}
          <div>
            <Label htmlFor="create-grade-score" required>
              Pontuação Obtida (0 a{' '}
              {formatDecimal(selectedActivityForCreate?.maxScore ?? 10, 2)})
            </Label>
            <Input
              id="create-grade-score"
              type="number"
              step="0.1"
              min={0}
              max={selectedActivityForCreate?.maxScore ?? 100}
              {...createForm.register('score')}
              error={createForm.formState.errors.score?.message}
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending}
            >
              Registrar Nota
            </Button>
          </div>
        </form>
      </Modal>

      {/* ====================================================================
          MODAL 2: EDITAR NOTA EXISTENTE (PUT /api/grades/:id)
         ==================================================================== */}
      <Modal
        isOpen={Boolean(editingGrade)}
        onClose={() => setEditingGrade(null)}
        title="Atualizar Nota de Avaliação"
        description="Altere a pontuação obtida respeitando o limite máximo configurado na atividade."
        maxWidthClass="max-w-lg"
      >
        {editingGrade && (
          <form
            onSubmit={updateForm.handleSubmit(onUpdateSubmit)}
            className="space-y-4"
            noValidate
          >
            {formError && (
              <Alert variant="error" title="Falha na atualização">
                {formError}
              </Alert>
            )}

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Estudante:</span>
                <strong className="text-[#0F172A]">
                  {editingGrade.studentName} ({editingGrade.studentRegistration})
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Atividade:</span>
                <strong className="text-[#0F172A]">
                  {editingGrade.activityTitle}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Turma / Disciplina:</span>
                <strong className="text-slate-700">
                  {editingGrade.className} • {editingGrade.subjectName}
                </strong>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Nota Máxima Permitida:</span>
                <Badge variant="primary">
                  {formatDecimal(editingGrade.maxScore, 2)} pontos
                </Badge>
              </div>
            </div>

            <div>
              <Label htmlFor="update-grade-score" required>
                Nova Pontuação (0 a {formatDecimal(editingGrade.maxScore, 2)})
              </Label>
              <Input
                id="update-grade-score"
                type="number"
                step="0.1"
                min={0}
                max={editingGrade.maxScore}
                {...updateForm.register('score')}
                error={updateForm.formState.errors.score?.message}
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingGrade(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={updateMutation.isPending}
              >
                Salvar Nova Nota
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ====================================================================
          MODAL 3: DETALHES DA AVALIAÇÃO (GET /api/grades/:id)
         ==================================================================== */}
      <Modal
        isOpen={Boolean(viewingGradeId)}
        onClose={() => setViewingGradeId(null)}
        title="Detalhes do Lançamento de Nota"
        description="Dados sincronizados diretamente de GET /api/grades/:id e GET /api/indicators/students/:id/average"
        maxWidthClass="max-w-lg"
      >
        {isDetailLoading && (
          <LoadingState label="Consultando registro individual da nota..." />
        )}

        {isDetailError && (
          <ErrorState
            title="Falha ao carregar detalhes da nota"
            message={getApiErrorMessage(
              detailError,
              'Não foi possível consultar este registro de avaliação.',
            )}
          />
        )}

        {!isDetailLoading && !isDetailError && gradeDetail && (
          <div className="space-y-4 text-xs sm:text-sm">
            {(() => {
              const enriched = enrichedGrades.find(
                (g) => g.id === gradeDetail.id,
              );
              const maxScore =
                gradeDetail.activity?.maxScore ?? enriched?.maxScore ?? 10;
              const isPassing = gradeDetail.score >= MIN_PASSING_AVERAGE;

              return (
                <>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 block">
                        Pontuação Registrada
                      </span>
                      <span className="text-2xl font-bold text-[#0F172A] tabular-nums">
                        {formatDecimal(gradeDetail.score, 2)}{' '}
                        <span className="text-sm font-normal text-slate-500">
                          / {formatDecimal(maxScore, 2)}
                        </span>
                      </span>
                    </div>
                    <Badge variant={isPassing ? 'success' : 'warning'}>
                      {isPassing
                        ? 'Acima da Referência'
                        : 'Atenção Pedagógica'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block mb-0.5">
                        Estudante
                      </span>
                      <p className="font-semibold text-[#0F172A]">
                        {gradeDetail.student?.name || enriched?.studentName}
                      </p>
                      <p className="text-slate-500 font-mono mt-0.5">
                        Matrícula:{' '}
                        {gradeDetail.student?.registration ||
                          enriched?.studentRegistration}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block mb-0.5">
                        Média Geral do Aluno (API)
                      </span>
                      <p className="font-bold text-[#0F172A] text-sm tabular-nums">
                        {detailStudentAverage
                          ? formatDecimal(detailStudentAverage.average, 2)
                          : '—'}
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        Corte institucional:{' '}
                        {formatDecimal(MIN_PASSING_AVERAGE, 1)}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 sm:col-span-2">
                      <span className="text-slate-500 block mb-0.5">
                        Atividade Avaliativa
                      </span>
                      <p className="font-semibold text-[#0F172A]">
                        {gradeDetail.activity?.title || enriched?.activityTitle}
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        Turma:{' '}
                        <strong>
                          {gradeDetail.activity?.class?.name ||
                            enriched?.className}
                        </strong>{' '}
                        • Disciplina:{' '}
                        <strong>{enriched?.subjectName || '—'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setViewingGradeId(null)}
                    >
                      Fechar
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* ====================================================================
          MODAL 4: CONFIRMAÇÃO DE EXCLUSÃO (DELETE /api/grades/:id)
         ==================================================================== */}
      <ConfirmDialog
        isOpen={Boolean(deletingGrade)}
        onClose={() => setDeletingGrade(null)}
        onConfirm={() => {
          if (deletingGrade) {
            deleteMutation.mutate(deletingGrade.id);
          }
        }}
        isLoading={deleteMutation.isPending}
        title="Excluir Lançamento de Nota"
        description={
          deletingGrade
            ? `Tem certeza de que deseja excluir a nota ${formatDecimal(deletingGrade.score, 2)} do estudante "${deletingGrade.studentName}" na atividade "${deletingGrade.activityTitle}"? A média do estudante será recalculada imediatamente.`
            : ''
        }
        confirmLabel="Confirmar Exclusão"
      />
    </div>
  );
};
