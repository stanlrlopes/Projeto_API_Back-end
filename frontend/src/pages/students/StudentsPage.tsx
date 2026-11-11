import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  GraduationCap,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Mail,
  Calendar,
  Hash,
  User as UserIcon,
  Lock,
  Award,
  CalendarCheck,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import { getApiErrorMessage } from '../../services/api';
import {
  createStudentFormSchema,
  updateStudentFormSchema,
  CreateStudentFormInput,
  UpdateStudentFormInput,
} from '../../schemas';
import { Student } from '../../types/api.types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import {
  formatDate,
  formatDecimal,
  formatPercentage,
  MIN_PASSING_AVERAGE,
} from '../../utils/formatters';
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

function toDateInputValue(isoDate?: string): string {
  if (!isoDate) return '';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}

export const StudentsPage: React.FC = () => {
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
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Consulta completa de alunos respeitando o escopo do Back-End (ADMIN/PROFESSOR veem todos; ALUNO vê apenas o próprio)
  const {
    data: allStudents = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['students', 'all', role],
    queryFn: () => studentService.listAll(),
  });

  // Consulta detalhada de um aluno selecionado (GET /api/students/:id)
  const {
    data: studentDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
  } = useQuery({
    queryKey: ['students', 'detail', viewingStudentId],
    queryFn: () => studentService.getById(viewingStudentId!),
    enabled: Boolean(viewingStudentId),
  });

  // Indicadores acadêmicos do aluno no modal de detalhes (quando permitido pela API)
  const { data: studentIndicators, isLoading: isIndicatorsLoading } = useQuery({
    queryKey: ['students', 'indicators', viewingStudentId],
    queryFn: async () => {
      try {
        const [avg, att] = await Promise.all([
          studentService.getAverage(viewingStudentId!),
          studentService.getAttendance(viewingStudentId!),
        ]);
        return { avg, att, restricted: false };
      } catch {
        return { avg: null, att: null, restricted: true };
      }
    },
    enabled: Boolean(viewingStudentId),
  });

  // Formulário de Criação
  const createForm = useForm<CreateStudentFormInput>({
    resolver: zodResolver(createStudentFormSchema),
    defaultValues: {
      linkMode: 'password',
      name: '',
      email: '',
      registration: '',
      birthDate: '',
      password: '',
      userId: '',
    },
  });

  const selectedLinkMode = createForm.watch('linkMode');

  // Formulário de Edição
  const updateForm = useForm<UpdateStudentFormInput>({
    resolver: zodResolver(updateStudentFormSchema),
    defaultValues: {
      name: '',
      email: '',
      registration: '',
      birthDate: '',
    },
  });

  // Mutação: Criar Aluno
  const createMutation = useMutation({
    mutationFn: (input: CreateStudentFormInput) => {
      const basePayload = {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        registration: input.registration.trim(),
        birthDate: new Date(input.birthDate).toISOString(),
      };
      if (input.linkMode === 'password') {
        return studentService.create({
          ...basePayload,
          password: input.password,
        });
      }
      return studentService.create({
        ...basePayload,
        userId: input.userId?.trim(),
      });
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Aluno cadastrado com sucesso!',
        `${created.name} (${created.registration}) foi registrado na EducaAPI.`,
      );
      setIsCreateOpen(false);
      createForm.reset();
      setFormError(null);
    },
    onError: (err) => {
      setFormError(
        getApiErrorMessage(err, 'Não foi possível cadastrar o aluno.'),
      );
    },
  });

  // Mutação: Editar Aluno
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateStudentFormInput;
    }) =>
      studentService.update(id, {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        registration: input.registration.trim(),
        birthDate: new Date(input.birthDate).toISOString(),
      }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Cadastro atualizado!',
        `Os dados de ${updated.name} foram atualizados com sucesso.`,
      );
      setEditingStudent(null);
      setFormError(null);
    },
    onError: (err) => {
      setFormError(
        getApiErrorMessage(err, 'Não foi possível atualizar os dados do aluno.'),
      );
    },
  });

  // Mutação: Excluir Aluno
  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Aluno excluído',
        'O registro do estudante foi removido com sucesso.',
      );
      setDeletingStudent(null);
    },
    onError: (err) => {
      toast.error(
        'Não foi possível excluir o aluno',
        getApiErrorMessage(
          err,
          'Verifique se o registro possui vínculos que impedem a remoção.',
        ),
      );
      setDeletingStudent(null);
    },
  });

  // Busca, ordenação e paginação sobre os registros reais
  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = allStudents.filter((student) => {
      if (!query) return true;
      return (
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.registration.toLowerCase().includes(query)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'pt-BR');
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name, 'pt-BR');
      return a.registration.localeCompare(b.registration, 'pt-BR');
    });
  }, [allStudents, searchTerm, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage]);

  const handleOpenCreate = () => {
    setFormError(null);
    createForm.reset({
      linkMode: 'password',
      name: '',
      email: '',
      registration: '',
      birthDate: '',
      password: '',
      userId: '',
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setFormError(null);
    updateForm.reset({
      name: student.name,
      email: student.email,
      registration: student.registration,
      birthDate: toDateInputValue(student.birthDate),
    });
    setEditingStudent(student);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="primary">MÓDULO ACADÊMICO</Badge>
            <Badge variant="neutral">PERFIL: {role}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0F172A]">
            {role === 'ALUNO' ? 'Meu Registro de Estudante' : 'Gestão de Alunos'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {role === 'ADMIN'
              ? 'Cadastro transacional de estudantes, manutenção cadastral e consulta de indicadores individuais.'
              : role === 'PROFESSOR'
                ? 'Consulta do diretório de estudantes e indicadores acadêmicos vinculados às suas turmas.'
                : 'Visualização isolada do seu registro acadêmico oficial e indicadores individuais.'}
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
              Novo Aluno
            </Button>
          )}
        </div>
      </div>

      {/* Cards de Resumo Reais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={
            role === 'ALUNO' ? 'Meu Vínculo Acadêmico' : 'Total de Alunos'
          }
          value={allStudents.length}
          subtitle="Registros retornados por GET /api/students"
          badgeText="Sincronizado"
          tone="primary"
          icon={<GraduationCap className="w-5 h-5" />}
        />

        <StatCard
          title="Registros Exibidos"
          value={filteredStudents.length}
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
              : 'Operações de escrita restritas a ADMIN'
          }
          badgeText={role || 'AUTENTICADO'}
          tone={isAdmin ? 'success' : 'neutral'}
          icon={<UserIcon className="w-5 h-5" />}
        />
      </div>

      {/* Barra de Busca e Filtros */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <SearchInput
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              setPage(1);
            }}
            placeholder="Buscar aluno por nome, e-mail ou matrícula (ex.: S-2001)..."
            className="md:max-w-md"
          />

          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor="student-sort"
              className="text-xs font-medium text-slate-600 whitespace-nowrap"
            >
              Ordenar por:
            </label>
            <select
              id="student-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-10 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="name-asc">Nome (A → Z)</option>
              <option value="name-desc">Nome (Z → A)</option>
              <option value="registration-asc">Matrícula (Crescente)</option>
            </select>
          </div>
        </div>

        {/* Conteúdo Principal: Loading / Error / Empty / Tabela Híbrida */}
        {isLoading ? (
          <LoadingState label="Carregando registros de alunos da EducaAPI..." />
        ) : isError ? (
          <ErrorState
            title="Erro ao carregar alunos"
            message={getApiErrorMessage(
              error,
              'Não foi possível consultar a lista de estudantes.',
            )}
            onRetry={() => void refetch()}
          />
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="w-6 h-6" />}
            title={
              searchTerm
                ? 'Nenhum aluno encontrado para esta busca'
                : 'Nenhum aluno cadastrado'
            }
            description={
              searchTerm
                ? 'Tente ajustar os termos pesquisados ou limpar o filtro.'
                : 'Não existem registros de estudantes disponíveis para o seu escopo no momento.'
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
                  Cadastrar Primeiro Aluno
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Visão Desktop / Tablet (Tabela Profissional) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/80">
                    <th className="py-3 px-4 rounded-tl-lg">Matrícula</th>
                    <th className="py-3 px-4">Nome Completo</th>
                    <th className="py-3 px-4">E-mail Institucional</th>
                    <th className="py-3 px-4">Data de Nascimento</th>
                    <th className="py-3 px-4 text-right rounded-tr-lg">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {paginatedStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant="info" className="font-mono">
                          {student.registration}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                        {student.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {student.email}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 tabular-nums whitespace-nowrap">
                        {formatDate(student.birthDate)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            title="Visualizar detalhes e indicadores"
                            onClick={() => setViewingStudentId(student.id)}
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
                                title="Editar aluno"
                                onClick={() => handleOpenEdit(student)}
                              >
                                <Pencil className="w-4 h-4 text-slate-600" />
                                <span className="sr-only">Editar</span>
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="Excluir aluno"
                                onClick={() => setDeletingStudent(student)}
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

            {/* Visão Smartphone (< md): Cards Estruturados sem rolagem horizontal */}
            <div className="md:hidden space-y-3">
              {paginatedStudents.map((student) => (
                <div
                  key={student.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A] truncate">
                        {student.name}
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        {student.email}
                      </p>
                    </div>
                    <Badge variant="info" className="font-mono shrink-0">
                      {student.registration}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/80">
                    <span>Nascimento: {formatDate(student.birthDate)}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingStudentId(student.id)}
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
                            onClick={() => handleOpenEdit(student)}
                            aria-label="Editar aluno"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => setDeletingStudent(student)}
                            aria-label="Excluir aluno"
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
              total={filteredStudents.length}
              limit={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* Modal: Detalhes do Aluno + Indicadores Reais */}
      <Modal
        isOpen={Boolean(viewingStudentId)}
        onClose={() => setViewingStudentId(null)}
        title="Ficha Cadastral e Indicadores do Aluno"
        footer={
          <Button
            type="button"
            variant="primary"
            onClick={() => setViewingStudentId(null)}
          >
            Fechar
          </Button>
        }
      >
        {isDetailLoading ? (
          <LoadingState label="Consultando dados do aluno em GET /api/students/:id..." />
        ) : isDetailError || !studentDetail ? (
          <Alert variant="error" title="Erro ao consultar detalhes">
            {getApiErrorMessage(
              detailError,
              'Não foi possível carregar os dados deste aluno.',
            )}
          </Alert>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">Nome Completo</span>
                <span className="text-sm font-semibold text-[#0F172A]">
                  {studentDetail.name}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">Matrícula</span>
                <span className="text-sm font-mono font-semibold text-[#2563EB]">
                  {studentDetail.registration}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">E-mail</span>
                <span className="font-medium text-[#0F172A] break-all">
                  {studentDetail.email}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block">Data de Nascimento</span>
                <span className="font-medium text-[#0F172A]">
                  {formatDate(studentDetail.birthDate)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 sm:col-span-2">
                <span className="text-slate-500 block">
                  ID do Estudante / User ID Vinculado
                </span>
                <span className="font-mono text-[11px] text-slate-700 break-all">
                  Student: {studentDetail.id} • User: {studentDetail.userId}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <p className="font-semibold text-[#0F172A] mb-2.5">
                Indicadores Acadêmicos Reais (/api/indicators/students/:id)
              </p>

              {isIndicatorsLoading ? (
                <LoadingState label="Calculando média e assiduidade..." />
              ) : studentIndicators?.restricted ? (
                <Alert variant="info" title="Escopo de Indicadores Restrito">
                  Os indicadores de média e frequência deste estudante estão
                  disponíveis apenas para a administração e para os docentes das
                  turmas em que o aluno está matriculado.
                </Alert>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between">
                    <div>
                      <span className="text-slate-600 block">Média Geral</span>
                      <span className="text-lg font-bold text-[#0F172A] tabular-nums">
                        {formatDecimal(
                          studentIndicators?.avg?.average ?? 0,
                          2,
                        )}
                      </span>
                    </div>
                    <Badge
                      variant={
                        (studentIndicators?.avg?.average ?? 0) >=
                        MIN_PASSING_AVERAGE
                          ? 'success'
                          : 'warning'
                      }
                    >
                      <Award className="w-3.5 h-3.5 mr-1" />
                      {(studentIndicators?.avg?.average ?? 0) >=
                      MIN_PASSING_AVERAGE
                        ? 'Regular'
                        : 'Atenção'}
                    </Badge>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-slate-600 block">Assiduidade</span>
                      <span className="text-lg font-bold text-[#0F172A] tabular-nums">
                        {formatPercentage(
                          studentIndicators?.att?.attendancePercentage ?? 0,
                          1,
                        )}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {studentIndicators?.att?.present ?? 0} presença(s) /{' '}
                        {studentIndicators?.att?.totalClasses ?? 0} aula(s)
                      </span>
                    </div>
                    <CalendarCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Cadastrar Novo Aluno (Exclusivo ADMIN) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!createMutation.isPending) setIsCreateOpen(false);
        }}
        title="Cadastrar Novo Aluno"
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
              form="create-student-form"
              variant="primary"
              isLoading={createMutation.isPending}
            >
              Salvar Cadastro
            </Button>
          </>
        }
      >
        <form
          id="create-student-form"
          onSubmit={createForm.handleSubmit((data) =>
            createMutation.mutate(data),
          )}
          noValidate
          className="space-y-4"
        >
          {formError && (
            <Alert
              variant="error"
              title="Erro ao salvar"
              onClose={() => setFormError(null)}
            >
              {formError}
            </Alert>
          )}

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs font-semibold text-[#0F172A] block">
              Modo de Vinculação da Conta (User ↔ Student)
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
                <span>Criar Conta + Aluno (Transacional)</span>
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
            label="Nome completo do aluno"
            placeholder="Ex.: Lucas Ferreira Mendes"
            required
            leftIcon={<UserIcon className="w-4 h-4" />}
            error={createForm.formState.errors.name?.message}
            {...createForm.register('name')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="E-mail institucional"
              type="email"
              placeholder="lucas.mendes@educaapi.com"
              required
              leftIcon={<Mail className="w-4 h-4" />}
              error={createForm.formState.errors.email?.message}
              {...createForm.register('email')}
            />

            <Input
              label="Matrícula (Registration)"
              placeholder="Ex.: S-2003"
              required
              leftIcon={<Hash className="w-4 h-4" />}
              error={createForm.formState.errors.registration?.message}
              {...createForm.register('registration')}
            />
          </div>

          <Input
            label="Data de nascimento"
            type="date"
            required
            leftIcon={<Calendar className="w-4 h-4" />}
            error={createForm.formState.errors.birthDate?.message}
            {...createForm.register('birthDate')}
          />

          {selectedLinkMode === 'password' ? (
            <PasswordInput
              label="Senha inicial de acesso (cria conta ALUNO automaticamente)"
              placeholder="Mínimo de 6 caracteres"
              required
              leftIcon={<Lock className="w-4 h-4" />}
              error={createForm.formState.errors.password?.message}
              {...createForm.register('password')}
            />
          ) : (
            <Input
              label="UUID do Usuário ALUNO existente (userId)"
              placeholder="00000000-0000-0000-0000-000000000000"
              required
              error={createForm.formState.errors.userId?.message}
              {...createForm.register('userId')}
            />
          )}
        </form>
      </Modal>

      {/* Modal: Editar Aluno (Exclusivo ADMIN) */}
      <Modal
        isOpen={Boolean(editingStudent)}
        onClose={() => {
          if (!updateMutation.isPending) setEditingStudent(null);
        }}
        title="Editar Cadastro do Aluno"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() => setEditingStudent(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="edit-student-form"
              variant="primary"
              isLoading={updateMutation.isPending}
            >
              Salvar Alterações
            </Button>
          </>
        }
      >
        <form
          id="edit-student-form"
          onSubmit={updateForm.handleSubmit((data) => {
            if (!editingStudent) return;
            updateMutation.mutate({ id: editingStudent.id, input: data });
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
            label="Nome completo do aluno"
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
              label="Matrícula (Registration)"
              required
              leftIcon={<Hash className="w-4 h-4" />}
              error={updateForm.formState.errors.registration?.message}
              {...updateForm.register('registration')}
            />
          </div>

          <Input
            label="Data de nascimento"
            type="date"
            required
            leftIcon={<Calendar className="w-4 h-4" />}
            error={updateForm.formState.errors.birthDate?.message}
            {...updateForm.register('birthDate')}
          />
        </form>
      </Modal>

      {/* Diálogo de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={Boolean(deletingStudent)}
        onClose={() => setDeletingStudent(null)}
        onConfirm={() => {
          if (deletingStudent) {
            deleteMutation.mutate(deletingStudent.id);
          }
        }}
        title="Excluir Registro de Aluno"
        description="Tem certeza de que deseja remover este estudante da plataforma? As matrículas, notas e registros de frequência vinculados a este aluno também serão removidos (Cascade)."
        itemName={
          deletingStudent
            ? `${deletingStudent.name} (${deletingStudent.registration})`
            : undefined
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
