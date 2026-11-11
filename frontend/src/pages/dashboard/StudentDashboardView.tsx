import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  CalendarCheck,
  BarChart3,
  BookOpen,
  School,
  FileText,
  Clock,
  CheckCircle2,
  Layers,
  RefreshCw,
  UserCheck,
  ArrowRight,
  GraduationCap,
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

export const StudentDashboardView: React.FC = () => {
  const { studentId, user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', 'student', studentId],
    queryFn: () => dashboardService.getStudentDashboard(studentId),
  });

  if (isLoading) {
    return (
      <LoadingState label="Carregando seu boletim, frequência e atividades acadêmicas..." />
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Não foi possível carregar seu Painel Acadêmico"
        message={getApiErrorMessage(
          error,
          'Ocorreu um erro ao consultar seus dados estudantis.',
        )}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!data.hasStudentLink) {
    return (
      <div className="space-y-6">
        <Alert variant="warning" title="Aguardando Vínculo de Matrícula">
          Olá, <strong>{user?.name}</strong>! Sua conta de estudante (
          <code>ALUNO</code>) está ativa, porém ainda não foi vinculada a um
          registro acadêmico de matrícula pela secretaria escolar (
          <code>ADMIN</code>).
        </Alert>

        <Card
          title="Portal do Estudante — Conta Recém-Criada"
          subtitle="Assim que sua matrícula for associada a uma turma, suas notas, frequência e atividades aparecerão automaticamente aqui."
        >
          <EmptyState
            icon={<GraduationCap className="w-6 h-6 text-[#2563EB]" />}
            title="Sem vínculo de matrícula ativo no momento"
            description="Solicite à administração escolar a vinculação do seu cadastro de aluno às turmas do semestre."
            action={
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<UserCheck className="w-4 h-4" />}
                onClick={() => navigate('/profile')}
              >
                Consultar Meu Perfil
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const {
    average,
    attendanceIndicator,
    classes,
    subjects,
    activities,
    pendingActivities,
    completedActivitiesCount,
    grades,
    contents,
    gradePerformanceChart,
  } = data;

  const isPassing = grades.length === 0 || average >= MIN_PASSING_AVERAGE;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Barra de Escopo Individual e Atualização */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex items-center gap-2.5 text-xs text-slate-600">
          <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Ambiente individual do estudante: exibindo exclusivamente suas
            notas, matrículas, frequência e atividades.
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
          Atualizar Boletim
        </Button>
      </div>

      {/* Grid Principal de 8 Indicadores do Aluno */}
      <section aria-label="Indicadores Acadêmicos do Estudante">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <StatCard
            title="Minha Média Geral"
            value={formatDecimal(average, 2)}
            subtitle={`Mínimo para aprovação: ${formatDecimal(MIN_PASSING_AVERAGE, 1)}`}
            badgeText={
              grades.length === 0
                ? 'Sem notas'
                : isPassing
                  ? 'Desempenho Regular'
                  : 'Atenção Pedagógica'
            }
            tone={
              grades.length === 0
                ? 'neutral'
                : isPassing
                  ? 'success'
                  : 'warning'
            }
            icon={<Award className="w-5 h-5" />}
          />

          <StatCard
            title="Minha Frequência"
            value={formatPercentage(
              attendanceIndicator.attendancePercentage,
              1,
            )}
            subtitle={`${attendanceIndicator.present} presença(s) em ${attendanceIndicator.totalClasses} aula(s)`}
            badgeText={`${attendanceIndicator.absent} falta(s)`}
            tone={
              attendanceIndicator.totalClasses === 0
                ? 'neutral'
                : attendanceIndicator.absent === 0
                  ? 'success'
                  : 'primary'
            }
            icon={<CalendarCheck className="w-5 h-5" />}
          />

          <StatCard
            title="Disciplinas Matriculadas"
            value={subjects.length}
            subtitle="Componentes curriculares ativos"
            badgeText="Em curso"
            tone="primary"
            icon={<BookOpen className="w-5 h-5" />}
          />

          <StatCard
            title="Turmas Vinculadas"
            value={classes.length}
            subtitle="Matrículas com status ACTIVE"
            badgeText="Turmas"
            tone="navy"
            icon={<School className="w-5 h-5" />}
          />

          <StatCard
            title="Atividades Disponíveis"
            value={activities.length}
            subtitle={`${completedActivitiesCount} avaliada(s) com nota`}
            badgeText="Avaliações"
            tone="primary"
            icon={<FileText className="w-5 h-5" />}
          />

          <StatCard
            title="Atividades Pendentes"
            value={pendingActivities.length}
            subtitle="Aguardando realização ou nota"
            badgeText={
              pendingActivities.length > 0 ? 'Acompanhar prazo' : 'Em dia'
            }
            tone={pendingActivities.length > 0 ? 'warning' : 'success'}
            icon={<Clock className="w-5 h-5" />}
          />

          <StatCard
            title="Notas Lançadas"
            value={grades.length}
            subtitle="Avaliações registradas no boletim"
            badgeText="Boletim"
            tone="success"
            icon={<CheckCircle2 className="w-5 h-5" />}
          />

          <StatCard
            title="Conteúdos Publicados"
            value={contents.length}
            subtitle="Materiais das suas disciplinas"
            badgeText="Estudo"
            tone="navy"
            icon={<Layers className="w-5 h-5" />}
          />
        </div>
      </section>

      {/* Gráficos Recharts de Desempenho Individual e Assiduidade */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Minhas Notas por Atividade"
          subtitle="Pontuação individual obtida em cada avaliação lançada"
          className="lg:col-span-2"
        >
          <PerformanceBarChart
            items={gradePerformanceChart}
            valueLabel="Minha Nota"
            emptyTitle="Nenhuma nota lançada até o momento"
            emptyDescription="Suas notas aparecerão neste gráfico assim que os professores registrarem as avaliações das suas turmas."
          />
        </Card>

        <Card
          title="Resumo da Minha Assiduidade"
          subtitle="Presenças vs. faltas registradas (GET /api/indicators/students/:id/attendance)"
        >
          <AttendanceDonutChart
            present={attendanceIndicator.present}
            absent={attendanceIndicator.absent}
            attendancePercentage={attendanceIndicator.attendancePercentage}
            emptyMessage="Ainda não existem registros de chamada lançados para sua matrícula."
          />
        </Card>
      </section>

      {/* Boletim de Notas e Atividades Disponíveis/Pendentes */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Minhas Notas Recentes"
          subtitle="Resultados individuais das suas avaliações (GET /api/grades)"
          action={<Badge variant="primary">{grades.length} nota(s)</Badge>}
        >
          {grades.length === 0 ? (
            <EmptyState
              compact
              title="Nenhuma nota registrada"
              description="Você ainda não possui notas lançadas pelos docentes nas atividades do período."
            />
          ) : (
            <div className="space-y-3">
              {grades.map((grade) => {
                const maxScore = grade.activity?.maxScore ?? 10;
                const isGoodScore = grade.score >= MIN_PASSING_AVERAGE;

                return (
                  <div
                    key={grade.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A] truncate">
                        {grade.activity?.title || 'Atividade Avaliativa'}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Valor máx.:{' '}
                        <strong>{formatDecimal(maxScore, 1)}</strong>
                        {grade.evaluationDate
                          ? ` • Avaliado em ${formatDate(grade.evaluationDate)}`
                          : ''}
                      </p>
                    </div>
                    <Badge variant={isGoodScore ? 'success' : 'warning'}>
                      Nota: {formatDecimal(grade.score, 2)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          title="Minhas Atividades Acadêmicas"
          subtitle="Atividades das suas turmas ativas e status de avaliação (GET /api/activities)"
          action={
            <Badge
              variant={pendingActivities.length > 0 ? 'warning' : 'success'}
            >
              {pendingActivities.length} pendente(s)
            </Badge>
          }
        >
          {activities.length === 0 ? (
            <EmptyState
              compact
              title="Nenhuma atividade disponível"
              description="Não há atividades cadastradas nas turmas em que você está matriculado."
            />
          ) : (
            <div className="space-y-3">
              {activities.map((act) => {
                const studentGrade = grades.find(
                  (g) => g.activityId === act.id,
                );
                return (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A] truncate">
                        {act.title}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Prazo: <strong>{formatDate(act.dueDate)}</strong> •
                        Valor: <strong>{formatDecimal(act.maxScore, 1)}</strong>
                      </p>
                    </div>
                    <div className="shrink-0">
                      {studentGrade ? (
                        <Badge variant="success">
                          Avaliada ({formatDecimal(studentGrade.score, 1)})
                        </Badge>
                      ) : (
                        <Badge variant="warning">Pendente de Nota</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      {/* Minhas Turmas/Disciplinas e Conteúdos Publicados */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Minhas Turmas e Disciplinas Matriculadas"
          subtitle="Turmas com matrícula ativa no período letivo (GET /api/classes)"
          action={<Badge variant="info">{classes.length} turma(s)</Badge>}
        >
          {classes.length === 0 ? (
            <EmptyState
              compact
              title="Sem turmas ativas"
              description="Você não possui turmas com matrícula ativa no momento."
            />
          ) : (
            <div className="space-y-3">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#0F172A] truncate">
                        {cls.subject?.name || cls.name}
                      </p>
                      <Badge variant="neutral">
                        {cls.year}/{cls.semester}º Sem
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 truncate">
                      Turma: <strong>{cls.name}</strong> • Professor(a):{' '}
                      <strong>{cls.teacher?.name || '—'}</strong>
                    </p>
                  </div>
                  <Badge variant="success">MATRÍCULA ATIVA</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Conteúdos Programáticos Publicados"
          subtitle="Tópicos de estudo das suas disciplinas (GET /api/contents)"
          action={<Badge variant="neutral">{contents.length} tópico(s)</Badge>}
        >
          {contents.length === 0 ? (
            <EmptyState
              compact
              title="Nenhum conteúdo publicado"
              description="Ainda não há conteúdos programáticos cadastrados para suas disciplinas."
            />
          ) : (
            <div className="space-y-3">
              {contents.map((content) => (
                <div
                  key={content.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#0F172A] truncate">
                      {content.title}
                    </p>
                    {content.subject?.name && (
                      <Badge variant="info">{content.subject.name}</Badge>
                    )}
                  </div>
                  {content.description && (
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {content.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* Atalho Rápido de Perfil do Estudante */}
      <Card
        title="Acesso Rápido do Estudante"
        subtitle="Consulte seus dados cadastrais e número de matrícula"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            Deseja verificar seu registro de matrícula (
            <code className="font-mono">{user?.student?.registration || 'S-200X'}</code>
            ) e dados de vínculo estudantil?
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Award className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/grades')}
            >
              Abrir Meu Boletim
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<CalendarCheck className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/attendance')}
            >
              Minha Frequência
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<BarChart3 className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/indicators')}
            >
              Meus Indicadores ODS 4
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<UserCheck className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/profile')}
            >
              Ver Meu Perfil Acadêmico
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
