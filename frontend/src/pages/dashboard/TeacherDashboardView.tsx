import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  School,
  Users,
  BookOpen,
  FileText,
  Clock,
  Award,
  CalendarCheck,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  Server,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { getApiErrorMessage } from '../../services/api';
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
  Alert,
  StatCard,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../../components/ui';
import { AttendanceDonutChart } from '../../components/charts/AttendanceDonutChart';
import { PerformanceBarChart } from '../../components/charts/PerformanceBarChart';
import { useAuth } from '../../hooks/useAuth';

export const TeacherDashboardView: React.FC = () => {
  const { teacherId } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', 'teacher', teacherId],
    queryFn: () => dashboardService.getTeacherDashboard(),
  });

  if (isLoading) {
    return (
      <LoadingState label="Carregando rotina acadêmica e turmas vinculadas ao professor..." />
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Falha ao carregar o Dashboard do Professor"
        message={getApiErrorMessage(
          error,
          'Não foi possível obter os dados das suas turmas no momento.',
        )}
        onRetry={() => void refetch()}
      />
    );
  }

  const {
    classes,
    subjects,
    activeEnrollmentsCount,
    uniqueStudentsCount,
    activities,
    totalPendingGradesCount,
    grades,
    teacherGeneralAverage,
    presentCount,
    absentCount,
    attendancePercentage,
    lowPerformanceStudents,
    contents,
    activityPerformanceChart,
  } = data;

  return (
    <div className="space-y-6 sm:space-y-8">
      {!teacherId && (
        <Alert variant="warning" title="Vínculo Docente Pendente">
          Sua conta possui perfil <strong>PROFESSOR</strong>, mas ainda não há
          um registro docente vinculado pela administração.
        </Alert>
      )}

      {/* Barra de Escopo e Atualização */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex items-center gap-2.5 text-xs text-slate-600">
          <School className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span>
            Painel pedagógico com <strong>isolamento horizontal ativo</strong>:
            exibindo exclusivamente dados das turmas vinculadas ao seu perfil
            docente.
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          isLoading={isFetching}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={() => void refetch()}
        >
          Atualizar Painel
        </Button>
      </div>

      {/* Grid Principal de 8 Indicadores do Professor */}
      <section aria-label="Indicadores Docentes">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <StatCard
            title="Turmas Vinculadas"
            value={classes.length}
            subtitle="Turmas sob sua regência"
            badgeText="Docente"
            tone="primary"
            icon={<School className="w-5 h-5" />}
          />

          <StatCard
            title="Alunos nas Turmas"
            value={uniqueStudentsCount}
            subtitle={`${activeEnrollmentsCount} matrícula(s) ativa(s)`}
            badgeText="Estudantes"
            tone="navy"
            icon={<Users className="w-5 h-5" />}
          />

          <StatCard
            title="Disciplinas Ministradas"
            value={subjects.length}
            subtitle={`${contents.length} conteúdo(s) programático(s)`}
            badgeText="Currículo"
            tone="primary"
            icon={<BookOpen className="w-5 h-5" />}
          />

          <StatCard
            title="Atividades Cadastradas"
            value={activities.length}
            subtitle={`${grades.length} avaliação(ões) corrigida(s)`}
            badgeText="Avaliações"
            tone="navy"
            icon={<FileText className="w-5 h-5" />}
          />

          <StatCard
            title="Pendentes de Correção"
            value={totalPendingGradesCount}
            subtitle="Lançamentos de notas aguardando"
            badgeText={
              totalPendingGradesCount > 0 ? 'Requer lançamento' : 'Em dia'
            }
            tone={totalPendingGradesCount > 0 ? 'warning' : 'success'}
            icon={<Clock className="w-5 h-5" />}
          />

          <StatCard
            title="Conteúdos Publicados"
            value={contents.length}
            subtitle="Nas disciplinas vinculadas"
            badgeText="Plano de Ensino"
            tone="primary"
            icon={<Layers className="w-5 h-5" />}
          />

          <StatCard
            title="Média das Minhas Turmas"
            value={formatDecimal(teacherGeneralAverage, 2)}
            subtitle={`Referência mínima: ${formatDecimal(MIN_PASSING_AVERAGE, 1)}`}
            badgeText={
              grades.length === 0
                ? 'Sem notas'
                : teacherGeneralAverage >= MIN_PASSING_AVERAGE
                  ? 'Regular'
                  : 'Atenção'
            }
            tone={
              grades.length === 0
                ? 'neutral'
                : teacherGeneralAverage >= MIN_PASSING_AVERAGE
                  ? 'success'
                  : 'warning'
            }
            icon={<Award className="w-5 h-5" />}
          />

          <StatCard
            title="Frequência das Turmas"
            value={formatPercentage(attendancePercentage, 1)}
            subtitle={`${lowPerformanceStudents.length} aluno(s) em atenção (< ${formatDecimal(MIN_PASSING_AVERAGE, 1)})`}
            badgeText={
              lowPerformanceStudents.length > 0
                ? `${lowPerformanceStudents.length} alerta(s)`
                : 'Regular'
            }
            tone={lowPerformanceStudents.length > 0 ? 'warning' : 'success'}
            icon={<CalendarCheck className="w-5 h-5" />}
          />
        </div>
      </section>

      {/* Gráficos Pedagógicos Recharts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Desempenho Médio por Atividade Avaliativa"
          subtitle="Média real obtida pelos alunos das suas turmas em cada atividade"
          className="lg:col-span-2"
        >
          <PerformanceBarChart
            items={activityPerformanceChart}
            valueLabel="Média da Atividade"
            emptyTitle="Sem atividades avaliadas nas suas turmas"
            emptyDescription="Cadastre atividades e lance notas para visualizar o gráfico de desempenho por avaliação."
          />
        </Card>

        <Card
          title="Frequência das Minhas Turmas"
          subtitle="Presenças vs. faltas registradas nas suas chamadas"
        >
          <AttendanceDonutChart
            present={presentCount}
            absent={absentCount}
            attendancePercentage={attendancePercentage}
            emptyMessage="Nenhuma chamada registrada nas suas turmas até o momento."
          />
        </Card>
      </section>

      {/* Listas de Turmas Vinculadas e Atividades Avaliativas */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Minhas Turmas e Disciplinas"
          subtitle="Turmas sob sua responsabilidade docente (GET /api/classes)"
          action={<Badge variant="info">{classes.length} turma(s)</Badge>}
        >
          {classes.length === 0 ? (
            <EmptyState
              compact
              title="Nenhuma turma vinculada"
              description="Você ainda não possui turmas associadas ao seu registro docente."
            />
          ) : (
            <div className="space-y-3">
              {classes.map((cls) => {
                const enrolledCount = data.enrollments.filter(
                  (e) => e.classId === cls.id && e.status === 'ACTIVE',
                ).length;

                return (
                  <div
                    key={cls.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#0F172A] truncate">
                          {cls.name}
                        </p>
                        <Badge variant="neutral">
                          {cls.year}/{cls.semester}º Sem
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 truncate">
                        Disciplina:{' '}
                        <strong className="text-slate-800">
                          {cls.subject?.name || '—'}
                        </strong>
                        {cls.subject?.workload
                          ? ` (${cls.subject.workload}h)`
                          : ''}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <Badge variant="success">
                        {enrolledCount} aluno(s) ativo(s)
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          title="Atividades e Situação de Lançamento de Notas"
          subtitle="Comparativo entre alunos ativos na turma e notas já lançadas"
          action={
            <Badge
              variant={totalPendingGradesCount > 0 ? 'warning' : 'success'}
            >
              {totalPendingGradesCount} pendente(s)
            </Badge>
          }
        >
          {activities.length === 0 ? (
            <EmptyState
              compact
              title="Nenhuma atividade cadastrada"
              description="Não há atividades avaliativas registradas para suas turmas."
            />
          ) : (
            <div className="space-y-3">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A] truncate">
                      {act.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Entrega: <strong>{formatDate(act.dueDate)}</strong> • Nota
                      máx.: <strong>{formatDecimal(act.maxScore, 1)}</strong> •
                      Lançadas:{' '}
                      <strong>
                        {act.gradedCount}/{act.activeStudentsCount}
                      </strong>
                    </p>
                  </div>
                  <div className="shrink-0">
                    {act.pendingCount > 0 ? (
                      <Badge variant="warning">
                        {act.pendingCount} pendente(s)
                      </Badge>
                    ) : (
                      <Badge variant="success">Concluída</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* Acompanhamento de Alunos em Atenção nas Turmas do Professor + Atalhos */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Alunos em Atenção Pedagógica (Minhas Turmas)"
          subtitle={`Estudantes das suas turmas com média < ${formatDecimal(MIN_PASSING_AVERAGE, 1)}`}
          action={
            <Badge
              variant={lowPerformanceStudents.length > 0 ? 'warning' : 'success'}
            >
              {lowPerformanceStudents.length} aluno(s)
            </Badge>
          }
        >
          {lowPerformanceStudents.length === 0 ? (
            <EmptyState
              compact
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              title="Nenhum aluno das suas turmas em faixa crítica"
              description="Todos os estudantes avaliados nas suas turmas mantêm média igual ou superior ao mínimo institucional."
            />
          ) : (
            <div className="space-y-2.5">
              {lowPerformanceStudents.map((st) => (
                <div
                  key={st.studentId}
                  className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-sm font-semibold text-[#0F172A] truncate">
                      {st.name}
                    </span>
                  </div>
                  <Badge variant="danger">
                    Média: {formatDecimal(st.average, 2)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Atalhos Pedagógicos e Navegação"
          subtitle="Acesso rápido às áreas do portal docente"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant="primary"
                fullWidth
                leftIcon={<Award className="w-4 h-4" />}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => navigate('/grades')}
              >
                Lançar Notas & Boletim
              </Button>

              <Button
                type="button"
                variant="secondary"
                fullWidth
                leftIcon={<CalendarCheck className="w-4 h-4" />}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => navigate('/attendance')}
              >
                Registrar Frequência
              </Button>
            </div>

            <Button
              type="button"
              variant="secondary"
              fullWidth
              leftIcon={<BarChart3 className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/indicators')}
            >
              Indicadores Pedagógicos (ODS 4)
            </Button>

            <Button
              type="button"
              variant="outline"
              fullWidth
              leftIcon={<UserCheck className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/profile')}
            >
              Meu Vínculo Docente
            </Button>

            <Button
              type="button"
              variant="outline"
              fullWidth
              leftIcon={<Server className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/system-status')}
            >
              Ver Matriz RBAC e Status da Sessão
            </Button>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              Todos os módulos operacionais de{' '}
              <strong>Conteúdos</strong>, <strong>Atividades</strong>,{' '}
              <strong>Notas</strong>, <strong>Frequência</strong> e{' '}
              <strong>Indicadores ODS 4</strong> estão ativos no menu lateral.
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};
