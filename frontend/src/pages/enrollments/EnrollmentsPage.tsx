import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ClipboardList,
  Plus,
  Eye,
  Pencil,
  Trash2,
  GraduationCap,
  School,
  CheckCircle2,
  Clock,
  RefreshCw,
  Filter,
  History,
  UserCheck,
} from 'lucide-react';
import { enrollmentService } from '../../services/enrollmentService';
import { studentService } from '../../services/studentService';
import { classService } from '../../services/classService';
import { getApiErrorMessage } from '../../services/api';
import {
  createEnrollmentFormSchema,
  updateEnrollmentStatusFormSchema,
  CreateEnrollmentFormInput,
  UpdateEnrollmentStatusFormInput,
} from '../../schemas';
import { Enrollment, EnrollmentStatus } from '../../types/api.types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/formatters';
import {
  Card,
  Badge,
  Button,
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

type StatusFilter = 'ALL' | EnrollmentStatus;
type SortOption = 'date-desc' | 'student-asc' | 'class-asc';

const STATUS_CONFIG: Record<
  EnrollmentStatus,
  {
    label: string;
    description: string;
    variant: 'success' | 'warning' | 'danger' | 'info';
  }
> = {
  ACTIVE: {
    label: 'Ativa (ACTIVE)',
    description:
      'Vínculo regular ativo. Permite lançamento de notas e frequência para o aluno na turma.',
    variant: 'success',
  },
  INACTIVE: {
    label: 'Inativa (INACTIVE)',
    description:
      'Matrícula temporariamente suspensa ou trancada. Bloqueia novos lançamentos até reativação.',
    variant: 'warning',
  },
  CANCELLED: {
    label: 'Cancelada (CANCELLED)',
    description:
      'Vínculo cancelado administrativamente. Pode ser reativado via alteração de status.',
    variant: 'danger',
  },
  COMPLETED: {
    label: 'Concluída (COMPLETED)',
    description:
      'Ciclo letivo encerrado com aprovação/conclusão da turma pelo estudante.',
    variant: 'info',
  },
};

export const EnrollmentsPage: React.FC = () => {
  const { role } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === 'ADMIN';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Estados de Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] =
    useState<Enrollment | null>(null);
  const [deletingEnrollment, setDeletingEnrollment] =
    useState<Enrollment | null>(null);
  const [viewingEnrollmentId, setViewingEnrollmentId] = useState<string | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  // Listagem completa de matrículas visíveis ao perfil (GET /api/enrollments)
  const {
    data: allEnrollments = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['enrollments', 'all'],
    queryFn: () => enrollmentService.listAll(),
  });

  // Consulta individual de matrícula (GET /api/enrollments/:id)
  const {
    data: enrollmentDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
  } = useQuery({
    queryKey: ['enrollments', 'detail', viewingEnrollmentId],
    queryFn: () => enrollmentService.getById(viewingEnrollmentId!),
    enabled: Boolean(viewingEnrollmentId),
  });

  // Listas de alunos e turmas reutilizadas para o formulário de criação de matrícula (ADMIN)
  const { data: students = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ['students', 'all'],
    queryFn: () => studentService.listAll(),
    enabled: isAdmin && isCreateOpen,
  });

  const { data: classes = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ['classes', 'all'],
    queryFn: () => classService.listAll(),
    enabled: isAdmin && isCreateOpen,
  });

  // Formulário de Criação
  const createForm = useForm<CreateEnrollmentFormInput>({
    resolver: zodResolver(createEnrollmentFormSchema),
    defaultValues: {
      studentId: '',
      classId: '',
      status: 'ACTIVE',
    },
  });

  // Formulário de Alteração de Status
  const updateStatusForm = useForm<UpdateEnrollmentStatusFormInput>({
    resolver: zodResolver(updateEnrollmentStatusFormSchema),
    defaultValues: {
      status: 'ACTIVE',
    },
  });

  const selectedStudentId = createForm.watch('studentId');
  const selectedClassId = createForm.watch('classId');

  // Pré-visualização de vínculo e verificação preventiva de duplicidade (studentId + classId)
  const selectedStudentPreview = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId],
  );
  const selectedClassPreview = useMemo(
    () => classes.find((c) => c.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );
  const existingDuplicateEnrollment = useMemo(() => {
    if (!selectedStudentId || !selectedClassId) return null;
    return (
      allEnrollments.find(
        (e) =>
          e.studentId === selectedStudentId && e.classId === selectedClassId,
      ) ?? null
    );
  }, [allEnrollments, selectedStudentId, selectedClassId]);

  // Mutação: Criar Matrícula (POST /api/enrollments)
  const createMutation = useMutation({
    mutationFn: (input: CreateEnrollmentFormInput) =>
      enrollmentService.create({
        studentId: input.studentId,
        classId: input.classId,
        status: input.status,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      void queryClient.invalidateQueries({ queryKey: ['classes'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Matrícula realizada com sucesso!',
        'O estudante foi vinculado à turma letiva selecionada.',
      );
      setIsCreateOpen(false);
      createForm.reset({ studentId: '', classId: '', status: 'ACTIVE' });
      setFormError(null);
    },
    onError: (err) => {
      setFormError(
        getApiErrorMessage(err, 'Não foi possível registrar a matrícula.'),
      );
    },
  });

  // Mutação: Alterar Status da Matrícula (PUT /api/enrollments/:id)
  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateEnrollmentStatusFormInput;
    }) => enrollmentService.update(id, { status: input.status }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      void queryClient.invalidateQueries({ queryKey: ['classes'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Situação da matrícula atualizada!',
        `Novo status: ${STATUS_CONFIG[updated.status]?.label || updated.status}.`,
      );
      setEditingEnrollment(null);
      setFormError(null);
    },
    onError: (err) => {
      setFormError(
        getApiErrorMessage(
          err,
          'Não foi possível atualizar o status da matrícula.',
        ),
      );
    },
  });

  // Mutação: Excluir Matrícula (DELETE /api/enrollments/:id)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => enrollmentService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      void queryClient.invalidateQueries({ queryKey: ['classes'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Matrícula excluída',
        'O vínculo de matrícula foi removido do sistema.',
      );
      setDeletingEnrollment(null);
    },
    onError: (err) => {
      toast.error(
        'Não foi possível excluir a matrícula',
        getApiErrorMessage(err, 'Erro ao excluir o registro de matrícula.'),
      );
      setDeletingEnrollment(null);
    },
  });

  // Opções dinâmicas de turmas presentes nas matrículas carregadas
  const availableClassesInFilter = useMemo(() => {
    const map = new Map<string, string>();
    allEnrollments.forEach((enr) => {
      const label = enr.class
        ? `${enr.class.name} (${enr.class.year}/${enr.class.semester}º Sem)`
        : `Turma ${enr.classId.slice(0, 8)}...`;
      map.set(enr.classId, label);
    });
    return Array.from(map.entries());
  }, [allEnrollments]);

  // Filtragem e Ordenação Client-Side
  const filteredAndSortedEnrollments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = allEnrollments.filter((enr) => {
      if (statusFilter !== 'ALL' && enr.status !== statusFilter) return false;
      if (classFilter !== 'ALL' && enr.classId !== classFilter) return false;
      if (!normalizedSearch) return true;

      const matchStudentName = enr.student?.name
        ?.toLowerCase()
        .includes(normalizedSearch);
      const matchStudentReg = enr.student?.registration
        ?.toLowerCase()
        .includes(normalizedSearch);
      const matchStudentEmail = enr.student?.email
        ?.toLowerCase()
        .includes(normalizedSearch);
      const matchClassName = enr.class?.name
        ?.toLowerCase()
        .includes(normalizedSearch);
      const matchSubjectName = enr.class?.subject?.name
        ?.toLowerCase()
        .includes(normalizedSearch);
      const matchTeacherName = enr.class?.teacher?.name
        ?.toLowerCase()
        .includes(normalizedSearch);

      return Boolean(
        matchStudentName ||
          matchStudentReg ||
          matchStudentEmail ||
          matchClassName ||
          matchSubjectName ||
          matchTeacherName,
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'student-asc') {
        return (a.student?.name || '').localeCompare(
          b.student?.name || '',
          'pt-BR',
        );
      }
      if (sortBy === 'class-asc') {
        return (a.class?.name || '').localeCompare(
          b.class?.name || '',
          'pt-BR',
        );
      }
      const timeA = a.enrollmentDate ? new Date(a.enrollmentDate).getTime() : 0;
      const timeB = b.enrollmentDate ? new Date(b.enrollmentDate).getTime() : 0;
      return timeB - timeA;
    });
  }, [allEnrollments, searchTerm, statusFilter, classFilter, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedEnrollments.length / pageSize),
  );
  const safePage = Math.min(page, totalPages);
  const paginatedEnrollments = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSortedEnrollments.slice(start, start + pageSize);
  }, [filteredAndSortedEnrollments, safePage]);

  // Métricas resumidas reais das matrículas carregadas
  const metrics = useMemo(() => {
    const active = allEnrollments.filter((e) => e.status === 'ACTIVE').length;
    const completed = allEnrollments.filter(
      (e) => e.status === 'COMPLETED',
    ).length;
    const inactiveOrCancelled = allEnrollments.filter(
      (e) => e.status === 'INACTIVE' || e.status === 'CANCELLED',
    ).length;
    return {
      total: allEnrollments.length,
      active,
      completed,
      inactiveOrCancelled,
    };
  }, [allEnrollments]);

  // Histórico real de matrículas do aluno selecionado no modal de detalhes
  const studentEnrollmentHistory = useMemo(() => {
    if (!enrollmentDetail) return [];
    return allEnrollments.filter(
      (e) => e.studentId === enrollmentDetail.studentId,
    );
  }, [allEnrollments, enrollmentDetail]);

  const openCreateModal = () => {
    setFormError(null);
    createForm.reset({
      studentId: '',
      classId: '',
      status: 'ACTIVE',
    });
    setIsCreateOpen(true);
  };

  const openEditStatusModal = (enr: Enrollment) => {
    setFormError(null);
    setEditingEnrollment(enr);
    updateStatusForm.reset({
      status: enr.status,
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/10 text-[#1E3A8A] flex items-center justify-center shrink-0 border border-[#2563EB]/20">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
                Gestão de Matrículas
              </h1>
              <Badge variant={isAdmin ? 'primary' : 'info'}>
                {isAdmin
                  ? 'Acesso Administrativo (CRUD)'
                  : `Escopo ${role} (Somente Leitura)`}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              {role === 'ADMIN' &&
                'Controle de vínculos entre estudantes e turmas, gestão de situação cadastral (ACTIVE, INACTIVE, CANCELLED, COMPLETED) e prevenção de duplicidade.'}
              {role === 'PROFESSOR' &&
                'Consulta de matrículas e situação acadêmica dos estudantes vinculados às suas turmas.'}
              {role === 'ALUNO' &&
                'Consulta das suas matrículas acadêmicas, situação por turma e histórico letivo.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={
              <RefreshCw
                className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`}
              />
            }
            onClick={() => void refetch()}
          >
            Atualizar
          </Button>

          {isAdmin && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openCreateModal}
            >
              Nova Matrícula
            </Button>
          )}
        </div>
      </div>

      {/* Aviso de Escopo e Isolamento Horizontal */}
      {role !== 'ADMIN' && (
        <Alert
          variant="info"
          title={
            role === 'PROFESSOR'
              ? 'Escopo Docente de Matrículas'
              : 'Escopo Pessoal do Estudante'
          }
        >
          {role === 'PROFESSOR'
            ? 'Você visualiza exclusivamente as matrículas pertencentes às turmas em que atua como professor responsável.'
            : 'Você visualiza exclusivamente suas próprias matrículas registradas na instituição.'}
        </Alert>
      )}

      {/* Indicadores Resumidos (Baseados em dados reais da API) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total de Matrículas"
          value={metrics.total}
          subtitle="Vínculos retornados no escopo atual"
          icon={<ClipboardList className="w-5 h-5" />}
          tone="primary"
        />
        <StatCard
          title="Matrículas Ativas (ACTIVE)"
          value={metrics.active}
          subtitle="Aptas para notas e frequência"
          icon={<CheckCircle2 className="w-5 h-5" />}
          tone="success"
        />
        <StatCard
          title="Concluídas / Inativas / Canceladas"
          value={metrics.completed + metrics.inactiveOrCancelled}
          subtitle={`${metrics.completed} concluída(s) • ${metrics.inactiveOrCancelled} inativa(s)/cancelada(s)`}
          icon={<Clock className="w-5 h-5" />}
          tone="warning"
        />
      </div>

      {/* Listagem, Busca, Filtros e Ordenação */}
      <Card
        title="Registros de Matrículas"
        subtitle="Filtro local instantâneo sobre os registros carregados por aluno, matrícula, turma, disciplina ou status."
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-5">
          <div className="md:col-span-5">
            <SearchInput
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                setPage(1);
              }}
              placeholder="Buscar por aluno, matrícula, turma ou disciplina..."
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            <select
              aria-label="Filtrar por status da matrícula"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="ALL">Todos os status</option>
              <option value="ACTIVE">Ativas (ACTIVE)</option>
              <option value="INACTIVE">Inativas (INACTIVE)</option>
              <option value="COMPLETED">Concluídas (COMPLETED)</option>
              <option value="CANCELLED">Canceladas (CANCELLED)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filtrar por turma"
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="ALL">Todas as turmas</option>
              {availableClassesInFilter.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Ordenar matrículas"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="date-desc">Mais recentes</option>
              <option value="student-asc">Aluno (A-Z)</option>
              <option value="class-asc">Turma (A-Z)</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoadingState message="Carregando matrículas acadêmicas..." />
        ) : isError ? (
          <ErrorState
            title="Falha ao carregar matrículas"
            message={getApiErrorMessage(
              error,
              'Não foi possível obter a lista de matrículas.',
            )}
            onRetry={() => void refetch()}
          />
        ) : filteredAndSortedEnrollments.length === 0 ? (
          <EmptyState
            title={
              searchTerm || statusFilter !== 'ALL' || classFilter !== 'ALL'
                ? 'Nenhuma matrícula encontrada para os filtros aplicados'
                : 'Nenhuma matrícula registrada no escopo atual'
            }
            description={
              searchTerm || statusFilter !== 'ALL' || classFilter !== 'ALL'
                ? 'Tente ajustar os termos de busca ou limpar os filtros de status e turma.'
                : isAdmin
                  ? 'Clique em "Nova Matrícula" para vincular um estudante a uma turma letiva.'
                  : 'Não há matrículas vinculadas ao seu perfil no momento.'
            }
            action={
              isAdmin &&
              !searchTerm &&
              statusFilter === 'ALL' &&
              classFilter === 'ALL' ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={openCreateModal}
                >
                  Realizar Matrícula
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Tabela Desktop / Tablet */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                    <th className="py-3 px-4">Estudante</th>
                    <th className="py-3 px-4">Turma & Disciplina</th>
                    <th className="py-3 px-4">Professor</th>
                    <th className="py-3 px-4">Data da Matrícula</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 text-sm">
                  {paginatedEnrollments.map((enr) => {
                    const statusMeta = STATUS_CONFIG[enr.status] ?? {
                      label: enr.status,
                      variant: 'info' as const,
                    };
                    return (
                      <tr
                        key={enr.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-[#0F172A]">
                            {enr.student?.name ||
                              `ID: ${enr.studentId.slice(0, 8)}...`}
                          </p>
                          <p className="text-xs text-slate-500">
                            {enr.student?.registration
                              ? `Matrícula: ${enr.student.registration}`
                              : enr.student?.email}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-800">
                            {enr.class?.name ||
                              `Turma ${enr.classId.slice(0, 8)}...`}
                          </p>
                          <p className="text-xs text-slate-500">
                            {enr.class?.subject?.name
                              ? `${enr.class.subject.name} (${enr.class.year}/${enr.class.semester}º Sem)`
                              : enr.class
                                ? `${enr.class.year}/${enr.class.semester}º Sem`
                                : '—'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {enr.class?.teacher?.name || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {formatDate(enr.enrollmentDate)}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={statusMeta.variant}>
                            {statusMeta.label}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                              onClick={() => setViewingEnrollmentId(enr.id)}
                            >
                              Detalhes
                            </Button>
                            {isAdmin && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  leftIcon={<Pencil className="w-3.5 h-3.5" />}
                                  onClick={() => openEditStatusModal(enr)}
                                >
                                  Status
                                </Button>
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                  onClick={() => setDeletingEnrollment(enr)}
                                >
                                  Excluir
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

            {/* Cards Mobile */}
            <div className="md:hidden space-y-3">
              {paginatedEnrollments.map((enr) => {
                const statusMeta = STATUS_CONFIG[enr.status] ?? {
                  label: enr.status,
                  variant: 'info' as const,
                };
                return (
                  <div
                    key={enr.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#0F172A] text-sm">
                          {enr.student?.name ||
                            `Aluno ${enr.studentId.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {enr.student?.registration
                            ? `Matrícula: ${enr.student.registration}`
                            : enr.student?.email}
                        </p>
                      </div>
                      <Badge variant={statusMeta.variant}>
                        {statusMeta.label}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-200/70">
                      <p>
                        <span className="font-semibold text-slate-700">
                          Turma:
                        </span>{' '}
                        {enr.class?.name || enr.classId.slice(0, 8)}
                      </p>
                      {enr.class?.subject?.name && (
                        <p>
                          <span className="font-semibold text-slate-700">
                            Disciplina:
                          </span>{' '}
                          {enr.class.subject.name}
                        </p>
                      )}
                      <p>
                        <span className="font-semibold text-slate-700">
                          Data:
                        </span>{' '}
                        {formatDate(enr.enrollmentDate)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200/80">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => setViewingEnrollmentId(enr.id)}
                      >
                        Detalhes
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            leftIcon={<Pencil className="w-3.5 h-3.5" />}
                            onClick={() => openEditStatusModal(enr)}
                          >
                            Status
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                            onClick={() => setDeletingEnrollment(enr)}
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

            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={filteredAndSortedEnrollments.length}
              limit={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* Modal de Detalhes e Histórico de Matrícula (GET /api/enrollments/:id) */}
      <Modal
        isOpen={Boolean(viewingEnrollmentId)}
        onClose={() => setViewingEnrollmentId(null)}
        title="Comprovante e Histórico de Matrícula"
        maxWidthClass="max-w-2xl"
        footer={
          <Button
            type="button"
            variant="outline"
            onClick={() => setViewingEnrollmentId(null)}
          >
            Fechar
          </Button>
        }
      >
        {isDetailLoading ? (
          <LoadingState message="Consultando detalhes da matrícula..." />
        ) : isDetailError || !enrollmentDetail ? (
          <ErrorState
            title="Não foi possível carregar a matrícula"
            message={getApiErrorMessage(
              detailError,
              'Verifique sua permissão ou tente novamente.',
            )}
          />
        ) : (
          <div className="space-y-5">
            {/* Resumo Superior */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-mono text-slate-500">
                  Protocolo ID: {enrollmentDetail.id}
                </p>
                <p className="text-base font-bold text-[#0F172A] mt-0.5">
                  {enrollmentDetail.student?.name ||
                    `Aluno ${enrollmentDetail.studentId}`}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Data de Efetivação:{' '}
                  <strong>{formatDate(enrollmentDetail.enrollmentDate)}</strong>
                </p>
              </div>
              <Badge
                variant={
                  STATUS_CONFIG[enrollmentDetail.status]?.variant || 'info'
                }
              >
                {STATUS_CONFIG[enrollmentDetail.status]?.label ||
                  enrollmentDetail.status}
              </Badge>
            </div>

            {/* Dados do Estudante e da Turma */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <div className="flex items-center gap-1.5 text-[#1E3A8A] font-semibold">
                  <GraduationCap className="w-4 h-4" />
                  <span>Dados do Estudante</span>
                </div>
                {enrollmentDetail.student ? (
                  <>
                    <p className="text-sm font-bold text-[#0F172A] mt-1">
                      {enrollmentDetail.student.name}
                    </p>
                    <p className="text-slate-600">
                      Matrícula Acadêmica:{' '}
                      <strong>{enrollmentDetail.student.registration}</strong>
                    </p>
                    <p className="text-slate-500">
                      E-mail: {enrollmentDetail.student.email}
                    </p>
                  </>
                ) : (
                  <p className="font-mono text-slate-600">
                    ID: {enrollmentDetail.studentId}
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <div className="flex items-center gap-1.5 text-[#1E3A8A] font-semibold">
                  <School className="w-4 h-4" />
                  <span>Turma & Disciplina Vinculada</span>
                </div>
                {enrollmentDetail.class ? (
                  <>
                    <p className="text-sm font-bold text-[#0F172A] mt-1">
                      {enrollmentDetail.class.name} (
                      {enrollmentDetail.class.year}/
                      {enrollmentDetail.class.semester}º Sem)
                    </p>
                    <p className="text-slate-600">
                      Disciplina:{' '}
                      <strong>
                        {enrollmentDetail.class.subject?.name ||
                          enrollmentDetail.class.subjectId}
                      </strong>
                    </p>
                    <p className="text-slate-500">
                      Professor(a):{' '}
                      {enrollmentDetail.class.teacher?.name ||
                        enrollmentDetail.class.teacherId}
                    </p>
                  </>
                ) : (
                  <p className="font-mono text-slate-600">
                    ID: {enrollmentDetail.classId}
                  </p>
                )}
              </div>
            </div>

            {/* Significado Operacional do Status */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700">
              <p className="font-semibold text-[#1E3A8A]">
                Regra Acadêmica do Status ({enrollmentDetail.status}):
              </p>
              <p className="mt-0.5">
                {STATUS_CONFIG[enrollmentDetail.status]?.description}
              </p>
            </div>

            {/* Histórico de Matrículas do Aluno no Escopo Visível */}
            {studentEnrollmentHistory.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-[#2563EB]" />
                  Histórico de Vínculos deste Estudante (
                  {studentEnrollmentHistory.length})
                </h4>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-200/80 max-h-44 overflow-y-auto">
                  {studentEnrollmentHistory.map((item) => {
                    const meta = STATUS_CONFIG[item.status];
                    return (
                      <div
                        key={item.id}
                        className="p-2.5 bg-white flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-[#0F172A]">
                            {item.class?.name || item.classId.slice(0, 8)}
                            {item.class?.subject?.name
                              ? ` — ${item.class.subject.name}`
                              : ''}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Efetivada em {formatDate(item.enrollmentDate)}
                          </p>
                        </div>
                        <Badge variant={meta?.variant || 'info'}>
                          {meta?.label || item.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de Criação de Matrícula (POST /api/enrollments) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!createMutation.isPending) setIsCreateOpen(false);
        }}
        title="Registrar Nova Matrícula"
        maxWidthClass="max-w-xl"
      >
        <form
          onSubmit={createForm.handleSubmit((data) =>
            createMutation.mutate(data),
          )}
          className="space-y-4"
          noValidate
        >
          {formError && (
            <Alert
              variant="error"
              title="Não foi possível efetivar a matrícula"
            >
              {formError}
            </Alert>
          )}

          {existingDuplicateEnrollment && (
            <Alert
              variant="warning"
              title="Matrícula existente detectada para este aluno e turma"
            >
              Este estudante já possui registro nesta turma com status{' '}
              <strong>{existingDuplicateEnrollment.status}</strong>. A API não
              permite duplicidade do par (Aluno + Turma). Caso a matrícula esteja
              inativa ou cancelada, utilize a opção <strong>Status</strong> na
              listagem para reativá-la para <strong>ACTIVE</strong>.
            </Alert>
          )}

          <div>
            <Label htmlFor="enrollment-student" required>
              Selecionar Estudante
            </Label>
            <select
              id="enrollment-student"
              disabled={isStudentsLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...createForm.register('studentId')}
            >
              <option value="">
                {isStudentsLoading
                  ? 'Carregando estudantes...'
                  : 'Selecione o aluno...'}
              </option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} — Matrícula: {st.registration} ({st.email})
                </option>
              ))}
            </select>
            {createForm.formState.errors.studentId?.message && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {createForm.formState.errors.studentId.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="enrollment-class" required>
              Selecionar Turma Letiva
            </Label>
            <select
              id="enrollment-class"
              disabled={isClassesLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...createForm.register('classId')}
            >
              <option value="">
                {isClassesLoading
                  ? 'Carregando turmas...'
                  : 'Selecione a turma...'}
              </option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.year}/{cls.semester}º Sem) —{' '}
                  {cls.subject?.name || 'Disciplina'} • Prof.{' '}
                  {cls.teacher?.name || 'Docente'}
                </option>
              ))}
            </select>
            {createForm.formState.errors.classId?.message && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {createForm.formState.errors.classId.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="enrollment-status" required>
              Status Inicial da Matrícula
            </Label>
            <select
              id="enrollment-status"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...createForm.register('status')}
            >
              <option value="ACTIVE">Ativa (ACTIVE) — Padrão</option>
              <option value="INACTIVE">Inativa (INACTIVE)</option>
              <option value="COMPLETED">Concluída (COMPLETED)</option>
              <option value="CANCELLED">Cancelada (CANCELLED)</option>
            </select>
          </div>

          {/* Resumo Preventivo de Conferência */}
          {(selectedStudentPreview || selectedClassPreview) && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <p className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#2563EB]" />
                Conferência do Vínculo Acadêmico
              </p>
              {selectedStudentPreview && (
                <p className="text-slate-600">
                  <strong>Aluno:</strong> {selectedStudentPreview.name} (Matr.:{' '}
                  {selectedStudentPreview.registration} •{' '}
                  {selectedStudentPreview.email})
                </p>
              )}
              {selectedClassPreview && (
                <p className="text-slate-600">
                  <strong>Turma:</strong> {selectedClassPreview.name} (
                  {selectedClassPreview.year}/{selectedClassPreview.semester}º
                  Sem) •{' '}
                  <strong>
                    {selectedClassPreview.subject?.name || 'Disciplina'}
                  </strong>{' '}
                  • Prof. {selectedClassPreview.teacher?.name || 'Docente'}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              disabled={createMutation.isPending}
              onClick={() => setIsCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending}
            >
              Confirmar Matrícula
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Alteração de Status / Reativação (PUT /api/enrollments/:id) */}
      <Modal
        isOpen={Boolean(editingEnrollment)}
        onClose={() => {
          if (!updateStatusMutation.isPending) setEditingEnrollment(null);
        }}
        title="Alterar Situação da Matrícula"
        maxWidthClass="max-w-md"
      >
        <form
          onSubmit={updateStatusForm.handleSubmit((data) => {
            if (!editingEnrollment) return;
            updateStatusMutation.mutate({
              id: editingEnrollment.id,
              input: data,
            });
          })}
          className="space-y-4"
          noValidate
        >
          {formError && (
            <Alert variant="error" title="Erro ao atualizar status">
              {formError}
            </Alert>
          )}

          {editingEnrollment && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-[#0F172A] text-sm">
                {editingEnrollment.student?.name ||
                  editingEnrollment.studentId}
              </p>
              <p className="text-slate-600">
                Turma:{' '}
                <strong>
                  {editingEnrollment.class?.name || editingEnrollment.classId}
                </strong>
                {editingEnrollment.class?.subject?.name
                  ? ` — ${editingEnrollment.class.subject.name}`
                  : ''}
              </p>
              <p className="text-slate-500">
                Status atual: <strong>{editingEnrollment.status}</strong>
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="edit-enrollment-status" required>
              Novo Status da Matrícula
            </Label>
            <select
              id="edit-enrollment-status"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...updateStatusForm.register('status')}
            >
              <option value="ACTIVE">
                Ativa (ACTIVE) — Habilita notas e chamadas
              </option>
              <option value="INACTIVE">
                Inativa (INACTIVE) — Trancamento / suspensão temporária
              </option>
              <option value="COMPLETED">
                Concluída (COMPLETED) — Encerramento do ciclo letivo
              </option>
              <option value="CANCELLED">
                Cancelada (CANCELLED) — Cancelamento de vínculo
              </option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              disabled={updateStatusMutation.isPending}
              onClick={() => setEditingEnrollment(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateStatusMutation.isPending}
            >
              Salvar Status
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmação de Exclusão de Matrícula (DELETE /api/enrollments/:id) */}
      <ConfirmDialog
        isOpen={Boolean(deletingEnrollment)}
        onClose={() => setDeletingEnrollment(null)}
        onConfirm={() => {
          if (deletingEnrollment)
            deleteMutation.mutate(deletingEnrollment.id);
        }}
        title="Excluir Registro de Matrícula"
        description="Deseja remover permanentemente este vínculo de matrícula? Caso deseje apenas encerrar ou suspender o vínculo mantendo o histórico, cancele esta ação e altere o Status da matrícula para INACTIVE, CANCELLED ou COMPLETED."
        itemName={
          deletingEnrollment
            ? `${deletingEnrollment.student?.name || deletingEnrollment.studentId} • ${deletingEnrollment.class?.name || deletingEnrollment.classId}`
            : undefined
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
