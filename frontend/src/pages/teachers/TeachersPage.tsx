import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Users,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Mail,
  Hash,
  User as UserIcon,
  Lock,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { teacherService } from '../../services/teacherService';
import { getApiErrorMessage } from '../../services/api';
import {
  createTeacherFormSchema,
  updateTeacherFormSchema,
  CreateTeacherFormInput,
  UpdateTeacherFormInput,
} from '../../schemas';
import { Teacher } from '../../types/api.types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/formatters';
import {
  Card,
  Badge,
  Button,
  Input,
  PasswordInput,
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

type SortOption = 'name-asc' | 'name-desc' | 'registration-asc';

export const TeachersPage: React.FC = () => {
  const { role } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === 'ADMIN';

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Estados de Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);
  const [viewingTeacherId, setViewingTeacherId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Listagem completa de professores (GET /api/teachers)
  const {
    data: allTeachers = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['teachers', 'all'],
    queryFn: () => teacherService.listAll(),
  });

  // Consulta individual de professor (GET /api/teachers/:id)
  const {
    data: teacherDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
  } = useQuery({
    queryKey: ['teachers', 'detail', viewingTeacherId],
    queryFn: () => teacherService.getById(viewingTeacherId!),
    enabled: Boolean(viewingTeacherId),
  });

  // Formulário de Criação
  const createForm = useForm<CreateTeacherFormInput>({
    resolver: zodResolver(createTeacherFormSchema),
    defaultValues: {
      linkMode: 'password',
      name: '',
      email: '',
      registration: '',
      password: '',
      userId: '',
    },
  });

  const selectedLinkMode = createForm.watch('linkMode');

  // Formulário de Edição
  const updateForm = useForm<UpdateTeacherFormInput>({
    resolver: zodResolver(updateTeacherFormSchema),
    defaultValues: {
      name: '',
      email: '',
      registration: '',
    },
  });

  // Mutação: Criar Professor
  const createMutation = useMutation({
    mutationFn: (input: CreateTeacherFormInput) => {
      const basePayload = {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        registration: input.registration.trim(),
      };
      if (input.linkMode === 'password') {
        return teacherService.create({
          ...basePayload,
          password: input.password,
        });
      }
      return teacherService.create({
        ...basePayload,
        userId: input.userId?.trim(),
      });
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['teachers'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Professor cadastrado com sucesso!',
        `${created.name} (${created.registration}) foi registrado no corpo docente.`,
      );
      setIsCreateOpen(false);
      createForm.reset();
      setFormError(null);
    },
    onError: (err) => {
      setFormError(
        getApiErrorMessage(err, 'Não foi possível cadastrar o professor.'),
      );
    },
  });

  // Mutação: Editar Professor
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateTeacherFormInput;
    }) =>
      teacherService.update(id, {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        registration: input.registration.trim(),
      }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['teachers'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Registro docente atualizado!',
        `Os dados de ${updated.name} foram atualizados com sucesso.`,
      );
      setEditingTeacher(null);
      setFormError(null);
    },
    onError: (err) => {
      setFormError(
        getApiErrorMessage(
          err,
          'Não foi possível atualizar os dados do professor.',
        ),
      );
    },
  });

  // Mutação: Excluir Professor
  const deleteMutation = useMutation({
    mutationFn: (id: string) => teacherService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teachers'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Professor excluído',
        'O registro docente foi removido com sucesso.',
      );
      setDeletingTeacher(null);
    },
    onError: (err) => {
      toast.error(
        'Exclusão bloqueada por vínculo ativo',
        getApiErrorMessage(
          err,
          'Não é possível excluir um professor que possui turmas vinculadas (restrição de integridade referencial).',
        ),
      );
      setDeletingTeacher(null);
    },
  });

  // Busca, ordenação e paginação
  const filteredTeachers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = allTeachers.filter((teacher) => {
      if (!query) return true;
      return (
        teacher.name.toLowerCase().includes(query) ||
        teacher.email.toLowerCase().includes(query) ||
        teacher.registration.toLowerCase().includes(query)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'pt-BR');
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name, 'pt-BR');
      return a.registration.localeCompare(b.registration, 'pt-BR');
    });
  }, [allTeachers, searchTerm, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedTeachers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTeachers.slice(start, start + pageSize);
  }, [filteredTeachers, currentPage]);

  const handleOpenCreate = () => {
    setFormError(null);
    createForm.reset({
      linkMode: 'password',
      name: '',
      email: '',
      registration: '',
      password: '',
      userId: '',
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setFormError(null);
    updateForm.reset({
      name: teacher.name,
      email: teacher.email,
      registration: teacher.registration,
    });
    setEditingTeacher(teacher);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="primary">CORPO DOCENTE</Badge>
            <Badge variant="neutral">PERFIL: {role}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0F172A]">
            Gestão de Professores
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isAdmin
              ? 'Cadastro transacional de docentes, manutenção de registros funcionais e controle de vínculos.'
              : 'Consulta institucional do diretório de professores da EducaAPI.'}
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
              Novo Professor
            </Button>
          )}
        </div>
      </div>

      {/* Cards de Resumo Reais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total de Professores"
          value={allTeachers.length}
          subtitle="Docentes retornados por GET /api/teachers"
          badgeText="Corpo Docente"
          tone="primary"
          icon={<Users className="w-5 h-5" />}
        />

        <StatCard
          title="Registros Exibidos"
          value={filteredTeachers.length}
          subtitle={
            searchTerm
              ? `Filtro ativo: "${searchTerm}"`
              : 'Sem filtro de busca aplicado'
          }
          badgeText={`Página ${currentPage}/${totalPages}`}
          tone="navy"
          icon={<Filter className="w-5 h-5" />}
        />

        <StatCard
          title="Permissão do Perfil"
          value={isAdmin ? 'Gestão Completa' : 'Somente Leitura'}
          subtitle={
            isAdmin
              ? 'Criação, edição e exclusão habilitadas'
              : 'Operações administrativas restritas a ADMIN'
          }
          badgeText={role || 'AUTENTICADO'}
          tone={isAdmin ? 'success' : 'neutral'}
          icon={<UserIcon className="w-5 h-5" />}
        />
      </div>

      {/* Barra de Busca, Ordenação e Listagem */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <SearchInput
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              setPage(1);
            }}
            placeholder="Buscar professor por nome, e-mail ou registro (ex.: T-1001)..."
            className="md:max-w-md"
          />

          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor="teacher-sort"
              className="text-xs font-medium text-slate-600 whitespace-nowrap"
            >
              Ordenar por:
            </label>
            <select
              id="teacher-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="name-asc">Nome (A → Z)</option>
              <option value="name-desc">Nome (Z → A)</option>
              <option value="registration-asc">Registro Funcional</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoadingState label="Carregando corpo docente da EducaAPI..." />
        ) : isError ? (
          <ErrorState
            title="Erro ao carregar professores"
            message={getApiErrorMessage(
              error,
              'Não foi possível consultar a lista de docentes.',
            )}
            onRetry={() => void refetch()}
          />
        ) : filteredTeachers.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title={
              searchTerm
                ? 'Nenhum professor encontrado para esta busca'
                : 'Nenhum professor cadastrado'
            }
            description={
              searchTerm
                ? 'Tente ajustar os termos pesquisados ou limpar o filtro.'
                : 'Não existem docentes registrados no momento.'
            }
            action={
              searchTerm ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                >
                  Limpar Busca
                </Button>
              ) : isAdmin ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={handleOpenCreate}
                >
                  Cadastrar Primeiro Professor
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
                      Registro Funcional
                    </th>
                    <th className="py-3 px-4">Nome do Docente</th>
                    <th className="py-3 px-4">E-mail Institucional</th>
                    <th className="py-3 px-4">Data de Cadastro</th>
                    <th className="py-3 px-4 text-right rounded-tr-lg">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {paginatedTeachers.map((teacher) => (
                    <tr
                      key={teacher.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant="primary" className="font-mono">
                          {teacher.registration}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                        {teacher.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {teacher.email}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 tabular-nums whitespace-nowrap">
                        {formatDate(teacher.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            title="Visualizar detalhes do professor"
                            onClick={() => setViewingTeacherId(teacher.id)}
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
                                title="Editar professor"
                                onClick={() => handleOpenEdit(teacher)}
                              >
                                <Pencil className="w-4 h-4 text-slate-600" />
                                <span className="sr-only">Editar</span>
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="Excluir professor"
                                onClick={() => setDeletingTeacher(teacher)}
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
              {paginatedTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A] truncate">
                        {teacher.name}
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        {teacher.email}
                      </p>
                    </div>
                    <Badge variant="primary" className="font-mono shrink-0">
                      {teacher.registration}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/80">
                    <span>Cadastro: {formatDate(teacher.createdAt)}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingTeacherId(teacher.id)}
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
                            onClick={() => handleOpenEdit(teacher)}
                            aria-label="Editar professor"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => setDeletingTeacher(teacher)}
                            aria-label="Excluir professor"
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
              total={filteredTeachers.length}
              limit={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* Modal: Detalhes do Professor (GET /api/teachers/:id) */}
      <Modal
        isOpen={Boolean(viewingTeacherId)}
        onClose={() => setViewingTeacherId(null)}
        title="Ficha Cadastral Docente"
        footer={
          <Button
            type="button"
            variant="primary"
            onClick={() => setViewingTeacherId(null)}
          >
            Fechar
          </Button>
        }
      >
        {isDetailLoading ? (
          <LoadingState label="Consultando dados do professor em GET /api/teachers/:id..." />
        ) : isDetailError || !teacherDetail ? (
          <Alert variant="error" title="Erro ao consultar detalhes">
            {getApiErrorMessage(
              detailError,
              'Não foi possível carregar os dados deste professor.',
            )}
          </Alert>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Nome Completo</span>
              <span className="text-sm font-semibold text-[#0F172A]">
                {teacherDetail.name}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Registro Funcional</span>
              <span className="text-sm font-mono font-semibold text-[#1E3A8A]">
                {teacherDetail.registration}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">E-mail Institucional</span>
              <span className="font-medium text-[#0F172A] break-all">
                {teacherDetail.email}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Registrado em</span>
              <span className="font-medium text-[#0F172A]">
                {formatDate(teacherDetail.createdAt)}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 sm:col-span-2">
              <span className="text-slate-500 block">
                Identificadores de Vínculo (Teacher ID / User ID)
              </span>
              <span className="font-mono text-[11px] text-slate-700 break-all">
                Teacher: {teacherDetail.id} • User: {teacherDetail.userId}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Cadastrar Novo Professor (Exclusivo ADMIN) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!createMutation.isPending) setIsCreateOpen(false);
        }}
        title="Cadastrar Novo Professor"
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
              form="create-teacher-form"
              variant="primary"
              isLoading={createMutation.isPending}
            >
              Salvar Cadastro
            </Button>
          </>
        }
      >
        <form
          id="create-teacher-form"
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

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs font-semibold text-[#0F172A] block">
              Modo de Vinculação da Conta (User ↔ Teacher)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label
                className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 ${
                  selectedLinkMode === 'password'
                    ? 'bg-blue-50 border-[#2563EB] text-[#1E3A8A] font-semibold'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  value="password"
                  {...createForm.register('linkMode')}
                />
                <span>Criar Conta + Professor (Transacional)</span>
              </label>

              <label
                className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 ${
                  selectedLinkMode === 'userId'
                    ? 'bg-blue-50 border-[#2563EB] text-[#1E3A8A] font-semibold'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  value="userId"
                  {...createForm.register('linkMode')}
                />
                <span>Vincular User ID Existente</span>
              </label>
            </div>
          </div>

          <Input
            label="Nome completo do professor"
            placeholder="Ex.: Profa. Helena Albuquerque"
            required
            leftIcon={<UserIcon className="w-4 h-4" />}
            error={createForm.formState.errors.name?.message}
            {...createForm.register('name')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="E-mail institucional"
              type="email"
              placeholder="helena@educaapi.com"
              required
              leftIcon={<Mail className="w-4 h-4" />}
              error={createForm.formState.errors.email?.message}
              {...createForm.register('email')}
            />

            <Input
              label="Registro Funcional (Registration)"
              placeholder="Ex.: T-1002"
              required
              leftIcon={<Hash className="w-4 h-4" />}
              error={createForm.formState.errors.registration?.message}
              {...createForm.register('registration')}
            />
          </div>

          {selectedLinkMode === 'password' ? (
            <PasswordInput
              label="Senha inicial de acesso (cria conta PROFESSOR automaticamente)"
              placeholder="Mínimo de 6 caracteres"
              required
              leftIcon={<Lock className="w-4 h-4" />}
              error={createForm.formState.errors.password?.message}
              {...createForm.register('password')}
            />
          ) : (
            <Input
              label="UUID do Usuário PROFESSOR existente (userId)"
              placeholder="00000000-0000-0000-0000-000000000000"
              required
              error={createForm.formState.errors.userId?.message}
              {...createForm.register('userId')}
            />
          )}
        </form>
      </Modal>

      {/* Modal: Editar Professor (Exclusivo ADMIN) */}
      <Modal
        isOpen={Boolean(editingTeacher)}
        onClose={() => {
          if (!updateMutation.isPending) setEditingTeacher(null);
        }}
        title="Editar Cadastro do Professor"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => setEditingTeacher(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="edit-teacher-form"
              variant="primary"
              isLoading={updateMutation.isPending}
            >
              Salvar Alterações
            </Button>
          </>
        }
      >
        <form
          id="edit-teacher-form"
          onSubmit={updateForm.handleSubmit((data) => {
            if (!editingTeacher) return;
            updateMutation.mutate({ id: editingTeacher.id, input: data });
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
            label="Nome completo do professor"
            required
            leftIcon={<UserIcon className="w-4 h-4" />}
            error={updateForm.formState.errors.name?.message}
            {...updateForm.register('name')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="E-mail institucional"
              type="email"
              required
              leftIcon={<Mail className="w-4 h-4" />}
              error={updateForm.formState.errors.email?.message}
              {...updateForm.register('email')}
            />

            <Input
              label="Registro Funcional (Registration)"
              required
              leftIcon={<Hash className="w-4 h-4" />}
              error={updateForm.formState.errors.registration?.message}
              {...updateForm.register('registration')}
            />
          </div>
        </form>
      </Modal>

      {/* Diálogo de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={Boolean(deletingTeacher)}
        onClose={() => setDeletingTeacher(null)}
        onConfirm={() => {
          if (deletingTeacher) {
            deleteMutation.mutate(deletingTeacher.id);
          }
        }}
        title="Excluir Registro de Professor"
        description="Tem certeza de que deseja remover este docente? Caso o professor possua turmas vinculadas no período letivo, a exclusão será bloqueada pela política de integridade referencial (onDelete: Restrict)."
        itemName={
          deletingTeacher
            ? `${deletingTeacher.name} (${deletingTeacher.registration})`
            : undefined
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
