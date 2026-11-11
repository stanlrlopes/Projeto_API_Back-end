import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CalendarCheck,
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
  XCircle,
  AlertTriangle,
  Calendar,
  Users,
} from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import { classService } from '../../services/classService';
import { enrollmentService } from '../../services/enrollmentService';
import { studentService } from '../../services/studentService';
import { subjectService } from '../../services/subjectService';
import { getApiErrorMessage } from '../../services/api';
import {
  createAttendanceFormSchema,
  updateAttendanceFormSchema,
  CreateAttendanceFormInput,
  UpdateAttendanceFormInput,
} from '../../schemas';
import {
  Attendance,
  ClassEntity,
  Student,
} from '../../types/api.types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { formatDate, formatPercentage } from '../../utils/formatters';
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

type ViewMode = 'CONSOLIDATED_VIEW' | 'RECORDS_LIST' | 'DAILY_ROLL_CALL';
type PresenceFilter = 'ALL' | 'PRESENT' | 'ABSENT';
type StudentAttendanceFilter =
  | 'ALL'
  | 'WITH_ABSENCES'
  | 'BELOW_75'
  | 'PERFECT_100';
type SortOption = 'date-desc' | 'date-asc' | 'student-asc' | 'class-asc';

interface EnrichedAttendance extends Attendance {
  dateKey: string;
  studentName: string;
  studentRegistration: string;
  studentEmail: string;
  className: string;
  classPeriod: string;
  subjectId: string;
  subjectName: string;
  teacherName: string;
}

interface StudentAttendanceSummary {
  studentId: string;
  name: string;
  registration: string;
  email: string;
  totalClasses: number;
  present: number;
  absent: number;
  attendancePercentage: number;
  activeClassesCount: number;
}

interface ClassAttendanceSummary {
  classId: string;
  className: string;
  period: string;
  subjectId: string;
  subjectName: string;
  teacherName: string;
  activeStudentsCount: number;
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
}

function toUtcDateKey(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  const parsed =
    typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}

