import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ClipboardCheck,
  Plus,
  Eye,
  Pencil,
  Trash2,
  FileText,
  School,
  Calendar,
  Award,
  RefreshCw,
  Filter,
  BookOpen,
} from 'lucide-react';
import { activityService } from '../../services/activityService';
import { contentService } from '../../services/contentService';
import { classService } from '../../services/classService';
import { subjectService } from '../../services/subjectService';
import { getApiErrorMessage } from '../../services/api';
import { activityFormSchema, ActivityFormInput } from '../../schemas';
import { Activity } from '../../types/api.types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { formatDate, formatDecimal } from '../../utils/formatters';
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

type SortOption = 'due-asc' | 'due-desc' | 'title-asc' | 'score-desc';
type DeadlineFilter = 'ALL' | 'UPCOMING' | 'PAST';

export const ActivitiesPage: React.FC = () => {
  const { role } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const canWrite = role === 'ADMIN' || role === 'PROFESSOR';

  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('due-asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Estados de Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(
    null,
  );
  const [viewingActivityId, setViewingActivityId] = useState<string | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  // Listagem completa de atividades visíveis ao perfil (GET /api/activities — já isolado no Back-End)
  const {
    data: allActivities = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['activities', 'all'],
    queryFn: () => activityService.listAll(),
  });

  // Turmas visíveis ao perfil autenticado (GET /api/classes — inclui subject e teacher)
  const { data: userVisibleClasses = [], isLoading: isClassesLoading } =
    useQuery({
      queryKey: ['classes', 'all'],
      queryFn: () => classService.listAll(),
    });

  // Conteúdos programáticos (GET /api/contents — inclui subject)
  const { data: allContents = [], isLoading: isContentsLoading } = useQuery({
    queryKey: ['contents', 'all'],
    queryFn: () => contentService.listAll(),
  });

  // Disciplinas para enriquecimento de exibição
  const { data: allSubjects = [] } = useQuery({
    queryKey: ['subjects', 'all'],
    queryFn: () => subjectService.listAll(),
  });

  // Consulta individual de atividade (GET /api/activities/:id)
  const {
    data: activityDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
  } = useQuery({
    queryKey: ['activities', 'detail', viewingActivityId],
    queryFn: () => activityService.getById(viewingActivityId!),
    enabled: Boolean(viewingActivityId),
  });

  const subjectsMap = useMemo(() => {
    const map = new Map<string, string>();
    allSubjects.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [allSubjects]);

  const classesMap = useMemo(() => {
    const map = new Map<
      string,
      { name: string; period: string; subjectId: string; subjectName?: string }
    >();
    userVisibleClasses.forEach((c) => {
      map.set(c.id, {
        name: c.name,
        period: `${c.year}/${c.semester}º Sem`,
        subjectId: c.subjectId,
        subjectName: c.subject?.name || subjectsMap.get(c.subjectId),
      });
    });
    return map;
  }, [userVisibleClasses, subjectsMap]);

  const defaultDueDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  // Formulário de Criação
  const createForm = useForm<ActivityFormInput>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      title: '',
      description: '',
      classId: '',
      contentId: '',
      dueDate: defaultDueDate,
      maxScore: 10,
    },
  });

  // Formulário de Edição
  const updateForm = useForm<ActivityFormInput>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      title: '',
      description: '',
      classId: '',
      contentId: '',
      dueDate: defaultDueDate,
      maxScore: 10,
    },
  });

  const watchedCreateClassId = createForm.watch('classId');
  const watchedEditClassId = updateForm.watch('classId');

  // Conteúdos compatíveis com a disciplina da turma selecionada no modal de Criação
  const compatibleContentsForCreate = useMemo(() => {
    if (!watchedCreateClassId) return [];
    const selectedClass = userVisibleClasses.find(
      (c) => c.id === watchedCreateClassId,
    );
    if (!selectedClass) return [];
    return allContents.filter(
      (cnt) => cnt.subjectId === selectedClass.subjectId,
    );
  }, [allContents, userVisibleClasses, watchedCreateClassId]);

  // Conteúdos compatíveis com a disciplina da turma selecionada no modal de Edição
  const compatibleContentsForEdit = useMemo(() => {
    if (!watchedEditClassId) return [];
    const selectedClass = userVisibleClasses.find(
      (c) => c.id === watchedEditClassId,
    );
    if (!selectedClass) return [];
    return allContents.filter(
      (cnt) => cnt.subjectId === selectedClass.subjectId,
    );
  }, [allContents, userVisibleClasses, watchedEditClassId]);

  // Mutação: Criar Atividade (POST /api/activities)
  const createMutation = useMutation({
    mutationFn: (input: ActivityFormInput) =>
      activityService.create({
        title: input.title.trim(),
        description: input.description?.trim() || undefined,
        classId: input.classId,
        contentId: input.contentId,
        dueDate: new Date(input.dueDate).toISOString(),
        maxScore: Number(input.maxScore),
      }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['activities'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Atividade criada com sucesso!',
        `"${created.title}" (Valor: ${formatDecimal(created.maxScore, 1)} pts) foi registrada na turma.`,
      );
      setIsCreateOpen(false);
      createForm.reset({
        title: '',
        description: '',
        classId: '',
        contentId: '',
        dueDate: defaultDueDate,
        maxScore: 10,
      });
      setFormError(null);
    },
    onError: (err) => {
      setFormError(
        getApiErrorMessage(err, 'Não foi possível cadastrar a atividade.'),
      );
    },
  });

  // Mutação: Editar Atividade (PUT /api/activities/:id)
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ActivityFormInput }) =>
      activityService.update(id, {
        title: input.title.trim(),
        description: input.description?.trim() || undefined,
        classId: input.classId,
        contentId: input.contentId,
        dueDate: new Date(input.dueDate).toISOString(),
        maxScore: Number(input.maxScore),
      }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['activities'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Atividade atualizada!',
        `Os dados de "${updated.title}" foram atualizados com sucesso.`,
      );
      setEditingActivity(null);
      setFormError(null);
    },
    onError: (err) => {
      setFormError(
        getApiErrorMessage(err, 'Não foi possível atualizar a atividade.'),
      );
    },
  });

  // Mutação: Excluir Atividade (DELETE /api/activities/:id)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => activityService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activities'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Atividade excluída',
        'A atividade avaliativa foi removida com sucesso.',
      );
      setDeletingActivity(null);
    },
    onError: (err) => {
      toast.error(
        'Não foi possível excluir a atividade',
        getApiErrorMessage(err, 'Erro ao excluir o registro da atividade.'),
      );
      setDeletingActivity(null);
    },
  });

  const getSubjectNameForActivity = (act: Activity): string => {
    const fromContent = act.content?.subjectId
      ? subjectsMap.get(act.content.subjectId)
      : undefined;
    const fromClass = classesMap.get(act.classId)?.subjectName;
    return fromContent || fromClass || 'Disciplina vinculada';
  };

  const getSubjectIdForActivity = (act: Activity): string | undefined => {
    return (
      act.content?.subjectId ||
      act.class?.subjectId ||
      classesMap.get(act.classId)?.subjectId
    );
  };

  const isDeadlinePast = (dueDateStr: string): boolean => {
    const dueTime = new Date(dueDateStr).getTime();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return dueTime < todayStart.getTime();
  };

  // Filtragem e Ordenação Client-Side
  const filteredAndSortedActivities = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = allActivities.filter((act) => {
      if (classFilter !== 'ALL' && act.classId !== classFilter) return false;
      if (subjectFilter !== 'ALL') {
        const subjectId = getSubjectIdForActivity(act);
        if (subjectId !== subjectFilter) return false;
      }
      if (deadlineFilter === 'UPCOMING' && isDeadlinePast(act.dueDate)) {
        return false;
      }
      if (deadlineFilter === 'PAST' && !isDeadlinePast(act.dueDate)) {
        return false;
      }
      if (!normalizedSearch) return true;

      const matchTitle = act.title.toLowerCase().includes(normalizedSearch);
      const matchDesc = act.description
        ?.toLowerCase()
        .includes(normalizedSearch);
      const matchContent = act.content?.title
        ?.toLowerCase()
        .includes(normalizedSearch);
      const matchClass = act.class?.name
        ?.toLowerCase()
        .includes(normalizedSearch);
      const matchTeacher = act.class?.teacher?.name
        ?.toLowerCase()
        .includes(normalizedSearch);

      return Boolean(
        matchTitle || matchDesc || matchContent || matchClass || matchTeacher,
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'due-asc') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'due-desc') {
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
      if (sortBy === 'score-desc') {
        return b.maxScore - a.maxScore;
      }
      return a.title.localeCompare(b.title, 'pt-BR');
    });
  }, [
    allActivities,
    searchTerm,
    classFilter,
    subjectFilter,
    deadlineFilter,
    sortBy,
    classesMap,
    subjectsMap,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedActivities.length / pageSize),
  );
  const safePage = Math.min(page, totalPages);
  const paginatedActivities = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSortedActivities.slice(start, start + pageSize);
  }, [filteredAndSortedActivities, safePage]);

  // Métricas Resumidas Reais
  const metrics = useMemo(() => {
    const upcomingCount = allActivities.filter(
      (a) => !isDeadlinePast(a.dueDate),
    ).length;
    const totalMaxScore = allActivities.reduce((acc, a) => acc + a.maxScore, 0);
    const avgMaxScore =
      allActivities.length > 0 ? totalMaxScore / allActivities.length : 0;
    return {
      total: allActivities.length,
      upcomingCount,
      avgMaxScore,
    };
  }, [allActivities]);

  const openCreateModal = () => {
    setFormError(null);
    const firstClass = userVisibleClasses[0];
    const firstContent = firstClass
      ? allContents.find((c) => c.subjectId === firstClass.subjectId) ||
        allContents[0]
      : allContents[0];

    createForm.reset({
      title: '',
      description: '',
      classId: firstClass?.id || '',
      contentId: firstContent?.id || '',
      dueDate: defaultDueDate,
      maxScore: 10,
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (act: Activity) => {
    setFormError(null);
    setEditingActivity(act);
    const formattedDate = act.dueDate
      ? new Date(act.dueDate).toISOString().split('T')[0]
      : defaultDueDate;

    updateForm.reset({
      title: act.title,
      description: act.description ?? '',
      classId: act.classId,
      contentId: act.contentId,
      dueDate: formattedDate,
      maxScore: act.maxScore,
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/10 text-[#1E3A8A] flex items-center justify-center shrink-0 border border-[#2563EB]/20">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
                Gestão de Atividades Acadêmicas
              </h1>
              <Badge variant={canWrite ? 'primary' : 'info'}>
                {canWrite
                  ? `Gestão de Atividades (${role})`
                  : 'Escopo ALUNO (Somente Leitura)'}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              {role === 'ADMIN' &&
                'Administração de avaliações, trabalhos e atividades vinculados a turmas letivas e conteúdos programáticos.'}
              {role === 'PROFESSOR' &&
                'Criação e acompanhamento de atividades avaliativas exclusivamente para as turmas sob sua regência.'}
              {role === 'ALUNO' &&
                'Consulta das atividades avaliativas, prazos de entrega e pontuações máximas das suas turmas ativas.'}
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

          {canWrite && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openCreateModal}
            >
              Nova Atividade
            </Button>
          )}
        </div>
      </div>

      {/* Aviso de Isolamento Horizontal */}
      {role !== 'ADMIN' && (
        <Alert
          variant="info"
          title={
            role === 'PROFESSOR'
              ? 'Isolamento Horizontal Docente em Atividades'
              : 'Isolamento Horizontal de Atividades do Estudante'
          }
        >
          {role === 'PROFESSOR'
            ? 'A API autoriza criar, editar, consultar e excluir exclusivamente atividades associadas às turmas em que você é o professor responsável.'
            : 'Você visualiza exclusivamente as atividades das turmas nas quais possui matrícula com status ACTIVE.'}
        </Alert>
      )}

      {/* Indicadores Resumidos Reais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total de Atividades"
          value={metrics.total}
          subtitle="Avaliações registradas no escopo"
          icon={<ClipboardCheck className="w-5 h-5" />}
          tone="primary"
        />
        <StatCard
          title="Prazo em Aberto / Vigente"
          value={metrics.upcomingCount}
          subtitle="Atividades com entrega hoje ou futura"
          icon={<Calendar className="w-5 h-5" />}
          tone="success"
        />
        <StatCard
          title="Pontuação Máxima Média"
          value={`${formatDecimal(metrics.avgMaxScore, 1)} pts`}
          subtitle="Valor médio das avaliações listadas"
          icon={<Award className="w-5 h-5" />}
          tone="navy"
        />
      </div>

      {/* Barra de Busca, Filtros e Ordenação */}
      <Card
        title="Atividades Avaliativas"
        subtitle="Filtros aplicados localmente sobre os registros carregados por título, conteúdo, turma, disciplina ou prazo."
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-5">
          <div className="md:col-span-4">
            <SearchInput
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                setPage(1);
              }}
              placeholder="Buscar por atividade, conteúdo ou turma..."
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            <select
              aria-label="Filtrar atividades por turma"
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="ALL">Todas as turmas</option>
              {userVisibleClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.year}/{cls.semester}º)
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filtrar atividades por prazo"
              value={deadlineFilter}
              onChange={(e) => {
                setDeadlineFilter(e.target.value as DeadlineFilter);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="ALL">Todos os prazos</option>
              <option value="UPCOMING">Prazo vigente</option>
              <option value="PAST">Prazo encerrado</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Ordenar atividades"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="due-asc">Prazo: Mais próximo primeiro</option>
              <option value="due-desc">Prazo: Mais distante primeiro</option>
              <option value="title-asc">Título (A-Z)</option>
              <option value="score-desc">Maior pontuação máxima</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoadingState message="Carregando atividades acadêmicas..." />
        ) : isError ? (
          <ErrorState
            title="Falha ao carregar atividades"
            message={getApiErrorMessage(
              error,
              'Não foi possível obter a lista de atividades.',
            )}
            onRetry={() => void refetch()}
          />
        ) : filteredAndSortedActivities.length === 0 ? (
          <EmptyState
            title={
              searchTerm ||
              classFilter !== 'ALL' ||
              subjectFilter !== 'ALL' ||
              deadlineFilter !== 'ALL'
                ? 'Nenhuma atividade encontrada para os filtros aplicados'
                : 'Nenhuma atividade cadastrada no escopo atual'
            }
            description={
              searchTerm ||
              classFilter !== 'ALL' ||
              subjectFilter !== 'ALL' ||
              deadlineFilter !== 'ALL'
                ? 'Tente ajustar os termos de busca ou redefinir os filtros de turma e prazo.'
                : canWrite
                  ? 'Clique em "Nova Atividade" para criar uma atividade avaliativa associada a uma turma e a um conteúdo programático.'
                  : 'Não há atividades avaliativas registradas para suas turmas no momento.'
            }
            action={
              canWrite &&
              !searchTerm &&
              classFilter === 'ALL' &&
              subjectFilter === 'ALL' &&
              deadlineFilter === 'ALL' ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={openCreateModal}
                >
                  Cadastrar Atividade
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
                    <th className="py-3 px-4">Atividade</th>
                    <th className="py-3 px-4">Conteúdo & Disciplina</th>
                    <th className="py-3 px-4">Turma & Professor</th>
                    <th className="py-3 px-4">Data de Entrega</th>
                    <th className="py-3 px-4">Nota Máx.</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 text-sm">
                  {paginatedActivities.map((act) => {
                    const past = isDeadlinePast(act.dueDate);
                    const subjectName = getSubjectNameForActivity(act);
                    return (
                      <tr
                        key={act.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-semibold text-[#0F172A]">
                            {act.title}
                          </p>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {act.description || 'Sem descrição complementar.'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-800 text-xs">
                            {act.content?.title ||
                              `Conteúdo ${act.contentId.slice(0, 8)}`}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {subjectName}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-800 text-xs">
                            {act.class?.name ||
                              classesMap.get(act.classId)?.name ||
                              `Turma ${act.classId.slice(0, 8)}`}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Prof.: {act.class?.teacher?.name || '—'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-xs font-medium text-[#0F172A]">
                              {formatDate(act.dueDate)}
                            </span>
                            <Badge variant={past ? 'neutral' : 'success'}>
                              {past ? 'Prazo Encerrado' : 'No Prazo'}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="primary">
                            {formatDecimal(act.maxScore, 1)} pts
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                              onClick={() => setViewingActivityId(act.id)}
                            >
                              Detalhes
                            </Button>
                            {canWrite && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  leftIcon={<Pencil className="w-3.5 h-3.5" />}
                                  onClick={() => openEditModal(act)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                  onClick={() => setDeletingActivity(act)}
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
              {paginatedActivities.map((act) => {
                const past = isDeadlinePast(act.dueDate);
                return (
                  <div
                    key={act.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#0F172A] text-sm">
                          {act.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {act.class?.name ||
                            classesMap.get(act.classId)?.name ||
                            'Turma'}
                        </p>
                      </div>
                      <Badge variant="primary">
                        {formatDecimal(act.maxScore, 1)} pts
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-200/70">
                      <p>
                        <span className="font-semibold text-slate-700">
                          Conteúdo:
                        </span>{' '}
                        {act.content?.title || act.contentId.slice(0, 8)}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-700">
                          Disciplina:
                        </span>{' '}
                        {getSubjectNameForActivity(act)}
                      </p>
                      <p className="flex items-center justify-between">
                        <span>
                          <strong className="text-slate-700">Entrega:</strong>{' '}
                          {formatDate(act.dueDate)}
                        </span>
                        <Badge variant={past ? 'neutral' : 'success'}>
                          {past ? 'Encerrado' : 'No Prazo'}
                        </Badge>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200/80">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => setViewingActivityId(act.id)}
                      >
                        Detalhes
                      </Button>
                      {canWrite && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            leftIcon={<Pencil className="w-3.5 h-3.5" />}
                            onClick={() => openEditModal(act)}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                            onClick={() => setDeletingActivity(act)}
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
              total={filteredAndSortedActivities.length}
              limit={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* Modal de Detalhes da Atividade (GET /api/activities/:id) */}
      <Modal
        isOpen={Boolean(viewingActivityId)}
        onClose={() => setViewingActivityId(null)}
        title="Ficha Detalhada da Atividade"
        maxWidthClass="max-w-2xl"
        footer={
          <Button
            type="button"
            variant="outline"
            onClick={() => setViewingActivityId(null)}
          >
            Fechar
          </Button>
        }
      >
        {isDetailLoading ? (
          <LoadingState message="Consultando detalhes da atividade..." />
        ) : isDetailError || !activityDetail ? (
          <ErrorState
            title="Não foi possível carregar os detalhes da atividade"
            message={getApiErrorMessage(
              detailError,
              'Verifique sua permissão de acesso ou tente novamente.',
            )}
          />
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-base font-bold text-[#0F172A]">
                  {activityDetail.title}
                </p>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  ID: {activityDetail.id}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary">
                  Nota Máx.: {formatDecimal(activityDetail.maxScore, 1)} pts
                </Badge>
                <Badge
                  variant={
                    isDeadlinePast(activityDetail.dueDate)
                      ? 'neutral'
                      : 'success'
                  }
                >
                  Entrega: {formatDate(activityDetail.dueDate)}
                </Badge>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 text-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Instruções e Critérios da Atividade
              </p>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                {activityDetail.description ||
                  'Nenhuma instrução adicional informada para esta atividade.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <div className="flex items-center gap-1.5 text-[#1E3A8A] font-semibold">
                  <FileText className="w-4 h-4" />
                  <span>Conteúdo Programático Base</span>
                </div>
                <p className="text-sm font-bold text-[#0F172A] mt-1">
                  {activityDetail.content?.title || activityDetail.contentId}
                </p>
                <p className="text-slate-600 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>{getSubjectNameForActivity(activityDetail)}</span>
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <div className="flex items-center gap-1.5 text-[#1E3A8A] font-semibold">
                  <School className="w-4 h-4" />
                  <span>Turma & Professor Responsável</span>
                </div>
                <p className="text-sm font-bold text-[#0F172A] mt-1">
                  {activityDetail.class?.name || activityDetail.classId}
                  {activityDetail.class
                    ? ` (${activityDetail.class.year}/${activityDetail.class.semester}º Sem)`
                    : ''}
                </p>
                <p className="text-slate-600">
                  Docente:{' '}
                  <strong>
                    {activityDetail.class?.teacher?.name || 'Não informado'}
                  </strong>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200">
              <div className="p-2.5 rounded-lg bg-slate-50">
                <span className="text-slate-500">Criada em: </span>
                <strong className="text-[#0F172A]">
                  {formatDate(activityDetail.createdAt)}
                </strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50">
                <span className="text-slate-500">Atualizada em: </span>
                <strong className="text-[#0F172A]">
                  {formatDate(activityDetail.updatedAt)}
                </strong>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Criação de Atividade (POST /api/activities) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!createMutation.isPending) setIsCreateOpen(false);
        }}
        title="Cadastrar Nova Atividade Avaliativa"
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
            <Alert variant="error" title="Não foi possível criar a atividade">
              {formError}
            </Alert>
          )}

          <div>
            <Label htmlFor="create-activity-title" required>
              Título da Atividade
            </Label>
            <Input
              id="create-activity-title"
              placeholder="Ex.: Avaliação Bimestral 1 - Resolução de Problemas"
              error={createForm.formState.errors.title?.message}
              {...createForm.register('title')}
            />
          </div>

          <div>
            <Label htmlFor="create-activity-class" required>
              Turma Letiva
            </Label>
            <select
              id="create-activity-class"
              disabled={isClassesLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...createForm.register('classId')}
            >
              <option value="">
                {isClassesLoading
                  ? 'Carregando turmas...'
                  : 'Selecione a turma...'}
              </option>
              {userVisibleClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.year}/{cls.semester}º Sem) —{' '}
                  {cls.subject?.name || 'Disciplina'}
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
            <Label htmlFor="create-activity-content" required>
              Conteúdo Programático Associado
            </Label>
            <select
              id="create-activity-content"
              disabled={isContentsLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...createForm.register('contentId')}
            >
              <option value="">
                {isContentsLoading
                  ? 'Carregando conteúdos...'
                  : 'Selecione o conteúdo programático...'}
              </option>
              {compatibleContentsForCreate.map((cnt) => (
                <option key={cnt.id} value={cnt.id}>
                  {cnt.title} (
                  {cnt.subject?.name ||
                    subjectsMap.get(cnt.subjectId) ||
                    'Disciplina'}
                  )
                </option>
              ))}
            </select>
            {createForm.formState.errors.contentId?.message && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {createForm.formState.errors.contentId.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="create-activity-duedate" required>
                Data de Entrega / Avaliação
              </Label>
              <Input
                id="create-activity-duedate"
                type="date"
                error={createForm.formState.errors.dueDate?.message}
                {...createForm.register('dueDate')}
              />
            </div>

            <div>
              <Label htmlFor="create-activity-maxscore" required>
                Nota Máxima (pts)
              </Label>
              <Input
                id="create-activity-maxscore"
                type="number"
                step="0.5"
                min="0.5"
                max="100"
                error={createForm.formState.errors.maxScore?.message}
                {...createForm.register('maxScore')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="create-activity-desc">
              Instruções da Atividade (Opcional)
            </Label>
            <textarea
              id="create-activity-desc"
              rows={3}
              placeholder="Critérios de avaliação, formato de entrega ou observações..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...createForm.register('description')}
            />
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
              Cadastrar Atividade
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Edição de Atividade (PUT /api/activities/:id) */}
      <Modal
        isOpen={Boolean(editingActivity)}
        onClose={() => {
          if (!updateMutation.isPending) setEditingActivity(null);
        }}
        title="Editar Atividade Avaliativa"
        maxWidthClass="max-w-xl"
      >
        <form
          onSubmit={updateForm.handleSubmit((data) => {
            if (!editingActivity) return;
            updateMutation.mutate({ id: editingActivity.id, input: data });
          })}
          className="space-y-4"
          noValidate
        >
          {formError && (
            <Alert variant="error" title="Erro ao atualizar atividade">
              {formError}
            </Alert>
          )}

          <div>
            <Label htmlFor="edit-activity-title" required>
              Título da Atividade
            </Label>
            <Input
              id="edit-activity-title"
              error={updateForm.formState.errors.title?.message}
              {...updateForm.register('title')}
            />
          </div>

          <div>
            <Label htmlFor="edit-activity-class" required>
              Turma Letiva
            </Label>
            <select
              id="edit-activity-class"
              disabled={isClassesLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...updateForm.register('classId')}
            >
              <option value="">Selecione a turma...</option>
              {userVisibleClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.year}/{cls.semester}º Sem) —{' '}
                  {cls.subject?.name || 'Disciplina'}
                </option>
              ))}
            </select>
            {updateForm.formState.errors.classId?.message && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {updateForm.formState.errors.classId.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="edit-activity-content" required>
              Conteúdo Programático Associado
            </Label>
            <select
              id="edit-activity-content"
              disabled={isContentsLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...updateForm.register('contentId')}
            >
              <option value="">Selecione o conteúdo programático...</option>
              {compatibleContentsForEdit.map((cnt) => (
                <option key={cnt.id} value={cnt.id}>
                  {cnt.title} (
                  {cnt.subject?.name ||
                    subjectsMap.get(cnt.subjectId) ||
                    'Disciplina'}
                  )
                </option>
              ))}
            </select>
            {updateForm.formState.errors.contentId?.message && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {updateForm.formState.errors.contentId.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-activity-duedate" required>
                Data de Entrega / Avaliação
              </Label>
              <Input
                id="edit-activity-duedate"
                type="date"
                error={updateForm.formState.errors.dueDate?.message}
                {...updateForm.register('dueDate')}
              />
            </div>

            <div>
              <Label htmlFor="edit-activity-maxscore" required>
                Nota Máxima (pts)
              </Label>
              <Input
                id="edit-activity-maxscore"
                type="number"
                step="0.5"
                min="0.5"
                max="100"
                error={updateForm.formState.errors.maxScore?.message}
                {...updateForm.register('maxScore')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-activity-desc">
              Instruções da Atividade (Opcional)
            </Label>
            <textarea
              id="edit-activity-desc"
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...updateForm.register('description')}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => setEditingActivity(null)}
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

      {/* Confirmação de Exclusão de Atividade (DELETE /api/activities/:id) */}
      <ConfirmDialog
        isOpen={Boolean(deletingActivity)}
        onClose={() => setDeletingActivity(null)}
        onConfirm={() => {
          if (deletingActivity) deleteMutation.mutate(deletingActivity.id);
        }}
        title="Excluir Atividade Avaliativa"
        description="Proteção de histórico acadêmico: a exclusão só é permitida quando não existem notas (Grades) lançadas para esta atividade (HTTP 409 ACTIVITY_HAS_GRADES)."
        itemName={
          deletingActivity
            ? `${deletingActivity.title} (${formatDecimal(deletingActivity.maxScore, 1)} pts)`
            : undefined
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
