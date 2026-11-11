import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FileText,
  Plus,
  Eye,
  Pencil,
  Trash2,
  BookOpen,
  School,
  RefreshCw,
  Filter,
  Users,
} from 'lucide-react';
import { contentService } from '../../services/contentService';
import { subjectService } from '../../services/subjectService';
import { classService } from '../../services/classService';
import { getApiErrorMessage } from '../../services/api';
import { contentFormSchema, ContentFormInput } from '../../schemas';
import { Content } from '../../types/api.types';
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

type SortOption = 'title-asc' | 'date-desc' | 'subject-asc';

export const ContentsPage: React.FC = () => {
  const { role } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === 'ADMIN';
  const canWrite = isAdmin;

  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('title-asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Estados de Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [deletingContent, setDeletingContent] = useState<Content | null>(null);
  const [viewingContentId, setViewingContentId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Listagem completa de conteúdos (GET /api/contents — inclui subject)
  const {
    data: allContents = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['contents', 'all'],
    queryFn: () => contentService.listAll(),
  });

  // Turmas visíveis ao perfil autenticado (GET /api/classes — já isolado por perfil no Back-End)
  const { data: userVisibleClasses = [] } = useQuery({
    queryKey: ['classes', 'all'],
    queryFn: () => classService.listAll(),
  });

  // Disciplinas completas para formulários e filtros
  const { data: allSubjects = [], isLoading: isSubjectsLoading } = useQuery({
    queryKey: ['subjects', 'all'],
    queryFn: () => subjectService.listAll(),
  });

  // Consulta individual de conteúdo (GET /api/contents/:id)
  const {
    data: contentDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
  } = useQuery({
    queryKey: ['contents', 'detail', viewingContentId],
    queryFn: () => contentService.getById(viewingContentId!),
    enabled: Boolean(viewingContentId),
  });

  // Mapa de turmas e professores por subjectId (derivado das turmas visíveis ao perfil)
  const classesBySubjectMap = useMemo(() => {
    const map = new Map<
      string,
      Array<{ id: string; name: string; period: string; teacherName?: string }>
    >();
    userVisibleClasses.forEach((cls) => {
      const list = map.get(cls.subjectId) ?? [];
      list.push({
        id: cls.id,
        name: cls.name,
        period: `${cls.year}/${cls.semester}º Sem`,
        teacherName: cls.teacher?.name,
      });
      map.set(cls.subjectId, list);
    });
    return map;
  }, [userVisibleClasses]);

  // Escopo de conteúdos autorizados para o perfil logado:
  // No Back-End, GET /api/contents não recebe req.user e retorna todos os conteúdos por disciplina.
  // Para respeitar rigorosamente o isolamento de PROFESSOR e ALUNO na UI, restringimos aos subjectIds
  // das turmas às quais o PROFESSOR ou ALUNO tem acesso em GET /api/classes.
  const scopedContents = useMemo(() => {
    if (role === 'ADMIN') return allContents;
    const allowedSubjectIds = new Set(
      userVisibleClasses.map((cls) => cls.subjectId),
    );
    return allContents.filter((cnt) => allowedSubjectIds.has(cnt.subjectId));
  }, [allContents, userVisibleClasses, role]);

  // Disciplinas disponíveis para seleção no formulário (para PROFESSOR, apenas disciplinas de suas turmas)
  const selectableSubjects = useMemo(() => {
    if (role === 'ADMIN') return allSubjects;
    const allowedSubjectIds = new Set(
      userVisibleClasses.map((cls) => cls.subjectId),
    );
    const filtered = allSubjects.filter((s) => allowedSubjectIds.has(s.id));
    return filtered.length > 0 ? filtered : allSubjects;
  }, [allSubjects, userVisibleClasses, role]);

  // Formulário de Criação
  const createForm = useForm<ContentFormInput>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
      title: '',
      description: '',
      subjectId: '',
    },
  });

  // Formulário de Edição
  const updateForm = useForm<ContentFormInput>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
      title: '',
      description: '',
      subjectId: '',
    },
  });

  // Mutação: Criar Conteúdo (POST /api/contents)
  const createMutation = useMutation({
    mutationFn: (input: ContentFormInput) =>
      contentService.create({
        title: input.title.trim(),
        description: input.description?.trim() || undefined,
        subjectId: input.subjectId,
      }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['contents'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Conteúdo cadastrado com sucesso!',
        `"${created.title}" foi registrado no plano pedagógico.`,
      );
      setIsCreateOpen(false);
      createForm.reset({ title: '', description: '', subjectId: '' });
      setFormError(null);
    },
    onError: (err) => {
      setFormError(
        getApiErrorMessage(err, 'Não foi possível cadastrar o conteúdo.'),
      );
    },
  });

  // Mutação: Editar Conteúdo (PUT /api/contents/:id)
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContentFormInput }) =>
      contentService.update(id, {
        title: input.title.trim(),
        description: input.description?.trim() || undefined,
        subjectId: input.subjectId,
      }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['contents'] });
      void queryClient.invalidateQueries({ queryKey: ['activities'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Conteúdo atualizado!',
        `As alterações em "${updated.title}" foram salvas.`,
      );
      setEditingContent(null);
      setFormError(null);
    },
    onError: (err) => {
      setFormError(
        getApiErrorMessage(err, 'Não foi possível atualizar o conteúdo.'),
      );
    },
  });

  // Mutação: Excluir Conteúdo (DELETE /api/contents/:id)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['contents'] });
      void queryClient.invalidateQueries({ queryKey: ['activities'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Conteúdo excluído',
        'O conteúdo programático foi removido com sucesso.',
      );
      setDeletingContent(null);
    },
    onError: (err) => {
      toast.error(
        'Não foi possível excluir o conteúdo',
        getApiErrorMessage(
          err,
          'Verifique se há dependências vinculadas a este conteúdo.',
        ),
      );
      setDeletingContent(null);
    },
  });

  // Filtragem e Ordenação Client-Side
  const filteredAndSortedContents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = scopedContents.filter((cnt) => {
      if (subjectFilter !== 'ALL' && cnt.subjectId !== subjectFilter) {
        return false;
      }
      if (classFilter !== 'ALL') {
        const targetClass = userVisibleClasses.find(
          (c) => c.id === classFilter,
        );
        if (!targetClass || targetClass.subjectId !== cnt.subjectId) {
          return false;
        }
      }
      if (!normalizedSearch) return true;

      const matchTitle = cnt.title.toLowerCase().includes(normalizedSearch);
      const matchDesc = cnt.description
        ?.toLowerCase()
        .includes(normalizedSearch);
      const matchSubject = cnt.subject?.name
        ?.toLowerCase()
        .includes(normalizedSearch);

      return Boolean(matchTitle || matchDesc || matchSubject);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'date-desc') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'subject-asc') {
        return (a.subject?.name || '').localeCompare(
          b.subject?.name || '',
          'pt-BR',
        );
      }
      return a.title.localeCompare(b.title, 'pt-BR');
    });
  }, [
    scopedContents,
    searchTerm,
    subjectFilter,
    classFilter,
    sortBy,
    userVisibleClasses,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedContents.length / pageSize),
  );
  const safePage = Math.min(page, totalPages);
  const paginatedContents = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSortedContents.slice(start, start + pageSize);
  }, [filteredAndSortedContents, safePage]);

  const distinctSubjectsWithContents = useMemo(() => {
    const ids = new Set(scopedContents.map((c) => c.subjectId));
    return ids.size;
  }, [scopedContents]);

  const openCreateModal = () => {
    setFormError(null);
    createForm.reset({
      title: '',
      description: '',
      subjectId: selectableSubjects[0]?.id || '',
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (cnt: Content) => {
    setFormError(null);
    setEditingContent(cnt);
    updateForm.reset({
      title: cnt.title,
      description: cnt.description ?? '',
      subjectId: cnt.subjectId,
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/10 text-[#1E3A8A] flex items-center justify-center shrink-0 border border-[#2563EB]/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
                Gestão de Conteúdos Programáticos
              </h1>
              <Badge variant={canWrite ? 'primary' : 'info'}>
                {canWrite
                  ? 'Acesso Administrativo (CRUD)'
                  : `Escopo ${role} (Somente Leitura)`}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              {role === 'ADMIN' &&
                'Gerenciamento institucional de ementas, unidades programáticas e materiais didáticos vinculados às disciplinas.'}
              {role === 'PROFESSOR' &&
                'Consulta dos conteúdos programáticos oficiais das disciplinas ministradas nas turmas sob sua responsabilidade.'}
              {role === 'ALUNO' &&
                'Consulta dos conteúdos programáticos disponibilizados nas disciplinas das turmas em que você está matriculado.'}
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
              Novo Conteúdo
            </Button>
          )}
        </div>
      </div>

      {/* Aviso de Escopo Pedagógico */}
      {role !== 'ADMIN' && (
        <Alert
          variant="info"
          title={
            role === 'PROFESSOR'
              ? 'Escopo Docente por Disciplina e Turma (Somente Leitura)'
              : 'Conteúdos das Suas Turmas Ativas (Somente Leitura)'
          }
        >
          {role === 'PROFESSOR'
            ? 'Por segurança e integridade curricular, conteúdos programáticos são compartilhados por disciplina (Subject) e gerenciados pela administração. Você visualiza os conteúdos das disciplinas vinculadas às suas turmas e pode associá-los às suas Atividades avaliativas.'
            : 'Você visualiza exclusivamente os conteúdos programáticos pertencentes às disciplinas das turmas em que possui matrícula ativa (ACTIVE).'}
        </Alert>
      )}

      {/* Indicadores Resumidos Reais (Escopo do Perfil) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={
            isAdmin
              ? 'Total de Conteúdos'
              : 'Conteúdos no Escopo do Perfil'
          }
          value={scopedContents.length}
          subtitle={
            isAdmin
              ? 'Unidades programáticas cadastradas'
              : 'Filtrados pelas disciplinas das suas turmas'
          }
          icon={<FileText className="w-5 h-5" />}
          tone="primary"
        />
        <StatCard
          title={
            isAdmin
              ? 'Disciplinas Contempladas'
              : 'Disciplinas do Seu Escopo'
          }
          value={distinctSubjectsWithContents}
          subtitle="Disciplinas com conteúdos disponíveis"
          icon={<BookOpen className="w-5 h-5" />}
          tone="navy"
        />
        <StatCard
          title={
            isAdmin ? 'Turmas Cadastradas' : 'Suas Turmas Vinculadas'
          }
          value={userVisibleClasses.length}
          subtitle="Turmas que consomem a matriz curricular"
          icon={<School className="w-5 h-5" />}
          tone="success"
        />
      </div>

      {/* Barra de Busca, Filtros e Ordenação */}
      <Card
        title="Conteúdos Programáticos"
        subtitle="Filtros aplicados localmente sobre os registros carregados por título, descrição, disciplina ou turma associada."
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-5">
          <div className="md:col-span-5">
            <SearchInput
              value={searchTerm}
              onChange={(val) => {
                setSearchTerm(val);
                setPage(1);
              }}
              placeholder="Buscar por título, descrição ou disciplina..."
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            <select
              aria-label="Filtrar por disciplina"
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="ALL">Todas as disciplinas</option>
              {selectableSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filtrar por turma relacionada"
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
              aria-label="Ordenar conteúdos"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="title-asc">Título (A-Z)</option>
              <option value="date-desc">Mais recentes</option>
              <option value="subject-asc">Disciplina (A-Z)</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoadingState message="Carregando conteúdos programáticos..." />
        ) : isError ? (
          <ErrorState
            title="Falha ao carregar conteúdos"
            message={getApiErrorMessage(
              error,
              'Não foi possível obter a lista de conteúdos.',
            )}
            onRetry={() => void refetch()}
          />
        ) : filteredAndSortedContents.length === 0 ? (
          <EmptyState
            title={
              searchTerm || subjectFilter !== 'ALL' || classFilter !== 'ALL'
                ? 'Nenhum conteúdo encontrado para os filtros aplicados'
                : 'Nenhum conteúdo programático cadastrado no escopo atual'
            }
            description={
              searchTerm || subjectFilter !== 'ALL' || classFilter !== 'ALL'
                ? 'Tente ajustar os termos da busca ou limpar os filtros de disciplina e turma.'
                : canWrite
                  ? 'Clique em "Novo Conteúdo" para registrar um tópico programático vinculado a uma disciplina.'
                  : 'Não há conteúdos publicados para as disciplinas de suas turmas no momento.'
            }
            action={
              canWrite &&
              !searchTerm &&
              subjectFilter === 'ALL' &&
              classFilter === 'ALL' ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={openCreateModal}
                >
                  Cadastrar Conteúdo
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
                    <th className="py-3 px-4">Título & Descrição</th>
                    <th className="py-3 px-4">Disciplina</th>
                    <th className="py-3 px-4">Turmas & Professor Associado</th>
                    <th className="py-3 px-4">Publicação</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 text-sm">
                  {paginatedContents.map((cnt) => {
                    const relatedClasses =
                      classesBySubjectMap.get(cnt.subjectId) ?? [];
                    return (
                      <tr
                        key={cnt.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-semibold text-[#0F172A]">
                            {cnt.title}
                          </p>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {cnt.description || 'Sem descrição detalhada.'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="primary">
                            {cnt.subject?.name ||
                              `Disciplina ${cnt.subjectId.slice(0, 8)}`}
                          </Badge>
                          {cnt.subject?.workload && (
                            <p className="text-[11px] text-slate-500 mt-1">
                              Carga: {cnt.subject.workload}h
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {relatedClasses.length > 0 ? (
                            <div className="space-y-0.5">
                              <p className="font-medium text-slate-800">
                                {relatedClasses
                                  .map((c) => `${c.name} (${c.period})`)
                                  .join(', ')}
                              </p>
                              <p className="text-slate-500">
                                Prof.:{' '}
                                {Array.from(
                                  new Set(
                                    relatedClasses
                                      .map((c) => c.teacherName)
                                      .filter(Boolean),
                                  ),
                                ).join(', ') || '—'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400">
                              Conteúdo da disciplina base
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {formatDate(cnt.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                              onClick={() => setViewingContentId(cnt.id)}
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
                                  onClick={() => openEditModal(cnt)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                  onClick={() => setDeletingContent(cnt)}
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
              {paginatedContents.map((cnt) => {
                const relatedClasses =
                  classesBySubjectMap.get(cnt.subjectId) ?? [];
                return (
                  <div
                    key={cnt.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#0F172A] text-sm">
                          {cnt.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {cnt.description || 'Sem descrição detalhada.'}
                        </p>
                      </div>
                      <Badge variant="primary">
                        {cnt.subject?.name || 'Disciplina'}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-200/70">
                      {relatedClasses.length > 0 && (
                        <p>
                          <span className="font-semibold text-slate-700">
                            Turma(s):
                          </span>{' '}
                          {relatedClasses.map((c) => c.name).join(', ')}
                        </p>
                      )}
                      <p>
                        <span className="font-semibold text-slate-700">
                          Publicação:
                        </span>{' '}
                        {formatDate(cnt.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200/80">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => setViewingContentId(cnt.id)}
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
                            onClick={() => openEditModal(cnt)}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                            onClick={() => setDeletingContent(cnt)}
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
              total={filteredAndSortedContents.length}
              limit={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* Modal de Detalhes do Conteúdo (GET /api/contents/:id) */}
      <Modal
        isOpen={Boolean(viewingContentId)}
        onClose={() => setViewingContentId(null)}
        title="Detalhes do Conteúdo Programático"
        maxWidthClass="max-w-2xl"
        footer={
          <Button
            type="button"
            variant="outline"
            onClick={() => setViewingContentId(null)}
          >
            Fechar
          </Button>
        }
      >
        {isDetailLoading ? (
          <LoadingState message="Consultando dados do conteúdo..." />
        ) : isDetailError || !contentDetail ? (
          <ErrorState
            title="Não foi possível carregar os detalhes do conteúdo"
            message={getApiErrorMessage(
              detailError,
              'Tente novamente em instantes.',
            )}
          />
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-base font-bold text-[#0F172A]">
                  {contentDetail.title}
                </p>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  ID: {contentDetail.id}
                </p>
              </div>
              <Badge variant="primary">
                {contentDetail.subject?.name ||
                  `Disciplina ${contentDetail.subjectId}`}
              </Badge>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 text-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Descrição Pedagógica / Ementa do Tópico
              </p>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                {contentDetail.description ||
                  'Nenhuma descrição complementar cadastrada para este conteúdo.'}
              </p>
            </div>

            {/* Turmas e Professores que ministram esta Disciplina no escopo visível */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
              <p className="font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#2563EB]" />
                Turmas & Professores Vinculados à Disciplina
              </p>
              {(classesBySubjectMap.get(contentDetail.subjectId) ?? []).length >
              0 ? (
                <div className="space-y-1.5">
                  {(classesBySubjectMap.get(contentDetail.subjectId) ?? []).map(
                    (cls) => (
                      <div
                        key={cls.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <span className="font-semibold text-[#0F172A]">
                          {cls.name} ({cls.period})
                        </span>
                        <span className="text-slate-600">
                          Docente: <strong>{cls.teacherName || '—'}</strong>
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="text-slate-500">
                  Nenhuma turma ativa associada a esta disciplina no escopo
                  atual.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200">
              <div className="p-2.5 rounded-lg bg-slate-50">
                <span className="text-slate-500">Publicado em: </span>
                <strong className="text-[#0F172A]">
                  {formatDate(contentDetail.createdAt)}
                </strong>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50">
                <span className="text-slate-500">Atualizado em: </span>
                <strong className="text-[#0F172A]">
                  {formatDate(contentDetail.updatedAt)}
                </strong>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Criação de Conteúdo (POST /api/contents) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!createMutation.isPending) setIsCreateOpen(false);
        }}
        title="Publicar Novo Conteúdo Programático"
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
            <Alert variant="error" title="Não foi possível criar o conteúdo">
              {formError}
            </Alert>
          )}

          <div>
            <Label htmlFor="create-content-title" required>
              Título do Conteúdo
            </Label>
            <Input
              id="create-content-title"
              placeholder="Ex.: Equações de 2º Grau e Funções Quadráticas"
              error={createForm.formState.errors.title?.message}
              {...createForm.register('title')}
            />
          </div>

          <div>
            <Label htmlFor="create-content-subject" required>
              Disciplina Vinculada
            </Label>
            <select
              id="create-content-subject"
              disabled={isSubjectsLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...createForm.register('subjectId')}
            >
              <option value="">
                {isSubjectsLoading
                  ? 'Carregando disciplinas...'
                  : 'Selecione a disciplina...'}
              </option>
              {selectableSubjects.map((sub) => (
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
            <Label htmlFor="create-content-desc">
              Descrição Pedagógica / Objetivos de Aprendizagem (Opcional)
            </Label>
            <textarea
              id="create-content-desc"
              rows={4}
              placeholder="Descreva os tópicos abordados, referências bibliográficas ou orientações de estudo..."
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
              Salvar Conteúdo
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Edição de Conteúdo (PUT /api/contents/:id) */}
      <Modal
        isOpen={Boolean(editingContent)}
        onClose={() => {
          if (!updateMutation.isPending) setEditingContent(null);
        }}
        title="Editar Conteúdo Programático"
        maxWidthClass="max-w-xl"
      >
        <form
          onSubmit={updateForm.handleSubmit((data) => {
            if (!editingContent) return;
            updateMutation.mutate({ id: editingContent.id, input: data });
          })}
          className="space-y-4"
          noValidate
        >
          {formError && (
            <Alert variant="error" title="Erro ao atualizar conteúdo">
              {formError}
            </Alert>
          )}

          <div>
            <Label htmlFor="edit-content-title" required>
              Título do Conteúdo
            </Label>
            <Input
              id="edit-content-title"
              error={updateForm.formState.errors.title?.message}
              {...updateForm.register('title')}
            />
          </div>

          <div>
            <Label htmlFor="edit-content-subject" required>
              Disciplina Vinculada
            </Label>
            <select
              id="edit-content-subject"
              disabled={isSubjectsLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...updateForm.register('subjectId')}
            >
              <option value="">Selecione a disciplina...</option>
              {selectableSubjects.map((sub) => (
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
            <Label htmlFor="edit-content-desc">
              Descrição Pedagógica (Opcional)
            </Label>
            <textarea
              id="edit-content-desc"
              rows={4}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              {...updateForm.register('description')}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => setEditingContent(null)}
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

      {/* Confirmação de Exclusão de Conteúdo (DELETE /api/contents/:id) */}
      <ConfirmDialog
        isOpen={Boolean(deletingContent)}
        onClose={() => setDeletingContent(null)}
        onConfirm={() => {
          if (deletingContent) deleteMutation.mutate(deletingContent.id);
        }}
        title="Excluir Conteúdo Programático"
        description="Proteção de integridade acadêmica: a exclusão só é permitida caso este conteúdo não possua nenhuma atividade avaliativa vinculada (HTTP 409 CONTENT_HAS_DEPENDENCIES)."
        itemName={deletingContent?.title}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