export const AttendancePage: React.FC = () => {
  const { role, studentId: loggedStudentId, user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const canWrite = role === 'ADMIN' || role === 'PROFESSOR';

  const todayIsoDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Abas principais
  const [viewMode, setViewMode] = useState<ViewMode>(
    role === 'ALUNO' ? 'CONSOLIDATED_VIEW' : 'RECORDS_LIST',
  );

  // Filtros e paginação da aba de Registros
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<string>('ALL');
  const [studentFilter, setStudentFilter] = useState<string>('ALL');
  const [presenceFilter, setPresenceFilter] = useState<PresenceFilter>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Estados da Visão Consolidada (Filtro de baixa frequência e aluno selecionado)
  const [studentSummaryFilter, setStudentSummaryFilter] =
    useState<StudentAttendanceFilter>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Estados do Diário de Chamada por Turma e Data (ADMIN / PROFESSOR)
  const [rollCallClassId, setRollCallClassId] = useState<string>('');
  const [rollCallDate, setRollCallDate] = useState<string>(todayIsoDate);

  // Estados de Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EnrichedAttendance | null>(
    null,
  );
  const [deletingRecord, setDeletingRecord] =
    useState<EnrichedAttendance | null>(null);
  const [viewingRecordId, setViewingRecordId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // ============================================================================
  // Consultas Reais à API (Respeitando RBAC e Isolamento Horizontal do Back-End)
  // ============================================================================

  const {
    data: allAttendances = [],
    isLoading: isAttendancesLoading,
    isError: isAttendancesError,
    error: attendancesError,
    refetch: refetchAttendances,
    isFetching: isAttendancesFetching,
  } = useQuery({
    queryKey: ['attendance', 'all'],
    queryFn: () => attendanceService.listAll(),
  });

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

  // Consulta individual de frequência por ID (GET /api/attendance/:id)
  const {
    data: attendanceDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
  } = useQuery({
    queryKey: ['attendance', 'detail', viewingRecordId],
    queryFn: () => attendanceService.getById(viewingRecordId!),
    enabled: Boolean(viewingRecordId),
  });

  // Determina o ID efetivo do estudante para consulta do indicador oficial (GET /api/indicators/students/:id/attendance)
  const effectiveStudentIdForIndicator = useMemo(() => {
    if (role === 'ALUNO') {
      return loggedStudentId || allStudents[0]?.id || '';
    }
    return selectedStudentId;
  }, [role, loggedStudentId, allStudents, selectedStudentId]);

  const {
    data: officialStudentAttendance,
    isLoading: isOfficialIndicatorLoading,
  } = useQuery({
    queryKey: [
      'indicators',
      'student-attendance',
      effectiveStudentIdForIndicator,
    ],
    queryFn: () =>
      attendanceService.getStudentAttendance(effectiveStudentIdForIndicator),
    enabled: Boolean(effectiveStudentIdForIndicator),
  });

  // Indicador oficial do aluno ao abrir modal de detalhes de um registro
  const detailStudentId = attendanceDetail?.studentId || '';
  const { data: detailStudentAttendance } = useQuery({
    queryKey: ['indicators', 'student-attendance', detailStudentId],
    queryFn: () => attendanceService.getStudentAttendance(detailStudentId),
    enabled: Boolean(detailStudentId),
  });

  // ============================================================================
  // Mapas de Enriquecimento Relacional
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

  const studentsMap = useMemo(() => {
    const map = new Map<string, Student>();
    allStudents.forEach((s) => map.set(s.id, s));
    allEnrollments.forEach((e) => {
      if (e.student) map.set(e.student.id, e.student);
    });
    allAttendances.forEach((a) => {
      if (a.student) map.set(a.student.id, a.student);
    });
    return map;
  }, [allStudents, allEnrollments, allAttendances]);

  // Lista de estudantes visíveis no escopo do perfil
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
      allAttendances.forEach((a) => {
        if (a.student) map.set(a.student.id, a.student);
      });
      return Array.from(map.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR'),
      );
    }
    return Array.from(studentsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    );
  }, [
    role,
    loggedStudentId,
    allStudents,
    allEnrollments,
    allAttendances,
    studentsMap,
  ]);

  useEffect(() => {
    if (role === 'ALUNO') {
      const ownId = loggedStudentId || allStudents[0]?.id || '';
      if (ownId && selectedStudentId !== ownId) {
        setSelectedStudentId(ownId);
      }
    } else if (!selectedStudentId && scopedStudents.length > 0) {
      setSelectedStudentId(scopedStudents[0].id);
    }
  }, [
    role,
    loggedStudentId,
    allStudents,
    scopedStudents,
    selectedStudentId,
  ]);

  useEffect(() => {
    if (!rollCallClassId && userVisibleClasses.length > 0) {
      setRollCallClassId(userVisibleClasses[0].id);
    }
  }, [rollCallClassId, userVisibleClasses]);

  // Registros de frequência enriquecidos
  const enrichedAttendances = useMemo<EnrichedAttendance[]>(() => {
    return allAttendances.map((att) => {
      const cls = classesMap.get(att.classId) || att.class;
      const subId = cls?.subjectId || '';
      const subName =
        cls?.subject?.name ||
        subjectsMap.get(subId) ||
        'Disciplina Curricular';
      const st = studentsMap.get(att.studentId) || att.student;

      return {
        ...att,
        dateKey: toUtcDateKey(att.date),
        studentName: st?.name || `Estudante ${att.studentId.slice(0, 6)}`,
        studentRegistration: st?.registration || '—',
        studentEmail: st?.email || '—',
        className: cls?.name || 'Turma vinculada',
        classPeriod: cls ? `${cls.year}/${cls.semester}º Sem` : '—',
        subjectId: subId,
        subjectName: subName,
        teacherName: cls?.teacher?.name || 'Docente responsável',
      };
    });
  }, [allAttendances, classesMap, subjectsMap, studentsMap]);

  // ============================================================================
  // Indicadores e Resumos Consolidados (Fórmula Oficial da API)
  // ============================================================================

  const activeEnrollments = useMemo(
    () => allEnrollments.filter((e) => e.status === 'ACTIVE'),
    [allEnrollments],
  );

  const totalPresentCount = useMemo(
    () => enrichedAttendances.filter((a) => a.present).length,
    [enrichedAttendances],
  );
  const totalAbsentCount =
    enrichedAttendances.length - totalPresentCount;

  // Mesma fórmula de IndicatorService.getStudentAttendance: (present / totalClasses) * 100 com 2 casas decimais
  const scopeAttendancePercentage = useMemo(() => {
    if (role === 'ALUNO' && officialStudentAttendance) {
      return officialStudentAttendance.attendancePercentage;
    }
    if (enrichedAttendances.length === 0) return 0;
    return Number(
      ((totalPresentCount / enrichedAttendances.length) * 100).toFixed(2),
    );
  }, [role, officialStudentAttendance, enrichedAttendances, totalPresentCount]);

  // Resumo por estudante (para identificação de baixa frequência e consulta individual)
  const studentSummaries = useMemo<StudentAttendanceSummary[]>(() => {
    return scopedStudents.map((st) => {
      const records = enrichedAttendances.filter(
        (a) => a.studentId === st.id,
      );
      const totalClasses = records.length;
      const present = records.filter((a) => a.present).length;
      const absent = totalClasses - present;
      const attendancePercentage =
        totalClasses === 0
          ? 0
          : Number(((present / totalClasses) * 100).toFixed(2));
      const activeClassesCount = activeEnrollments.filter(
        (e) => e.studentId === st.id,
      ).length;

      return {
        studentId: st.id,
        name: st.name,
        registration: st.registration,
        email: st.email,
        totalClasses,
        present,
        absent,
        attendancePercentage,
        activeClassesCount,
      };
    });
  }, [scopedStudents, enrichedAttendances, activeEnrollments]);

  const filteredStudentSummaries = useMemo(() => {
    return studentSummaries.filter((s) => {
      if (studentSummaryFilter === 'WITH_ABSENCES') return s.absent > 0;
      if (studentSummaryFilter === 'BELOW_75')
        return s.totalClasses > 0 && s.attendancePercentage < 75;
      if (studentSummaryFilter === 'PERFECT_100')
        return s.totalClasses > 0 && s.attendancePercentage === 100;
      return true;
    });
  }, [studentSummaries, studentSummaryFilter]);

  const studentsWithAbsencesCount = useMemo(
    () => studentSummaries.filter((s) => s.absent > 0).length,
    [studentSummaries],
  );

  // Resumo consolidado por Turma
  const classSummaries = useMemo<ClassAttendanceSummary[]>(() => {
    return userVisibleClasses.map((cls) => {
      const records = enrichedAttendances.filter((a) => a.classId === cls.id);
      const presentCount = records.filter((a) => a.present).length;
      const absentCount = records.length - presentCount;
      const attendancePercentage =
        records.length === 0
          ? 0
          : Number(((presentCount / records.length) * 100).toFixed(2));
      const activeStudentsCount = activeEnrollments.filter(
        (e) => e.classId === cls.id,
      ).length;

      return {
        classId: cls.id,
        className: cls.name,
        period: `${cls.year}/${cls.semester}º Sem`,
        subjectId: cls.subjectId,
        subjectName:
          cls.subject?.name ||
          subjectsMap.get(cls.subjectId) ||
          'Disciplina',
        teacherName: cls.teacher?.name || '—',
        activeStudentsCount,
        totalRecords: records.length,
        presentCount,
        absentCount,
        attendancePercentage,
      };
    });
  }, [userVisibleClasses, enrichedAttendances, activeEnrollments, subjectsMap]);

  // Histórico do estudante selecionado agrupado por Disciplina / Turma e Período
  const selectedStudentClassHistory = useMemo(() => {
    const targetStudentId = effectiveStudentIdForIndicator;
    if (!targetStudentId) return [];

    const studentEnrollments = allEnrollments.filter(
      (e) => e.studentId === targetStudentId,
    );
    const studentRecords = enrichedAttendances.filter(
      (a) => a.studentId === targetStudentId,
    );

    const relevantClassIds = new Set<string>();
    studentEnrollments.forEach((e) => {
      if (e.status === 'ACTIVE') relevantClassIds.add(e.classId);
    });
    studentRecords.forEach((r) => relevantClassIds.add(r.classId));
    if (role === 'ALUNO') {
      userVisibleClasses.forEach((c) => relevantClassIds.add(c.id));
    }

    return Array.from(relevantClassIds).map((clsId) => {
      const cls = classesMap.get(clsId);
      const subId = cls?.subjectId || '';
      const subjectName =
        cls?.subject?.name ||
        subjectsMap.get(subId) ||
        cls?.name ||
        'Disciplina';
      const className = cls?.name || 'Turma';
      const period = cls ? `${cls.year}/${cls.semester}º Sem` : '—';
      const teacherName = cls?.teacher?.name || '—';

      const calls = studentRecords
        .filter((r) => r.classId === clsId)
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

      const present = calls.filter((c) => c.present).length;
      const absent = calls.length - present;
      const percentage =
        calls.length === 0
          ? null
          : Number(((present / calls.length) * 100).toFixed(2));

      return {
        classId: clsId,
        className,
        period,
        subjectName,
        teacherName,
        calls,
        totalCalls: calls.length,
        present,
        absent,
        percentage,
      };
    });
  }, [
    effectiveStudentIdForIndicator,
    allEnrollments,
    enrichedAttendances,
    role,
    userVisibleClasses,
    classesMap,
    subjectsMap,
  ]);

  // ============================================================================
  // Formulários e Mutations (POST, PUT, DELETE /api/attendance)
  // ============================================================================

  const createForm = useForm<CreateAttendanceFormInput>({
    resolver: zodResolver(createAttendanceFormSchema),
    defaultValues: {
      classId: '',
      studentId: '',
      date: todayIsoDate,
      present: true,
    },
  });

  const updateForm = useForm<UpdateAttendanceFormInput>({
    resolver: zodResolver(updateAttendanceFormSchema),
    defaultValues: {
      present: true,
    },
  });

  const watchedCreateClassId = createForm.watch('classId');
  const watchedCreateDate = createForm.watch('date');

  // Estudantes com matrícula ACTIVE na turma selecionada no modal de criação
  const eligibleStudentsForCreate = useMemo(() => {
    if (!watchedCreateClassId) return [];
    const activeInClass = activeEnrollments.filter(
      (e) => e.classId === watchedCreateClassId,
    );
    const targetDateKey = toUtcDateKey(watchedCreateDate);

    return activeInClass.map((enr) => {
      const st = studentsMap.get(enr.studentId) || enr.student;
      const existingRecord = enrichedAttendances.find(
        (a) =>
          a.classId === watchedCreateClassId &&
          a.studentId === enr.studentId &&
          a.dateKey === targetDateKey,
      );
      return {
        studentId: enr.studentId,
        name: st?.name || `Estudante ${enr.studentId.slice(0, 6)}`,
        registration: st?.registration || '—',
        alreadyRecorded: Boolean(existingRecord),
        existingPresent: existingRecord?.present,
      };
    });
  }, [
    watchedCreateClassId,
    watchedCreateDate,
    activeEnrollments,
    studentsMap,
    enrichedAttendances,
  ]);

  // Lista do Diário de Chamada por Turma e Data
  const dailyRollCallRows = useMemo(() => {
    if (!rollCallClassId) return [];
    const activeInClass = activeEnrollments.filter(
      (e) => e.classId === rollCallClassId,
    );
    const targetDateKey = toUtcDateKey(rollCallDate);

    return activeInClass.map((enr) => {
      const st = studentsMap.get(enr.studentId) || enr.student;
      const existingRecord = enrichedAttendances.find(
        (a) =>
          a.classId === rollCallClassId &&
          a.studentId === enr.studentId &&
          a.dateKey === targetDateKey,
      );
      return {
        studentId: enr.studentId,
        name: st?.name || `Estudante ${enr.studentId.slice(0, 6)}`,
        registration: st?.registration || '—',
        existingRecord: existingRecord || null,
      };
    });
  }, [
    rollCallClassId,
    rollCallDate,
    activeEnrollments,
    studentsMap,
    enrichedAttendances,
  ]);

  const invalidateAttendanceQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['attendance'] }),
      queryClient.invalidateQueries({ queryKey: ['indicators'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateAttendanceFormInput) =>
      attendanceService.create(payload),
    onSuccess: async (_, variables) => {
      await invalidateAttendanceQueries();
      toast.success(
        variables.present ? 'Presença registrada' : 'Falta registrada',
        `Chamada lançada para ${formatDate(variables.date)} com sucesso.`,
      );
      setIsCreateOpen(false);
      setFormError(null);
    },
    onError: (err) => {
      const msg = getApiErrorMessage(
        err,
        'Não foi possível registrar a frequência.',
      );
      setFormError(msg);
      toast.error('Falha ao registrar chamada', msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateAttendanceFormInput;
    }) => attendanceService.update(id, payload),
    onSuccess: async (updated) => {
      await invalidateAttendanceQueries();
      toast.success(
        'Frequência atualizada',
        `O registro foi atualizado para ${updated.present ? 'PRESENTE' : 'FALTA'}.`,
      );
      setEditingRecord(null);
      setFormError(null);
    },
    onError: (err) => {
      const msg = getApiErrorMessage(
        err,
        'Não foi possível atualizar o registro de frequência.',
      );
      setFormError(msg);
      toast.error('Falha na atualização', msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => attendanceService.remove(id),
    onSuccess: async () => {
      await invalidateAttendanceQueries();
      toast.success(
        'Registro removido',
        'O lançamento de frequência foi excluído com sucesso.',
      );
      setDeletingRecord(null);
    },
    onError: (err) => {
      const msg = getApiErrorMessage(
        err,
        'Não foi possível excluir o registro de frequência.',
      );
      toast.error('Erro ao excluir frequência', msg);
      setDeletingRecord(null);
    },
  });

  const handleOpenCreateModal = (prefill?: {
    classId?: string;
    studentId?: string;
    date?: string;
    present?: boolean;
  }) => {
    setFormError(null);
    const defaultClassId =
      prefill?.classId || userVisibleClasses[0]?.id || '';
    createForm.reset({
      classId: defaultClassId,
      studentId: prefill?.studentId || '',
      date: prefill?.date || todayIsoDate,
      present: prefill?.present ?? true,
    });
    setIsCreateOpen(true);
  };

  const handleOpenEditModal = (record: EnrichedAttendance) => {
    setFormError(null);
    setEditingRecord(record);
    updateForm.reset({
      present: record.present,
    });
  };

  const onCreateSubmit = (values: CreateAttendanceFormInput) => {
    setFormError(null);
    const targetDateKey = toUtcDateKey(values.date);
    const duplicate = enrichedAttendances.find(
      (a) =>
        a.classId === values.classId &&
        a.studentId === values.studentId &&
        a.dateKey === targetDateKey,
    );

    if (duplicate) {
      setFormError(
        `Já existe um registro de frequência para este estudante nesta turma na data ${formatDate(values.date)}. Utilize a opção de edição para corrigir presença/falta.`,
      );
      return;
    }

    createMutation.mutate(values);
  };

  const onUpdateSubmit = (values: UpdateAttendanceFormInput) => {
    if (!editingRecord) return;
    setFormError(null);
    updateMutation.mutate({
      id: editingRecord.id,
      payload: { present: values.present },
    });
  };

  // ============================================================================
  // Filtragem, Ordenação e Paginação de Registros de Frequência
  // ============================================================================

  const availableSubjects = useMemo(() => {
    const map = new Map<string, string>();
    userVisibleClasses.forEach((c) => {
      const name = c.subject?.name || subjectsMap.get(c.subjectId);
      if (c.subjectId && name) map.set(c.subjectId, name);
    });
    enrichedAttendances.forEach((a) => {
      if (a.subjectId && a.subjectName) map.set(a.subjectId, a.subjectName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [userVisibleClasses, subjectsMap, enrichedAttendances]);

  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    userVisibleClasses.forEach((c) => set.add(`${c.year}/${c.semester}º Sem`));
    enrichedAttendances.forEach((a) => {
      if (a.classPeriod && a.classPeriod !== '—') set.add(a.classPeriod);
    });
    return Array.from(set).sort();
  }, [userVisibleClasses, enrichedAttendances]);

  const filteredAttendances = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = enrichedAttendances.filter((a) => {
      if (classFilter !== 'ALL' && a.classId !== classFilter) return false;
      if (subjectFilter !== 'ALL' && a.subjectId !== subjectFilter) return false;
      if (periodFilter !== 'ALL' && a.classPeriod !== periodFilter) return false;
      if (studentFilter !== 'ALL' && a.studentId !== studentFilter) return false;

      if (presenceFilter === 'PRESENT' && !a.present) return false;
      if (presenceFilter === 'ABSENT' && a.present) return false;

      if (dateFrom && a.dateKey < dateFrom) return false;
      if (dateTo && a.dateKey > dateTo) return false;

      if (!normalizedSearch) return true;

      return (
        a.studentName.toLowerCase().includes(normalizedSearch) ||
        a.studentRegistration.toLowerCase().includes(normalizedSearch) ||
        a.className.toLowerCase().includes(normalizedSearch) ||
        a.subjectName.toLowerCase().includes(normalizedSearch) ||
        a.classPeriod.toLowerCase().includes(normalizedSearch)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'date-asc') return a.dateKey.localeCompare(b.dateKey);
      if (sortBy === 'student-asc')
        return a.studentName.localeCompare(b.studentName, 'pt-BR');
      if (sortBy === 'class-asc')
        return a.className.localeCompare(b.className, 'pt-BR');
      return b.dateKey.localeCompare(a.dateKey);
    });
  }, [
    enrichedAttendances,
    searchTerm,
    classFilter,
    subjectFilter,
    periodFilter,
    studentFilter,
    presenceFilter,
    dateFrom,
    dateTo,
    sortBy,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAttendances.length / pageSize),
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedAttendances = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAttendances.slice(start, start + pageSize);
  }, [filteredAttendances, currentPage]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setClassFilter('ALL');
    setSubjectFilter('ALL');
    setPeriodFilter('ALL');
    setStudentFilter('ALL');
    setPresenceFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setSortBy('date-desc');
    setPage(1);
  };

  const isLoading =
    isAttendancesLoading || isClassesLoading || isEnrollmentsLoading;

  if (isLoading) {
    return (
      <LoadingState label="Carregando diários de frequência, turmas e indicadores de assiduidade..." />
    );
  }

  if (isAttendancesError) {
    return (
      <ErrorState
        title="Não foi possível carregar o módulo de Frequência Escolar"
        message={getApiErrorMessage(
          attendancesError,
          'Ocorreu um erro ao consultar os registros de frequência na API.',
        )}
        onRetry={() => void refetchAttendances()}
      />
    );
  }

  const selectedStudentObj = effectiveStudentIdForIndicator
    ? studentsMap.get(effectiveStudentIdForIndicator)
    : undefined;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Cabeçalho Institucional do Módulo */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">FASE 3.3.6 • FREQUÊNCIA ESCOLAR</Badge>
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
            <CalendarCheck className="w-6 h-6 text-[#2563EB] shrink-0" />
            <span>
              {role === 'ALUNO'
                ? 'Minha Frequência Escolar e Assiduidade'
                : 'Gestão de Frequência Escolar e Diário de Chamada'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
            {role === 'ADMIN' &&
              'Monitore a assiduidade institucional, filtre registros por turma, estudante e período e identifique alunos com faltas acumuladas.'}
            {role === 'PROFESSOR' &&
              'Registre presenças e faltas para alunos com matrícula ativa nas suas turmas, consulte o consolidado por turma e corrija lançamentos.'}
            {role === 'ALUNO' &&
              'Acompanhe exclusivamente suas presenças, faltas, percentual oficial de assiduidade e histórico por período e disciplina.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={isAttendancesFetching}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => void refetchAttendances()}
          >
            Atualizar
          </Button>

          {canWrite && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Users className="w-4 h-4" />}
                onClick={() => setViewMode('DAILY_ROLL_CALL')}
              >
                Diário de Chamada
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => handleOpenCreateModal()}
              >
                Registrar Frequência
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Aviso de Escopo e Regras da API */}
      <Alert
        variant={role === 'ALUNO' ? 'success' : 'info'}
        title={
          role === 'ADMIN'
            ? 'Controle de Assiduidade Institucional e Unicidade Diária'
            : role === 'PROFESSOR'
              ? 'Isolamento Docente Ativo — Chamada Restrita às Suas Turmas'
              : 'Sigilo Estudantil Ativo — Consulta Exclusiva da Sua Assiduidade'
        }
      >
        {role === 'ADMIN' && (
          <span>
            O cálculo de assiduidade segue estritamente a API (
            <code>GET /api/indicators/students/:id/attendance</code>: proporção{' '}
            <code>(presenças / total de chamadas) × 100</code>). O banco garante
            unicidade por <code>(studentId, classId, date)</code> e exige
            matrícula <code>ACTIVE</code>.
          </span>
        )}
        {role === 'PROFESSOR' && (
          <span>
            Você registra e edita chamadas exclusivamente nas turmas sob sua
            regência para estudantes com matrícula <code>ACTIVE</code>. Não é
            permitido duplicar chamadas para o mesmo aluno na mesma turma e data
            (<code>409 DUPLICATE_ATTENDANCE</code>).
          </span>
        )}
        {role === 'ALUNO' && (
          <span>
            Olá, <strong>{user?.name}</strong>! Seus registros de presença e
            falta são isolados no servidor e sincronizados com o indicador
            oficial <code>GET /api/indicators/students/:id/attendance</code>.
          </span>
        )}
      </Alert>

      {/* Cards de Indicadores de Assiduidade (KPIs) */}
      <section aria-label="Indicadores de Frequência Escolar">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <StatCard
            title={
              role === 'ALUNO'
                ? 'Minha Taxa de Assiduidade'
                : 'Taxa de Presença (Escopo)'
            }
            value={formatPercentage(scopeAttendancePercentage, 1)}
            subtitle={
              enrichedAttendances.length === 0
                ? 'Sem chamadas registradas'
                : `${totalPresentCount} presença(s) em ${enrichedAttendances.length} chamada(s)`
            }
            badgeText={
              enrichedAttendances.length === 0
                ? 'Sem registros'
                : scopeAttendancePercentage >= 75
                  ? 'Assiduidade Regular'
                  : 'Atenção'
            }
            tone={
              enrichedAttendances.length === 0
                ? 'neutral'
                : scopeAttendancePercentage >= 75
                  ? 'success'
                  : 'warning'
            }
            icon={<CalendarCheck className="w-5 h-5" />}
          />

          <StatCard
            title="Presenças Confirmadas"
            value={totalPresentCount}
            subtitle="Registros com present = true"
            badgeText="Presente"
            tone="success"
            icon={<CheckCircle2 className="w-5 h-5" />}
          />

          <StatCard
            title="Faltas Registradas"
            value={totalAbsentCount}
            subtitle="Registros com present = false"
            badgeText={totalAbsentCount > 0 ? 'Ausências' : 'Zero faltas'}
            tone={totalAbsentCount > 0 ? 'warning' : 'success'}
            icon={<XCircle className="w-5 h-5" />}
          />

          {role === 'ALUNO' ? (
            <StatCard
              title="Disciplinas com Chamada"
              value={selectedStudentClassHistory.length}
              subtitle="Turmas vinculadas no período"
              badgeText="Histórico"
              tone="primary"
              icon={<BookOpen className="w-5 h-5" />}
            />
          ) : (
            <StatCard
              title="Alunos com Faltas"
              value={studentsWithAbsencesCount}
              subtitle={`De ${studentSummaries.length} estudante(s) no escopo`}
              badgeText={
                studentsWithAbsencesCount > 0
                  ? 'Acompanhar assiduidade'
                  : '100% assíduos'
              }
              tone={studentsWithAbsencesCount > 0 ? 'warning' : 'success'}
              icon={<AlertTriangle className="w-5 h-5" />}
            />
          )}
        </div>
      </section>

      {/* Seletor de Abas de Visualização */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => setViewMode('CONSOLIDATED_VIEW')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            viewMode === 'CONSOLIDATED_VIEW'
              ? 'bg-[#2563EB] text-white shadow-2xs'
              : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-50'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>
            {role === 'ALUNO'
              ? 'Minha Assiduidade por Período e Disciplina'
              : 'Consolidado por Turma e Assiduidade por Aluno'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('RECORDS_LIST')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            viewMode === 'RECORDS_LIST'
              ? 'bg-[#2563EB] text-white shadow-2xs'
              : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-50'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>
            {role === 'ALUNO'
              ? 'Histórico Detalhado de Chamadas'
              : 'Registros por Turma, Aluno e Período'}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              viewMode === 'RECORDS_LIST'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {enrichedAttendances.length}
          </span>
        </button>

        {canWrite && (
          <button
            type="button"
            onClick={() => setViewMode('DAILY_ROLL_CALL')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              viewMode === 'DAILY_ROLL_CALL'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-slate-600 hover:text-[#0F172A] hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Diário de Chamada por Turma e Data</span>
          </button>
        )}
      </div>

      {/* ====================================================================
          VISÃO 1: CONSOLIDADO POR TURMA, BAIXA FREQUÊNCIA E HISTÓRICO DO ALUNO
         ==================================================================== */}
      {viewMode === 'CONSOLIDATED_VIEW' && (
        <div className="space-y-6">
          {/* Consolidado por Turma (Para ADMIN e PROFESSOR) */}
          {role !== 'ALUNO' && (
            <Card
              title="Frequência Consolidada por Turma e Período"
              subtitle="Acompanhe o total de chamadas, presenças, faltas e percentual de assiduidade de cada turma"
            >
              {classSummaries.length === 0 ? (
                <EmptyState
                  compact
                  title="Nenhuma turma encontrada no escopo"
                  description="Não há turmas cadastradas ou vinculadas ao seu perfil no momento."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classSummaries.map((cls) => (
                    <div
                      key={cls.classId}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <School className="w-4 h-4 text-[#2563EB]" />
                            <h3 className="text-sm font-bold text-[#0F172A]">
                              {cls.className} — {cls.subjectName}
                            </h3>
                            <Badge variant="neutral">{cls.period}</Badge>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Docente: <strong>{cls.teacherName}</strong> • Alunos
                            ativos: <strong>{cls.activeStudentsCount}</strong>
                          </p>
                        </div>

                        <Badge
                          variant={
                            cls.totalRecords === 0
                              ? 'neutral'
                              : cls.attendancePercentage >= 75
                                ? 'success'
                                : 'warning'
                          }
                        >
                          {formatPercentage(cls.attendancePercentage, 1)}
                        </Badge>
                      </div>

                      <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                        <div className="flex items-center gap-3">
                          <span>
                            Chamadas: <strong>{cls.totalRecords}</strong>
                          </span>
                          <span className="text-emerald-700 font-medium">
                            Presenças: {cls.presentCount}
                          </span>
                          <span className="text-amber-700 font-medium">
                            Faltas: {cls.absentCount}
                          </span>
                        </div>

                        {canWrite && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            leftIcon={<Calendar className="w-3.5 h-3.5" />}
                            onClick={() => {
                              setRollCallClassId(cls.classId);
                              setViewMode('DAILY_ROLL_CALL');
                            }}
                          >
                            Abrir Chamada
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Painel de Monitoramento por Estudante e Identificação de Baixa Frequência (ADMIN e PROFESSOR) */}
          {role !== 'ALUNO' && (
            <Card
              title="Assiduidade Individual por Estudante e Identificação de Faltas"
              subtitle="Filtre estudantes com faltas ou baixa frequência e clique em um aluno para inspecionar seu histórico por disciplina"
              action={
                <select
                  aria-label="Filtrar estudantes por assiduidade"
                  value={studentSummaryFilter}
                  onChange={(e) =>
                    setStudentSummaryFilter(
                      e.target.value as StudentAttendanceFilter,
                    )
                  }
                  className="h-9 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="ALL">
                    Todos os estudantes ({studentSummaries.length})
                  </option>
                  <option value="WITH_ABSENCES">
                    Com faltas registradas (
                    {studentSummaries.filter((s) => s.absent > 0).length})
                  </option>
                  <option value="BELOW_75">
                    Baixa frequência (&lt; 75%) (
                    {
                      studentSummaries.filter(
                        (s) =>
                          s.totalClasses > 0 && s.attendancePercentage < 75,
                      ).length
                    }
                    )
                  </option>
                  <option value="PERFECT_100">
                    100% de presença (
                    {
                      studentSummaries.filter(
                        (s) =>
                          s.totalClasses > 0 && s.attendancePercentage === 100,
                      ).length
                    }
                    )
                  </option>
                </select>
              }
            >
              {filteredStudentSummaries.length === 0 ? (
                <EmptyState
                  compact
                  title="Nenhum estudante encontrado para este filtro"
                  description="Não há alunos que se enquadrem no critério de assiduidade selecionado."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStudentSummaries.map((st) => {
                    const isSelected =
                      st.studentId === effectiveStudentIdForIndicator;

                    return (
                      <div
                        key={st.studentId}
                        onClick={() => setSelectedStudentId(st.studentId)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedStudentId(st.studentId);
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
                              st.totalClasses === 0
                                ? 'neutral'
                                : st.attendancePercentage >= 75
                                  ? 'success'
                                  : 'warning'
                            }
                          >
                            {formatPercentage(st.attendancePercentage, 1)}
                          </Badge>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                          <span className="text-emerald-700 font-medium">
                            {st.present} presença(s)
                          </span>
                          <span
                            className={
                              st.absent > 0
                                ? 'text-amber-700 font-semibold'
                                : 'text-slate-500'
                            }
                          >
                            {st.absent} falta(s)
                          </span>
                          <span>{st.totalClasses} aula(s)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Indicador Oficial da API + Histórico por Período e Disciplina do Estudante Selecionado */}
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
                        Ficha de Assiduidade — {selectedStudentObj.name}
                      </h2>
                      <Badge variant="neutral">
                        Matrícula: {selectedStudentObj.registration}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Indicador Oficial API (
                      <code>/indicators/students/:id/attendance</code>):{' '}
                      {isOfficialIndicatorLoading ? (
                        <strong>Calculando...</strong>
                      ) : officialStudentAttendance ? (
                        <span>
                          <strong>
                            {formatPercentage(
                              officialStudentAttendance.attendancePercentage,
                              2,
                            )}
                          </strong>{' '}
                          ({officialStudentAttendance.present} presença(s),{' '}
                          {officialStudentAttendance.absent} falta(s) em{' '}
                          {officialStudentAttendance.totalClasses} aula(s))
                        </span>
                      ) : (
                        <span>Sem registros</span>
                      )}
                    </p>
                  </div>
                </div>

                {officialStudentAttendance && (
                  <Badge
                    variant={
                      officialStudentAttendance.totalClasses === 0 ||
                      officialStudentAttendance.attendancePercentage >= 75
                        ? 'success'
                        : 'warning'
                    }
                  >
                    {officialStudentAttendance.absent === 0
                      ? 'Sem faltas registradas'
                      : `${officialStudentAttendance.absent} falta(s) registrada(s)`}
                  </Badge>
                )}
              </div>
            </Card>
          )}

          {/* Histórico Detalhado por Disciplina, Turma e Período */}
          {selectedStudentClassHistory.length === 0 ? (
            <Card>
              <EmptyState
                icon={<CalendarCheck className="w-6 h-6 text-[#2563EB]" />}
                title="Nenhum histórico de frequência encontrado"
                description="Este estudante ainda não possui turmas ativas ou registros de chamada lançados."
              />
            </Card>
          ) : (
            <div className="space-y-5">
              {selectedStudentClassHistory.map((section) => (
                <Card
                  key={section.classId}
                  title={`${section.subjectName} — ${section.className}`}
                  subtitle={`Período: ${section.period} • Docente: ${section.teacherName} • Total de chamadas: ${section.totalCalls}`}
                  action={
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="success">
                        {section.present} presença(s)
                      </Badge>
                      <Badge
                        variant={section.absent > 0 ? 'warning' : 'neutral'}
                      >
                        {section.absent} falta(s)
                      </Badge>
                      {section.percentage !== null && (
                        <Badge
                          variant={
                            section.percentage >= 75 ? 'primary' : 'warning'
                          }
                        >
                          Assiduidade: {formatPercentage(section.percentage, 1)}
                        </Badge>
                      )}
                    </div>
                  }
                >
                  {section.calls.length === 0 ? (
                    <EmptyState
                      compact
                      title="Nenhuma chamada registrada nesta disciplina"
                      description="Não há lançamentos de presença ou falta para esta turma até o momento."
                    />
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {section.calls.map((call) => (
                        <div
                          key={call.id}
                          className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                        >
                          <div className="flex items-center gap-3">
                            {call.present ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                            <div>
                              <p className="text-sm font-semibold text-[#0F172A]">
                                Aula de {formatDate(call.date)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {section.subjectName} ({section.period})
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant={call.present ? 'success' : 'danger'}
                            >
                              {call.present ? 'PRESENTE' : 'FALTA'}
                            </Badge>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingRecordId(call.id)}
                              title="Ver detalhes do registro"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {canWrite && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                leftIcon={<Pencil className="w-3.5 h-3.5" />}
                                onClick={() => handleOpenEditModal(call)}
                              >
                                Corrigir
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          VISÃO 2: TABELA E FILTROS DE REGISTROS DE CHAMADA
         ==================================================================== */}
      {viewMode === 'RECORDS_LIST' && (
        <div className="space-y-6">
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
                    placeholder="Buscar por aluno, matrícula, turma, disciplina ou período..."
                  />
                </div>

                <div className="md:col-span-4">
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
                        {cls.name} ({cls.year}/{cls.semester}º Sem)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <select
                    aria-label="Filtrar por situação de presença"
                    value={presenceFilter}
                    onChange={(e) => {
                      setPresenceFilter(e.target.value as PresenceFilter);
                      setPage(1);
                    }}
                    className="w-full h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="ALL">Presenças e faltas</option>
                    <option value="PRESENT">Somente presenças</option>
                    <option value="ABSENT">Somente faltas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
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

                <div>
                  <select
                    aria-label="Filtrar por período letivo"
                    value={periodFilter}
                    onChange={(e) => {
                      setPeriodFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="ALL">Todos os períodos</option>
                    {availablePeriods.map((per) => (
                      <option key={per} value={per}>
                        Período {per}
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

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    aria-label="Data inicial"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-10 px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    title="Data inicial"
                  />
                  <input
                    type="date"
                    aria-label="Data final"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-10 px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    title="Data final"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    aria-label="Ordenar registros de frequência"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="flex-1 h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value="date-desc">Data (mais recente)</option>
                    <option value="date-asc">Data (mais antiga)</option>
                    <option value="student-asc">Estudante (A-Z)</option>
                    <option value="class-asc">Turma (A-Z)</option>
                  </select>

                  {(searchTerm ||
                    classFilter !== 'ALL' ||
                    subjectFilter !== 'ALL' ||
                    periodFilter !== 'ALL' ||
                    studentFilter !== 'ALL' ||
                    presenceFilter !== 'ALL' ||
                    dateFrom ||
                    dateTo) && (
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

          <Card
            title="Registros de Frequência Escolar"
            subtitle={`Exibindo ${filteredAttendances.length} de ${enrichedAttendances.length} registro(s) no escopo`}
          >
            {filteredAttendances.length === 0 ? (
              <EmptyState
                icon={<CalendarCheck className="w-6 h-6 text-[#2563EB]" />}
                title="Nenhum registro de frequência encontrado"
                description={
                  enrichedAttendances.length === 0
                    ? 'Ainda não existem chamadas lançadas neste escopo.'
                    : 'Nenhum registro corresponde aos filtros selecionados.'
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
                      Registrar Primeira Chamada
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                {/* Tabela Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Data da Aula</th>
                        <th className="py-3 px-4">Estudante</th>
                        <th className="py-3 px-4">Disciplina / Turma</th>
                        <th className="py-3 px-4">Período</th>
                        <th className="py-3 px-4 text-center">Situação</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {paginatedAttendances.map((record) => (
                        <tr
                          key={record.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-semibold text-[#0F172A] tabular-nums">
                            {formatDate(record.date)}
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-[#0F172A]">
                              {record.studentName}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">
                              {record.studentRegistration}
                            </p>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-medium text-slate-800">
                              {record.subjectName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {record.className} • Prof(a). {record.teacherName}
                            </p>
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge variant="neutral">
                              {record.classPeriod}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <Badge
                              variant={record.present ? 'success' : 'danger'}
                            >
                              {record.present ? 'PRESENTE' : 'FALTA'}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingRecordId(record.id)}
                                title="Consultar detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              {canWrite && (
                                <>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEditModal(record)}
                                    title="Corrigir presença ou falta"
                                  >
                                    <Pencil className="w-4 h-4 text-[#2563EB]" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingRecord(record)}
                                    title="Excluir registro"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cards Mobile */}
                <div className="md:hidden space-y-3">
                  {paginatedAttendances.map((record) => (
                    <div
                      key={record.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#0F172A] truncate">
                            {record.studentName}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">
                            Matrícula: {record.studentRegistration}
                          </p>
                        </div>
                        <Badge variant={record.present ? 'success' : 'danger'}>
                          {record.present ? 'PRESENTE' : 'FALTA'}
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <p>
                          <strong>Data da Aula:</strong>{' '}
                          {formatDate(record.date)}
                        </p>
                        <p>
                          <strong>Disciplina / Turma:</strong>{' '}
                          {record.subjectName} • {record.className} (
                          {record.classPeriod})
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => setViewingRecordId(record.id)}
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
                              onClick={() => handleOpenEditModal(record)}
                            >
                              Corrigir
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                              onClick={() => setDeletingRecord(record)}
                            >
                              Excluir
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      page={currentPage}
                      totalPages={totalPages}
                      total={filteredAttendances.length}
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
          VISÃO 3: DIÁRIO DE CHAMADA POR TURMA E DATA (ADMIN / PROFESSOR)
         ==================================================================== */}
      {viewMode === 'DAILY_ROLL_CALL' && canWrite && (
        <div className="space-y-6">
          <Card
            title="Diário de Chamada por Turma e Data"
            subtitle="Selecione a turma e a data da aula para registrar presença ou falta dos alunos com matrícula ativa"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor="rollcall-class-select" required>
                  Turma Letiva
                </Label>
                <select
                  id="rollcall-class-select"
                  value={rollCallClassId}
                  onChange={(e) => setRollCallClassId(e.target.value)}
                  className="mt-1 w-full h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  {userVisibleClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} —{' '}
                      {cls.subject?.name || subjectsMap.get(cls.subjectId)} (
                      {cls.year}/{cls.semester}º Sem)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="rollcall-date-input" required>
                  Data da Chamada
                </Label>
                <Input
                  id="rollcall-date-input"
                  type="date"
                  value={rollCallDate}
                  onChange={(e) => setRollCallDate(e.target.value)}
                />
              </div>
            </div>

            {dailyRollCallRows.length === 0 ? (
              <EmptyState
                compact
                title="Nenhum estudante com matrícula ativa nesta turma"
                description="Apenas alunos com matrícula ACTIVE podem receber registro de presença ou falta."
              />
            ) : (
              <div className="divide-y divide-slate-200 border-t border-slate-200">
                {dailyRollCallRows.map((row) => {
                  const existing = row.existingRecord;

                  return (
                    <div
                      key={row.studentId}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#0F172A]">
                          {row.name}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          Matrícula: {row.registration}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {existing ? (
                          <>
                            <Badge
                              variant={existing.present ? 'success' : 'danger'}
                            >
                              Registrado na data ({formatDate(rollCallDate)}):{' '}
                              {existing.present ? 'PRESENTE' : 'FALTA'}
                            </Badge>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              isLoading={updateMutation.isPending}
                              leftIcon={<Pencil className="w-3.5 h-3.5" />}
                              onClick={() =>
                                updateMutation.mutate({
                                  id: existing.id,
                                  payload: { present: !existing.present },
                                })
                              }
                            >
                              Alternar para{' '}
                              {existing.present ? 'Falta' : 'Presente'}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              isLoading={createMutation.isPending}
                              leftIcon={
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              }
                              onClick={() =>
                                createMutation.mutate({
                                  classId: rollCallClassId,
                                  studentId: row.studentId,
                                  date: rollCallDate,
                                  present: true,
                                })
                              }
                            >
                              Marcar Presente
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              isLoading={createMutation.isPending}
                              leftIcon={<XCircle className="w-3.5 h-3.5" />}
                              onClick={() =>
                                createMutation.mutate({
                                  classId: rollCallClassId,
                                  studentId: row.studentId,
                                  date: rollCallDate,
                                  present: false,
                                })
                              }
                            >
                              Marcar Falta
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ====================================================================
          MODAL 1: REGISTRAR FREQUÊNCIA INDIVIDUAL (POST /api/attendance)
         ==================================================================== */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Registrar Frequência Escolar"
        description="Selecione a turma, o estudante com matrícula ativa, a data da aula e a situação de presença."
        maxWidthClass="max-w-xl"
      >
        <form
          onSubmit={createForm.handleSubmit(onCreateSubmit)}
          className="space-y-4"
          noValidate
        >
          {formError && (
            <Alert variant="error" title="Não foi possível registrar a chamada">
              {formError}
            </Alert>
          )}

          <div>
            <Label htmlFor="create-attendance-class" required>
              Turma Letiva
            </Label>
            <select
              id="create-attendance-class"
              {...createForm.register('classId', {
                onChange: () => {
                  createForm.setValue('studentId', '');
                },
              })}
              className="mt-1 w-full h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="">Selecione uma turma...</option>
              {userVisibleClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} —{' '}
                  {cls.subject?.name || subjectsMap.get(cls.subjectId)} (
                  {cls.year}/{cls.semester}º Sem)
                </option>
              ))}
            </select>
            {createForm.formState.errors.classId && (
              <p className="mt-1 text-xs text-red-600">
                {createForm.formState.errors.classId.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="create-attendance-date" required>
              Data da Aula
            </Label>
            <Input
              id="create-attendance-date"
              type="date"
              {...createForm.register('date')}
              error={createForm.formState.errors.date?.message}
            />
          </div>

          <div>
            <Label htmlFor="create-attendance-student" required>
              Estudante Matriculado (Status ACTIVE na Turma)
            </Label>
            <select
              id="create-attendance-student"
              disabled={!watchedCreateClassId}
              {...createForm.register('studentId')}
              className="mt-1 w-full h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:bg-slate-100"
            >
              <option value="">
                {!watchedCreateClassId
                  ? 'Selecione primeiro uma turma...'
                  : eligibleStudentsForCreate.length === 0
                    ? 'Nenhum estudante com matrícula ativa nesta turma'
                    : 'Selecione o estudante...'}
              </option>
              {eligibleStudentsForCreate.map((st) => (
                <option
                  key={st.studentId}
                  value={st.studentId}
                  disabled={st.alreadyRecorded}
                >
                  {st.name} ({st.registration})
                  {st.alreadyRecorded
                    ? ` — Já possui chamada nesta data (${st.existingPresent ? 'PRESENTE' : 'FALTA'})`
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

          <div>
            <Label required>Situação na Chamada</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => createForm.setValue('present', true)}
                className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  createForm.watch('present')
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600/15'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Presente</span>
              </button>

              <button
                type="button"
                onClick={() => createForm.setValue('present', false)}
                className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  !createForm.watch('present')
                    ? 'border-red-600 bg-red-50 text-red-800 ring-2 ring-red-600/15'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-red-600" />
                <span>Falta</span>
              </button>
            </div>
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
              Salvar Chamada
            </Button>
          </div>
        </form>
      </Modal>

      {/* ====================================================================
          MODAL 2: CORRIGIR REGISTRO DE FREQUÊNCIA (PUT /api/attendance/:id)
         ==================================================================== */}
      <Modal
        isOpen={Boolean(editingRecord)}
        onClose={() => setEditingRecord(null)}
        title="Corrigir Registro de Frequência"
        description="Atualize a situação de presença ou falta para esta aula."
        maxWidthClass="max-w-lg"
      >
        {editingRecord && (
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
                  {editingRecord.studentName} (
                  {editingRecord.studentRegistration})
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Turma / Disciplina:</span>
                <strong className="text-[#0F172A]">
                  {editingRecord.className} • {editingRecord.subjectName}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Data da Aula:</span>
                <Badge variant="neutral">
                  {formatDate(editingRecord.date)}
                </Badge>
              </div>
            </div>

            <div>
              <Label required>Nova Situação na Chamada</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateForm.setValue('present', true)}
                  className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    updateForm.watch('present')
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600/15'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Presente</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateForm.setValue('present', false)}
                  className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    !updateForm.watch('present')
                      ? 'border-red-600 bg-red-50 text-red-800 ring-2 ring-red-600/15'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>Falta</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingRecord(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={updateMutation.isPending}
              >
                Confirmar Alteração
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ====================================================================
          MODAL 3: DETALHES DO REGISTRO (GET /api/attendance/:id)
         ==================================================================== */}
      <Modal
        isOpen={Boolean(viewingRecordId)}
        onClose={() => setViewingRecordId(null)}
        title="Detalhes do Registro de Frequência"
        description="Dados sincronizados diretamente de GET /api/attendance/:id e GET /api/indicators/students/:id/attendance"
        maxWidthClass="max-w-lg"
      >
        {isDetailLoading && (
          <LoadingState label="Consultando registro individual de frequência..." />
        )}

        {isDetailError && (
          <ErrorState
            title="Falha ao carregar detalhes da chamada"
            message={getApiErrorMessage(
              detailError,
              'Não foi possível consultar este registro de frequência.',
            )}
          />
        )}

        {!isDetailLoading && !isDetailError && attendanceDetail && (
          <div className="space-y-4 text-xs sm:text-sm">
            {(() => {
              const enriched = enrichedAttendances.find(
                (a) => a.id === attendanceDetail.id,
              );

              return (
                <>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 block">
                        Data da Aula
                      </span>
                      <span className="text-xl font-bold text-[#0F172A] tabular-nums">
                        {formatDate(attendanceDetail.date)}
                      </span>
                    </div>
                    <Badge
                      variant={attendanceDetail.present ? 'success' : 'danger'}
                    >
                      {attendanceDetail.present ? 'PRESENTE' : 'FALTA'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block mb-0.5">
                        Estudante
                      </span>
                      <p className="font-semibold text-[#0F172A]">
                        {attendanceDetail.student?.name ||
                          enriched?.studentName}
                      </p>
                      <p className="text-slate-500 font-mono mt-0.5">
                        Matrícula:{' '}
                        {attendanceDetail.student?.registration ||
                          enriched?.studentRegistration}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block mb-0.5">
                        Assiduidade Geral do Aluno (API)
                      </span>
                      <p className="font-bold text-[#0F172A] text-sm tabular-nums">
                        {detailStudentAttendance
                          ? formatPercentage(
                              detailStudentAttendance.attendancePercentage,
                              2,
                            )
                          : '—'}
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        {detailStudentAttendance
                          ? `${detailStudentAttendance.present} presença(s) / ${detailStudentAttendance.absent} falta(s)`
                          : ''}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 sm:col-span-2">
                      <span className="text-slate-500 block mb-0.5">
                        Turma e Disciplina
                      </span>
                      <p className="font-semibold text-[#0F172A]">
                        {attendanceDetail.class?.name || enriched?.className} (
                        {enriched?.classPeriod || '—'})
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        Disciplina:{' '}
                        <strong>{enriched?.subjectName || '—'}</strong> •
                        Docente:{' '}
                        <strong>
                          {attendanceDetail.class?.teacher?.name ||
                            enriched?.teacherName}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setViewingRecordId(null)}
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
          MODAL 4: CONFIRMAÇÃO DE EXCLUSÃO (DELETE /api/attendance/:id)
         ==================================================================== */}
      <ConfirmDialog
        isOpen={Boolean(deletingRecord)}
        onClose={() => setDeletingRecord(null)}
        onConfirm={() => {
          if (deletingRecord) {
            deleteMutation.mutate(deletingRecord.id);
          }
        }}
        isLoading={deleteMutation.isPending}
        title="Excluir Registro de Frequência"
        description={
          deletingRecord
            ? `Tem certeza de que deseja excluir o registro de ${deletingRecord.present ? 'PRESENÇA' : 'FALTA'} do estudante "${deletingRecord.studentName}" na turma "${deletingRecord.className}" em ${formatDate(deletingRecord.date)}? O percentual de assiduidade será recalculado imediatamente.`
            : ''
        }
        confirmLabel="Confirmar Exclusão"
      />
    </div>
  );
};
