import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  School,
  Plus,
  Eye,
  Pencil,
  Trash2,
  BookOpen,
  Users,
  Calendar,
  RefreshCw,
  Filter,
  ShieldAlert,
  GraduationCap,
} from 'lucide-react';
import { classService } from '../../services/classService';
import { teacherService } from '../../services/teacherService';
import { subjectService } from '../../services/subjectService';
import { getApiErrorMessage } from '../../services/api';
import { classFormSchema, ClassFormInput } from '../../schemas';
import { ClassEntity, EnrollmentStatus } from '../../types/api.types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/formatters';
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

type SortOption = 'name-asc' | 'year-desc' | 'year-asc';

const STATUS_BADGE_MAP: Record<
  EnrollmentStatus,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }
> = {
  ACTIVE: { label: 'Ativa', variant: 'success' },
  INACTIVE: { label: 'Inativa', variant: 'warning' },
  CANCELLED: { label: 'Cancelada', variant: 'danger' },
  COMPLETED: { label: 'Concluída', variant: 'info' },
};

export const ClassesPage: React.FC = () => {
  const { role } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === 'ADMIN';

  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Estados de Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassEntity | null>(null);
  const [deletingClass, setDeletingClass] = useState<ClassEntity | null>(null);
  const [viewingClassId, setViewingClassId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Listagem completa de turmas visíveis ao perfil (GET /api/classes)
  const {
    data: allClasses = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['classes', 'all'],
    queryFn: () => classService.listAll(),
  });

  // Consulta individual de turma (GET /api/classes/:id — inclui teacher, subject e enrollments.student)
  const {
    data: classDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
  } = useQuery({
    queryKey: ['classes', 'detail', viewingClassId],
    queryFn: () => classService.getById(viewingClassId!),
    enabled: Boolean(viewingClassId),
  });

  // Listas de professores e disciplinas reutilizadas dos serviços existentes (carregadas para os seletores do ADMIN)
  const { data: teachers = [], isLoading: isTeachersLoading } = useQuery({
    queryKey: ['teachers', 'all'],
    queryFn: () => teacherService.listAll(),
    enabled: isAdmin && (isCreateOpen || Boolean(editingClass)),
  });

  const { data: subjects = [], isLoading: isSubjectsLoading } = useQuery({
    queryKey: ['subjects', 'all'],
    queryFn: () => subjectService.listAll(),
    enabled: isAdmin && (isCreateOpen || Boolean(editingClass)),
  });

  const currentYear = new Date().getFullYear();

  // Formulário de Criação
  const createForm = useForm<ClassFormInput>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: '',
      year: currentYear,
      semester: 1,
      teacherId: '',
      subjectId: '',
    },
  });

  // Formulário de Edição
  const updateForm = useForm<ClassFormInput>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: '',
      year: currentYear,
      semester: 1,
      teacherId: '',
      subjectId: '',
    },
  });

  // Mutação: Criar Turma (POST /api/classes)
  const createMutation = useMutation({
    mutationFn: (input: ClassFormInput) =>
      classService.create({
        name: input.name.trim(),
        year: Number(input.year),
        semester: Number(input.semester),
        teacherId: input.teacherId,
        subjectId: input.subjectId,
      }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['classes'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Turma cadastrada com sucesso!',
        `${created.name} (${created.year}/${created.semester}º sem.) foi registrada na EducaAPI.`,
      );
      setIsCreateOpen(false);
      createForm.reset({
        name: '',
        year: currentYear,
        semester: 1,
        teacherId: '',
        subjectId: '',
      });
      setFormError(null);
    },
    onError: (err) => {
      setFormError(
        getApiErrorMessage(err, 'Não foi possível cadastrar a turma.'),
      );
    },
  });

  // Mutação: Editar Turma (PUT /api/classes/:id)
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClassFormInput }) =>
      classService.update(id, {
        name: input.name.trim(),
        year: Number(input.year),
        semester: Number(input.semester),
        teacherId: input.teacherId,
        subjectId: input.subjectId,
      }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['classes'] });
      void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Turma atualizada!',
        `Os dados de ${updated.name} foram atualizados com sucesso.`,
      );
      setEditingClass(null);
      setFormError(null);
    },
    onError: (err) => {
      setFormError(
        getApiErrorMessage(err, 'Não foi possível atualizar os dados da turma.'),
      );
    },
  });

  // Mutação: Excluir Turma (DELETE /api/classes/:id)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => classService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['classes'] });
      void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Turma excluída',
        'A turma foi removida com sucesso do cadastro acadêmico.',
      );
      setDeletingClass(null);
    },
    onError: (err) => {
      toast.error(
        'Não foi possível excluir a turma',
        getApiErrorMessage(
          err,
          'Verifique se existem dependências acadêmicas antes de excluir.',
        ),
      );
      setDeletingClass(null);
    },
  });

  // Anos disponíveis para filtro dinâmico
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    allClasses.forEach((cls) => yearsSet.add(cls.year));
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allClasses]);

  // Filtragem e Ordenação Client-Side (com indicação explícita)
  const filteredAndSortedClasses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = allClasses.filter((cls) => {
      if (semesterFilter !== 'all' && String(cls.semester) !== semesterFilter) {
        return false;
      }
      if (yearFilter !== 'all' && String(cls.year) !== yearFilter) {
        return false;
      }
      if (!normalizedSearch) return true;

      const matchName = cls.name.toLowerCase().includes(normalizedSearch);
      const matchSubject = cls.subject?.name
        ?.toLowerCase()
        .includes(normalizedSearch);
      const matchTeacher = cls.teacher?.name
        ?.toLowerCase()
        .includes(normalizedSearch);
      const matchPeriod = `${cls.year}/${cls.semester}`.includes(
        normalizedSearch,
      );

      return Boolean(matchName || matchSubject || matchTeacher || matchPeriod);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'year-desc') {
        if (b.year !== a.year) return b.year - a.year;
        return b.semester - a.semester;
      }
      if (sortBy === 'year-asc') {
        if (a.year !== b.year) return a.year - b.year;
        return a.semester - b.semester;
      }
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [allClasses, searchTerm, semesterFilter, yearFilter, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedClasses.length / pageSize),
  );
  const safePage = Math.min(page, totalPages);
  const paginatedClasses = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSortedClasses.slice(start, start + pageSize);
  }, [filteredAndSortedClasses, safePage]);

  // Métricas resumidas reais das turmas retornadas no escopo do perfil
  const distinctSubjectsCount = useMemo(() => {
    const ids = new Set(allClasses.map((c) => c.subjectId));
    return ids.size;
  }, [allClasses]);

  const distinctTeachersCount = useMemo(() => {
    const ids = new Set(allClasses.map((c) => c.teacherId));
    return ids.size;
  }, [allClasses]);

  const openCreateModal = () => {
    setFormError(null);
    createForm.reset({
      name: '',
      year: currentYear,
      semester: 1,
      teacherId: '',
      subjectId: '',
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (cls: ClassEntity) => {
    setFormError(null);
    setEditingClass(cls);
    updateForm.reset({
      name: cls.name,
      year: cls.year,
      semester: cls.semester,
      teacherId: cls.teacherId,
      subjectId: cls.subjectId,
    });
  };

  // Resumo de matrículas no modal de detalhes (carregado via GET /api/classes/:id)
  const detailEnrollmentsSummary = useMemo(() => {
    const list = classDetail?.enrollments ?? [];
    // Para o perfil ALUNO, exibir apenas a própria matrícula caso a API retorne a lista da turma
    return {
      total: list.length,
      active: list.filter((e) => e.status === 'ACTIVE').length,
      list,
    };
  }, [classDetail]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/10 text-[#1E3A8A] flex items-center justify-center shrink-0 border border-[#2563EB]/20">
            <School className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
                Gestão de Turmas
              </h1>
              <Badge variant={isAdmin ? 'primary' : 'info'}>
                {isAdmin
                  ? 'Acesso Administrativo (CRUD)'
                  : `Escopo ${role} (Somente Leitura)`}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              {role === 'ADMIN' &&
                'Gerenciamento de turmas letivas, vinculação de disciplinas, alocação de professores e consulta de alunos matriculados.'}
              {role === 'PROFESSOR' &&
                'Visualização das turmas sob sua responsabilidade docente e consulta dos estudantes matriculados.'}
              {role === 'ALUNO' &&
                'Visualização das turmas em que você possui matrícula ativa neste período letivo.'}
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
              Nova Turma
            </Button>
          )}
        </div>
      </div>

      {/* Aviso de Isolamento Horizontal para PROFESSOR e ALUNO */}
      {role !== 'ADMIN' && (
        <Alert
          variant="info"
          title={
            role === 'PROFESSOR'
              ? 'Isolamento Docente Ativo'
              : 'Isolamento Acadêmico do Estudante Ativo'
          }
        >
          {role === 'PROFESSOR'
            ? 'A API filtra automaticamente esta listagem para exibir apenas as turmas em que você está alocado como professor responsável.'
            : 'A API filtra automaticamente esta listagem para exibir apenas as turmas nas quais você possui matrícula com status ACTIVE.'}
        </Alert>
      )}

      {/* Indicadores Resumidos (Baseados em dados reais da API) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={
            role === 'ADMIN'
              ? 'Total de Turmas'
              : 'Turmas Vinculadas ao Perfil'
          }
          value={allClasses.length}
          subtitle="Registros retornados por GET /api/classes"
          icon={<School className="w-5 h-5" />}
          tone="primary"
        />
        <StatCard
          title="Disciplinas Ofertadas"
          value={distinctSubjectsCount}
          subtitle="Disciplinas distintas nas turmas listadas"
          icon={<BookOpen className="w-5 h-5" />}
          tone="navy"
        />
        <StatCard
          title="Docentes Alocados"
          value={distinctTeachersCount}
          subtitle="Professores responsáveis pelas turmas"
          icon={<Users className="w-5 h-5" />}
          tone="success"
        />
      </div>

      {/* Barra de Busca, Filtros e Ordenação */}
      <Card
        title="Turmas Acadêmicas"
        subtitle="Busca local instantânea sobre os registros carregados por nome da turma, disciplina, professor ou período."
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-5">
          <div className="md:col-span-5">
            <SearchInput
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                setPage(1);
              }}
              placeholder="Buscar por turma, disciplina ou professor..."
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            <select
              aria-label="Filtrar por ano letivo"
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="all">Todos os anos</option>
              {availableYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  Ano {yr}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            <select
              aria-label="Filtrar por semestre"
              value={semesterFilter}
              onChange={(e) => {
                setSemesterFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="all">Ambos semestres</option>
              <option value="1">1º Semestre</option>
              <option value="2">2º Semestre</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Ordenar turmas"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="name-asc">Ordenar: Nome (A-Z)</option>
              <option value="year-desc">Ordenar: Período (Mais recente)</option>
              <option value="year-asc">Ordenar: Período (Mais antigo)</option>
            </select>
          </div>
        </div>

        {/* Estados de Carregamento, Erro e Vazio */}
        {isLoading ? (
          <LoadingState message="Carregando turmas acadêmicas..." />
        ) : isError ? (
          <ErrorState
            title="Falha ao carregar turmas"
            message={getApiErrorMessage(
              error,
              'Não foi possível obter a lista de turmas.',
            )}
            onRetry={() => void refetch()}
          />
        ) : filteredAndSortedClasses.length === 0 ? (
          <EmptyState
            title={
              searchTerm || semesterFilter !== 'all' || yearFilter !== 'all'
                ? 'Nenhuma turma encontrada para os filtros aplicados'
                : 'Nenhuma turma cadastrada no escopo atual'
            }
            description={
              searchTerm || semesterFilter !== 'all' || yearFilter !== 'all'
                ? 'Tente ajustar os termos da pesquisa ou redefinir os filtros de ano e semestre.'
                : isAdmin
                  ? 'Clique em "Nova Turma" para criar a primeira turma letiva vinculada a um professor e disciplina.'
                  : 'Não há turmas associadas ao seu perfil neste momento.'
            }
            action={
              isAdmin &&
              !searchTerm &&
              semesterFilter === 'all' &&
              yearFilter === 'all' ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={openCreateModal}
                >
                  Cadastrar Turma
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
                    <th className="py-3 px-4">Turma</th>
                    <th className="py-3 px-4">Período Letivo</th>
                    <th className="py-3 px-4">Disciplina</th>
                    <th className="py-3 px-4">Professor Responsável</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 text-sm">
                  {paginatedClasses.map((cls) => (
                    <tr
                      key={cls.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#0F172A]">
                          {cls.name}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400">
                          ID: {cls.id.slice(0, 8)}...
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="primary">
                          {cls.year} • {cls.semester}º Semestre
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        {cls.subject ? (
                          <div>
                            <p className="font-medium text-slate-800">
                              {cls.subject.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              Carga horária: {cls.subject.workload}h
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-slate-500">
                            {cls.subjectId.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {cls.teacher ? (
                          <div>
                            <p className="font-medium text-slate-800">
                              {cls.teacher.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              Reg: {cls.teacher.registration}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-slate-500">
                            {cls.teacherId.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => setViewingClassId(cls.id)}
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
                                onClick={() => openEditModal(cls)}
                              >
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                onClick={() => setDeletingClass(cls)}
                              >
                                Excluir
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
              {paginatedClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#0F172A] text-sm">
                        {cls.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {cls.subject?.name || 'Disciplina vinculada'}
                      </p>
                    </div>
                    <Badge variant="primary">
                      {cls.year}/{cls.semester}º Sem
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-200/70">
                    <p>
                      <span className="font-semibold text-slate-700">
                        Professor:
                      </span>{' '}
                      {cls.teacher?.name || cls.teacherId.slice(0, 8)}
                    </p>
                    {cls.subject?.workload && (
                      <p>
                        <span className="font-semibold text-slate-700">
                          Carga Horária:
                        </span>{' '}
                        {cls.subject.workload}h
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200/80">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => setViewingClassId(cls.id)}
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
                          onClick={() => openEditModal(cls)}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => setDeletingClass(cls)}
                        >
                          Excluir
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={filteredAndSortedClasses.length}
              limit={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* Modal de Detalhes da Turma (GET /api/classes/:id) */}
      <Modal
        isOpen={Boolean(viewingClassId)}
        onClose={() => setViewingClassId(null)}
        title="Ficha Detalhada da Turma"
        maxWidthClass="max-w-2xl"
        footer={
          <Button
            type="button"
            variant="outline"
            onClick={() => setViewingClassId(null)}
          >
            Fechar
          </Button>
        }
      >
        {isDetailLoading ? (
          <LoadingState message="Consultando dados da turma e matrículas..." />
        ) : isDetailError || !classDetail ? (
          <ErrorState
            title="Não foi possível carregar os detalhes da turma"
            message={getApiErrorMessage(
              detailError,
              'Verifique sua permissão ou tente novamente.',
            )}
          />
        ) : (
          <div className="space-y-5">
            {/* Cabeçalho da Turma */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-base font-bold text-[#0F172A]">
                  {classDetail.name}
                </p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  ID da Turma: {classDetail.id}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary">
                  Ano {classDetail.year} • {classDetail.semester}º Semestre
                </Badge>
                <Badge variant="success">
                  {detailEnrollmentsSummary.active} matrícula(s) ativa(s)
                </Badge>
              </div>
            </div>

            {/* Cards de Disciplina e Professor Responsável */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <div className="flex items-center gap-1.5 text-[#1E3A8A] font-semibold">
                  <BookOpen className="w-4 h-4" />
                  <span>Disciplina Vinculada</span>
                </div>
                {classDetail.subject ? (
                  <>
                    <p className="text-sm font-bold text-[#0F172A] mt-1">
                      {classDetail.subject.name}
                    </p>
                    <p className="text-slate-600">
                      Carga Horária:{' '}
                      <strong>{classDetail.subject.workload} horas</strong>
                    </p>
                    {classDetail.subject.description && (
                      <p className="text-slate-500 line-clamp-2">
                        {classDetail.subject.description}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-mono text-slate-600">
                    ID: {classDetail.subjectId}
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <div className="flex items-center gap-1.5 text-[#1E3A8A] font-semibold">
                  <Users className="w-4 h-4" />
                  <span>Professor Responsável</span>
                </div>
                {classDetail.teacher ? (
                  <>
                    <p className="text-sm font-bold text-[#0F172A] mt-1">
                      {classDetail.teacher.name}
                    </p>
                    <p className="text-slate-600">
                      E-mail: {classDetail.teacher.email}
                    </p>
                    <p className="text-slate-500">
                      Registro Funcional: {classDetail.teacher.registration}
                    </p>
                  </>
                ) : (
                  <p className="font-mono text-slate-600">
                    ID: {classDetail.teacherId}
                  </p>
                )}
              </div>
            </div>

            {/* Lista de Matrículas / Alunos Vinculados (Somente quando autorizado para ADMIN e PROFESSOR) */}
            {role === 'ADMIN' || role === 'PROFESSOR' ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-[#2563EB]" />
                    Alunos Matriculados na Turma ({detailEnrollmentsSummary.total})
                  </h4>
                  <span className="text-xs text-slate-500">
                    Ativos: <strong>{detailEnrollmentsSummary.active}</strong>
                  </span>
                </div>

                {detailEnrollmentsSummary.list.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                    Nenhum estudante matriculado nesta turma até o momento.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-200/80">
                    {detailEnrollmentsSummary.list.map((enr) => {
                      const statusMeta = STATUS_BADGE_MAP[enr.status] ?? {
                        label: enr.status,
                        variant: 'info' as const,
                      };
                      return (
                        <div
                          key={enr.id}
                          className="p-3 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-[#0F172A]">
                              {enr.student?.name ||
                                `Aluno ID: ${enr.studentId.slice(0, 8)}...`}
                            </p>
                            <p className="text-slate-500">
                              {enr.student?.registration
                                ? `Matrícula: ${enr.student.registration} • ${enr.student.email}`
                                : `Data: ${formatDate(enr.enrollmentDate)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">
                              {formatDate(enr.enrollmentDate)}
                            </span>
                            <Badge variant={statusMeta.variant}>
                              {statusMeta.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700">
                Você está vinculado(a) a esta turma com matrícula{' '}
                <strong>Ativa (ACTIVE)</strong>. Para privacidade acadêmica, a
                relação nominal de outros estudantes é restrita ao corpo docente
                e à administração.
              </div>
            )}

            {/* Metadados de Auditoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200">
              <div className="p-2.5 rounded-lg bg-slate-50">
                <span className="text-slate-500">Criada em: </span>
                <strong className="text-[#0F172A]">
                  {formatDate(classDetail.createdAt)}
                </strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50">
                <span className="text-slate-500">Última atualização: </span>
                <strong className="text-[#0F172A]">
                  {formatDate(classDetail.updatedAt)}
                </strong>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Criação de Turma (POST /api/classes) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!createMutation.isPending) setIsCreateOpen(false);
        }}
        title="Cadastrar Nova Turma"
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
            <Alert variant="error" title="Não foi possível criar a turma">
              {formError}
            </Alert>
          )}

          <div>
            <Label htmlFor="create-class-name" required>
              Nome ou Identificação da Turma
            </Label>
            <Input
              id="create-class-name"
              placeholder="Ex.: Turma 9º Ano A - Matemática"
              error={createForm.formState.errors.name?.message}
              {...createForm.register('name')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="create-class-year" required>
                Ano Letivo (mín. 2000)
              </Label>
              <Input
                id="create-class-year"
                type="number"
                min={2000}
                max={2100}
                error={createForm.formState.errors.year?.message}
                {...createForm.register('year')}
              />
            </div>

            <div>
              <Label htmlFor="create-class-semester" required>
                Semestre Letivo
              </Label>
              <select
                id="create-class-semester"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                {...createForm.register('semester')}
              >
                <option value={1}>1º Semestre</option>
                <option value={2}>2º Semestre</option>
              </select>
              {createForm.formState.errors.semester?.message && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {createForm.formState.errors.semester.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="create-class-subject" required>
              Disciplina Vinculada
            </Label>
            <select
              id="create-class-subject"
              disabled={isSubjectsLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...createForm.register('subjectId')}
            >
              <option value="">
                {isSubjectsLoading
                  ? 'Carregando disciplinas...'
                  : 'Selecione uma disciplina...'}
              </option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.workload}h)
                </option>
              ))}
            </select>
            {createForm.formState.errors.subjectId?.message && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {createForm.formState.errors.subjectId.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="create-class-teacher" required>
              Professor Responsável
            </Label>
            <select
              id="create-class-teacher"
              disabled={isTeachersLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...createForm.register('teacherId')}
            >
              <option value="">
                {isTeachersLoading
                  ? 'Carregando professores...'
                  : 'Selecione o professor responsável...'}
              </option>
              {teachers.map((tch) => (
                <option key={tch.id} value={tch.id}>
                  {tch.name} — Reg: {tch.registration} ({tch.email})
                </option>
              ))}
            </select>
            {createForm.formState.errors.teacherId?.message && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {createForm.formState.errors.teacherId.message}
              </p>
            )}
          </div>

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
              Cadastrar Turma
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Edição de Turma (PUT /api/classes/:id) */}
      <Modal
        isOpen={Boolean(editingClass)}
        onClose={() => {
          if (!updateMutation.isPending) setEditingClass(null);
        }}
        title="Editar Turma Acadêmica"
        maxWidthClass="max-w-xl"
      >
        <form
          onSubmit={updateForm.handleSubmit((data) => {
            if (!editingClass) return;
            updateMutation.mutate({ id: editingClass.id, input: data });
          })}
          className="space-y-4"
          noValidate
        >
          {formError && (
            <Alert variant="error" title="Não foi possível atualizar a turma">
              {formError}
            </Alert>
          )}

          <div>
            <Label htmlFor="edit-class-name" required>
              Nome ou Identificação da Turma
            </Label>
            <Input
              id="edit-class-name"
              error={updateForm.formState.errors.name?.message}
              {...updateForm.register('name')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-class-year" required>
                Ano Letivo (mín. 2000)
              </Label>
              <Input
                id="edit-class-year"
                type="number"
                min={2000}
                max={2100}
                error={updateForm.formState.errors.year?.message}
                {...updateForm.register('year')}
              />
            </div>

            <div>
              <Label htmlFor="edit-class-semester" required>
                Semestre Letivo
              </Label>
              <select
                id="edit-class-semester"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                {...updateForm.register('semester')}
              >
                <option value={1}>1º Semestre</option>
                <option value={2}>2º Semestre</option>
              </select>
              {updateForm.formState.errors.semester?.message && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {updateForm.formState.errors.semester.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="edit-class-subject" required>
              Disciplina Vinculada
            </Label>
            <select
              id="edit-class-subject"
              disabled={isSubjectsLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...updateForm.register('subjectId')}
            >
              <option value="">Selecione uma disciplina...</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.workload}h)
                </option>
              ))}
            </select>
            {updateForm.formState.errors.subjectId?.message && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {updateForm.formState.errors.subjectId.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="edit-class-teacher" required>
              Professor Responsável
            </Label>
            <select
              id="edit-class-teacher"
              disabled={isTeachersLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...updateForm.register('teacherId')}
            >
              <option value="">Selecione o professor responsável...</option>
              {teachers.map((tch) => (
                <option key={tch.id} value={tch.id}>
                  {tch.name} — Reg: {tch.registration} ({tch.email})
                </option>
              ))}
            </select>
            {updateForm.formState.errors.teacherId?.message && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {updateForm.formState.errors.teacherId.message}
              </p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Alterar o professor responsável atualizará imediatamente o acesso
              docente às matrículas, chamadas e atividades desta turma.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => setEditingClass(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={updateMutation.isPending}
            >
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmação de Exclusão de Turma (DELETE /api/classes/:id) */}
      <ConfirmDialog
        isOpen={Boolean(deletingClass)}
        onClose={() => setDeletingClass(null)}
        onConfirm={() => {
          if (deletingClass) deleteMutation.mutate(deletingClass.id);
        }}
        title="Excluir Turma Acadêmica"
        description="Atenção: No modelo relacional do EducaAPI (onDelete: Cascade), excluir uma turma removerá também todas as matrículas, atividades e registros de frequência vinculados a ela."
        itemName={
          deletingClass
            ? `${deletingClass.name} (${deletingClass.year}/${deletingClass.semester}º Sem)`
            : undefined
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
