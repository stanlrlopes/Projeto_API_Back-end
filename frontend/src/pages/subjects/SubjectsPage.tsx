import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BookOpen,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Clock,
  FileText,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { subjectService } from '../../services/subjectService';
import { getApiErrorMessage } from '../../services/api';
import { subjectFormSchema, SubjectFormInput } from '../../schemas';
import { Subject } from '../../types/api.types';
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

type WorkloadFilter = 'all' | 'up-to-40' | '41-to-80' | 'over-80';
type SortOption = 'name-asc' | 'workload-desc' | 'workload-asc';

export const SubjectsPage: React.FC = () => {
  const { role } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === 'ADMIN';

  const [searchTerm, setSearchTerm] = useState('');
  const [workloadFilter, setWorkloadFilter] = useState<WorkloadFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Estados de Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [viewingSubjectId, setViewingSubjectId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Listagem completa de disciplinas (GET /api/subjects)
  const {
    data: allSubjects = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['subjects', 'all'],
    queryFn: () => subjectService.listAll(),
  });

  // Consulta individual de disciplina (GET /api/subjects/:id)
  const {
    data: subjectDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
  } = useQuery({
    queryKey: ['subjects', 'detail', viewingSubjectId],
    queryFn: () => subjectService.getById(viewingSubjectId!),
    enabled: Boolean(viewingSubjectId),
  });

  // Formulário de Criação
  const createForm = useForm<SubjectFormInput>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      workload: 60,
    },
  });

  // Formulário de Edição
  const updateForm = useForm<SubjectFormInput>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      workload: 60,
    },
  });

  // Mutação: Criar Disciplina
  const createMutation = useMutation({
    mutationFn: (input: SubjectFormInput) =>
      subjectService.create({
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        workload: Number(input.workload),
      }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['subjects'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Disciplina cadastrada com sucesso!',
        `${created.name} (${created.workload}h) foi adicionada à matriz curricular.`,
      );
      setIsCreateOpen(false);
      createForm.reset();
      setFormError(null);
    },
    onError: (err) => {
      setFormError(
        getApiErrorMessage(err, 'Não foi possível cadastrar a disciplina.'),
      );
    },
  });

  // Mutação: Editar Disciplina
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: SubjectFormInput }) =>
      subjectService.update(id, {
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        workload: Number(input.workload),
      }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['subjects'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Disciplina atualizada!',
        `${updated.name} (${updated.workload}h) foi atualizada com sucesso.`,
      );
      setEditingSubject(null);
      setFormError(null);
    },
    onError: (err) => {
      setFormError(
        getApiErrorMessage(
          err,
          'Não foi possível atualizar os dados da disciplina.',
        ),
      );
    },
  });

  // Mutação: Excluir Disciplina
  const deleteMutation = useMutation({
    mutationFn: (id: string) => subjectService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subjects'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Disciplina excluída',
        'A disciplina foi removida da matriz curricular.',
      );
      setDeletingSubject(null);
    },
    onError: (err) => {
      toast.error(
        'Exclusão bloqueada por vínculo ativo',
        getApiErrorMessage(
          err,
          'Não é possível excluir uma disciplina que possui turmas vinculadas (restrição de integridade referencial).',
        ),
      );
      setDeletingSubject(null);
    },
  });

  // Carga horária total acumulada
  const totalWorkloadHours = useMemo(
    () => allSubjects.reduce((acc, curr) => acc + (curr.workload || 0), 0),
    [allSubjects],
  );

  // Busca, filtro de carga horária e ordenação
  const filteredSubjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = allSubjects.filter((subject) => {
      const matchesQuery =
        !query ||
        subject.name.toLowerCase().includes(query) ||
        (subject.description || '').toLowerCase().includes(query);

      if (!matchesQuery) return false;

      if (workloadFilter === 'up-to-40') return subject.workload <= 40;
      if (workloadFilter === '41-to-80')
        return subject.workload >= 41 && subject.workload <= 80;
      if (workloadFilter === 'over-80') return subject.workload > 80;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'pt-BR');
      if (sortBy === 'workload-desc') return b.workload - a.workload;
      return a.workload - b.workload;
    });
  }, [allSubjects, searchTerm, workloadFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedSubjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubjects.slice(start, start + pageSize);
  }, [filteredSubjects, currentPage]);

  const handleOpenCreate = () => {
    setFormError(null);
    createForm.reset({
      name: '',
      description: '',
      workload: 60,
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setFormError(null);
    updateForm.reset({
      name: subject.name,
      description: subject.description || '',
      workload: subject.workload,
    });
    setEditingSubject(subject);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="primary">MATRIZ CURRICULAR</Badge>
            <Badge variant="neutral">PERFIL: {role}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0F172A]">
            Gestão de Disciplinas
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isAdmin
              ? 'Cadastro de componentes curriculares, definição de carga horária e ementas institucionais.'
              : 'Consulta do catálogo de disciplinas e cargas horárias da instituição.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={isFetching}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => void refetch()}
          >
            Atualizar
          </Button>

          {isAdmin && (
            <Button
              type="button"
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreate}
            >
              Nova Disciplina
            </Button>
          )}
        </div>
      </div>

      {/* Cards de Resumo Reais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total de Disciplinas"
          value={allSubjects.length}
          subtitle="Componentes em GET /api/subjects"
          badgeText="Currículo"
          tone="primary"
          icon={<BookOpen className="w-5 h-5" />}
        />

        <StatCard
          title="Carga Horária Acumulada"
          value={`${totalWorkloadHours}h`}
          subtitle="Soma das cargas horárias ofertadas"
          badgeText="Horas-aula"
          tone="navy"
          icon={<Clock className="w-5 h-5" />}
        />

        <StatCard
          title="Disciplinas Filtradas"
          value={filteredSubjects.length}
          subtitle={
            searchTerm || workloadFilter !== 'all'
              ? 'Filtros ativos aplicados'
              : 'Exibindo catálogo completo'
          }
          badgeText={`Página ${currentPage}/${totalPages}`}
          tone="success"
          icon={<Filter className="w-5 h-5" />}
        />
      </div>

      {/* Barra de Busca, Filtros e Listagem */}
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <SearchInput
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              setPage(1);
            }}
            placeholder="Buscar disciplina por nome ou descrição..."
            className="lg:max-w-md"
          />

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="workload-filter"
                className="text-xs font-medium text-slate-600 whitespace-nowrap"
              >
                Carga horária:
              </label>
              <select
                id="workload-filter"
                value={workloadFilter}
                onChange={(e) => {
                  setWorkloadFilter(e.target.value as WorkloadFilter);
                  setPage(1);
                }}
                className="h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="all">Todas as faixas</option>
                <option value="up-to-40">Até 40 horas</option>
                <option value="41-to-80">41 a 80 horas</option>
                <option value="over-80">Acima de 80 horas</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="subject-sort"
                className="text-xs font-medium text-slate-600 whitespace-nowrap"
              >
                Ordenar:
              </label>
              <select
                id="subject-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="name-asc">Nome (A → Z)</option>
                <option value="workload-desc">Maior Carga Horária</option>
                <option value="workload-asc">Menor Carga Horária</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <LoadingState label="Carregando matriz curricular de disciplinas..." />
        ) : isError ? (
          <ErrorState
            title="Erro ao carregar disciplinas"
            message={getApiErrorMessage(
              error,
              'Não foi possível consultar a lista de disciplinas.',
            )}
            onRetry={() => void refetch()}
          />
        ) : filteredSubjects.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-6 h-6" />}
            title={
              searchTerm || workloadFilter !== 'all'
                ? 'Nenhuma disciplina encontrada para os filtros selecionados'
                : 'Nenhuma disciplina cadastrada'
            }
            description={
              searchTerm || workloadFilter !== 'all'
                ? 'Tente ajustar o termo de busca ou selecionar outra faixa de carga horária.'
                : 'Não existem disciplinas registradas no momento.'
            }
            action={
              searchTerm || workloadFilter !== 'all' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setWorkloadFilter('all');
                  }}
                >
                  Limpar Filtros
                </Button>
              ) : isAdmin ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenCreate}
                >
                  Cadastrar Primeira Disciplina
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Visão Desktop / Tablet */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/80">
                    <th className="py-3 px-4 rounded-tl-lg">
                      Nome da Disciplina
                    </th>
                    <th className="py-3 px-4">Descrição / Ementa</th>
                    <th className="py-3 px-4">Carga Horária</th>
                    <th className="py-3 px-4 text-right rounded-tr-lg">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {paginatedSubjects.map((subject) => (
                    <tr
                      key={subject.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                        {subject.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-md">
                        <p className="truncate">
                          {subject.description || (
                            <span className="italic text-slate-400">
                              Sem descrição informada
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant="info" className="tabular-nums">
                          {subject.workload} horas
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            title="Visualizar detalhes da disciplina"
                            onClick={() => setViewingSubjectId(subject.id)}
                          >
                            <Eye className="w-4 h-4 text-[#2563EB]" />
                            <span className="sr-only">Detalhes</span>
                          </Button>

                          {isAdmin && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="Editar disciplina"
                                onClick={() => handleOpenEdit(subject)}
                              >
                                <Pencil className="w-4 h-4 text-slate-600" />
                                <span className="sr-only">Editar</span>
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="Excluir disciplina"
                                onClick={() => setDeletingSubject(subject)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                                <span className="sr-only">Excluir</span>
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

            {/* Visão Smartphone (< md): Cards Estruturados */}
            <div className="md:hidden space-y-3">
              {paginatedSubjects.map((subject) => (
                <div
                  key={subject.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A] truncate">
                        {subject.name}
                      </p>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                        {subject.description || 'Sem descrição informada'}
                      </p>
                    </div>
                    <Badge variant="info" className="tabular-nums shrink-0">
                      {subject.workload}h
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/80">
                    <span>Cadastro: {formatDate(subject.createdAt)}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingSubjectId(subject.id)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detalhes
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(subject)}
                            aria-label="Editar disciplina"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => setDeletingSubject(subject)}
                            aria-label="Excluir disciplina"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              total={filteredSubjects.length}
              limit={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* Modal: Detalhes da Disciplina (GET /api/subjects/:id) */}
      <Modal
        isOpen={Boolean(viewingSubjectId)}
        onClose={() => setViewingSubjectId(null)}
        title="Detalhes da Disciplina Curricular"
        footer={
          <Button
            type="button"
            variant="primary"
            onClick={() => setViewingSubjectId(null)}
          >
            Fechar
          </Button>
        }
      >
        {isDetailLoading ? (
          <LoadingState label="Consultando disciplina em GET /api/subjects/:id..." />
        ) : isDetailError || !subjectDetail ? (
          <Alert variant="error" title="Erro ao consultar detalhes">
            {getApiErrorMessage(
              detailError,
              'Não foi possível carregar os dados desta disciplina.',
            )}
          </Alert>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">Nome da Disciplina</span>
                <span className="text-sm font-semibold text-[#0F172A]">
                  {subjectDetail.name}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">Carga Horária</span>
                <span className="text-sm font-bold text-[#2563EB] tabular-nums">
                  {subjectDetail.workload} horas
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block mb-1">
                Descrição / Ementa
              </span>
              <p className="text-slate-800 leading-relaxed">
                {subjectDetail.description ||
                  'Nenhuma descrição complementar cadastrada para esta disciplina.'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="font-mono text-[11px] text-slate-600">
                ID: {subjectDetail.id}
              </span>
              <span className="text-slate-500">
                Criada em: {formatDate(subjectDetail.createdAt)}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Cadastrar Nova Disciplina (Exclusivo ADMIN) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!createMutation.isPending) setIsCreateOpen(false);
        }}
        title="Cadastrar Nova Disciplina"
        footer={
          <>
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
              form="create-subject-form"
              variant="primary"
              isLoading={createMutation.isPending}
            >
              Salvar Disciplina
            </Button>
          </>
        }
      >
        <form
          id="create-subject-form"
          onSubmit={createForm.handleSubmit((data) =>
            createMutation.mutate(data),
          )}
          noValidate
          className="space-y-4"
        >
          {formError && (
            <Alert
              variant="error"
              title="Erro ao cadastrar"
              onClose={() => setFormError(null)}
            >
              {formError}
            </Alert>
          )}

          <Input
            label="Nome da disciplina"
            placeholder="Ex.: Engenharia de Software Aplicada"
            required
            leftIcon={<FileText className="w-4 h-4" />}
            error={createForm.formState.errors.name?.message}
            {...createForm.register('name')}
          />

          <Input
            label="Carga horária (em horas)"
            type="number"
            min={1}
            step={1}
            placeholder="Ex.: 60"
            required
            leftIcon={<Clock className="w-4 h-4" />}
            error={createForm.formState.errors.workload?.message}
            {...createForm.register('workload')}
          />

          <div>
            <Label htmlFor="create-subject-description">
              Descrição / Ementa (opcional)
            </Label>
            <textarea
              id="create-subject-description"
              rows={3}
              placeholder="Descreva os objetivos pedagógicos e conteúdos principais..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              {...createForm.register('description')}
            />
          </div>
        </form>
      </Modal>

      {/* Modal: Editar Disciplina (Exclusivo ADMIN) */}
      <Modal
        isOpen={Boolean(editingSubject)}
        onClose={() => {
          if (!updateMutation.isPending) setEditingSubject(null);
        }}
        title="Editar Disciplina"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => setEditingSubject(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="edit-subject-form"
              variant="primary"
              isLoading={updateMutation.isPending}
            >
              Salvar Alterações
            </Button>
          </>
        }
      >
        <form
          id="edit-subject-form"
          onSubmit={updateForm.handleSubmit((data) => {
            if (!editingSubject) return;
            updateMutation.mutate({ id: editingSubject.id, input: data });
          })}
          noValidate
          className="space-y-4"
        >
          {formError && (
            <Alert
              variant="error"
              title="Erro ao atualizar"
              onClose={() => setFormError(null)}
            >
              {formError}
            </Alert>
          )}

          <Input
            label="Nome da disciplina"
            required
            leftIcon={<FileText className="w-4 h-4" />}
            error={updateForm.formState.errors.name?.message}
            {...updateForm.register('name')}
          />

          <Input
            label="Carga horária (em horas)"
            type="number"
            min={1}
            step={1}
            required
            leftIcon={<Clock className="w-4 h-4" />}
            error={updateForm.formState.errors.workload?.message}
            {...updateForm.register('workload')}
          />

          <div>
            <Label htmlFor="edit-subject-description">
              Descrição / Ementa (opcional)
            </Label>
            <textarea
              id="edit-subject-description"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              {...updateForm.register('description')}
            />
          </div>
        </form>
      </Modal>

      {/* Diálogo de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={Boolean(deletingSubject)}
        onClose={() => setDeletingSubject(null)}
        onConfirm={() => {
          if (deletingSubject) {
            deleteMutation.mutate(deletingSubject.id);
          }
        }}
        title="Excluir Disciplina"
        description="Tem certeza de que deseja remover esta disciplina da matriz curricular? Caso existam turmas vinculadas a esta disciplina, a exclusão será bloqueada pela política de integridade referencial (onDelete: Restrict)."
        itemName={
          deletingSubject
            ? `${deletingSubject.name} (${deletingSubject.workload}h)`
            : undefined
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
