import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  GraduationCap,
  BookOpen,
  School,
  ClipboardCheck,
  FileText,
  Award,
  CalendarCheck,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { getApiErrorMessage } from '../../services/api';
import {
  formatDecimal,
  formatPercentage,
  MIN_PASSING_AVERAGE,
} from '../../utils/formatters';
import {
  Card,
  Badge,
  Button,
  StatCard,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../../components/ui';
import { AttendanceDonutChart } from '../../components/charts/AttendanceDonutChart';
import { PerformanceBarChart } from '../../components/charts/PerformanceBarChart';

export const AdminDashboardView: React.FC = () => {
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => dashboardService.getAdminDashboard(),
  });

  if (isLoading) {
    return (
      <LoadingState label="Carregando indicadores institucionais da EducaAPI..." />
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Falha ao carregar o Dashboard Administrativo"
        message={getApiErrorMessage(
          error,
          'Não foi possível obter os indicadores institucionais no momento.',
        )}
        onRetry={() => void refetch()}
      />
    );
  }

  const {
    metrics,
    lowPerformance,
    classes,
    enrollments,
    activities,
    contents,
    presentCount,
    absentCount,
    studentPerformanceChart,
  } = data;

  const activeEnrollmentsCount = enrollments.filter(
    (e) => e.status === 'ACTIVE',
  ).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Barra de Ações e Sincronização */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex items-center gap-2.5 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span>
            Visão consolidada da instituição alimentada em tempo real por{' '}
            <code className="font-mono text-[#0F172A]">
              /api/indicators/dashboard
            </code>{' '}
            e listagens acadêmicas.
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
          Atualizar Indicadores
        </Button>
      </div>

      {/* Grid Principal de 8 Indicadores Institucionais Reais */}
      <section aria-label="Indicadores Institucionais">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <StatCard
            title="Total de Alunos"
            value={metrics.totalStudents}
            subtitle="Estudantes cadastrados"
            badgeText="Ativos no banco"
            tone="primary"
            icon={<GraduationCap className="w-5 h-5" />}
          />

          <StatCard
            title="Corpo Docente"
            value={metrics.totalTeachers}
            subtitle="Professores vinculados"
            badgeText="Docentes"
            tone="navy"
            icon={<Users className="w-5 h-5" />}
          />

          <StatCard
            title="Disciplinas"
            value={metrics.totalSubjects}
            subtitle={`${contents.length} conteúdo(s) publicado(s)`}
            badgeText="Matriz Curricular"
            tone="primary"
            icon={<BookOpen className="w-5 h-5" />}
          />

          <StatCard
            title="Turmas Ofertadas"
            value={metrics.totalClasses}
            subtitle="Turmas registradas no período"
            badgeText="Acadêmico"
            tone="navy"
            icon={<School className="w-5 h-5" />}
          />

          <StatCard
            title="Total de Matrículas"
            value={enrollments.length}
            subtitle={`${activeEnrollmentsCount} matrícula(s) com status ACTIVE`}
            badgeText="Vínculos"
            tone="success"
            icon={<ClipboardCheck className="w-5 h-5" />}
          />

          <StatCard
            title="Atividades Cadastradas"
            value={activities.length}
            subtitle={`${data.grades.length} nota(s) lançada(s)`}
            badgeText="Avaliações"
            tone="primary"
            icon={<FileText className="w-5 h-5" />}
          />

          <StatCard
            title="Média Geral Institucional"
            value={formatDecimal(metrics.generalAverage, 2)}
            subtitle={`Corte mínimo ODS 4: ${formatDecimal(MIN_PASSING_AVERAGE, 1)}`}
            badgeText={
              metrics.generalAverage >= MIN_PASSING_AVERAGE
                ? 'Meta Atingida'
                : 'Atenção'
            }
            tone={
              metrics.generalAverage >= MIN_PASSING_AVERAGE
                ? 'success'
                : 'warning'
            }
            icon={<Award className="w-5 h-5" />}
          />

          <StatCard
            title="Frequência Geral"
            value={formatPercentage(metrics.generalAttendancePercentage, 1)}
            subtitle={`${metrics.lowPerformanceCount} aluno(s) abaixo da média`}
            badgeText={
              metrics.lowPerformanceCount > 0
                ? `${metrics.lowPerformanceCount} em alerta`
                : 'Sem alertas'
            }
            tone={metrics.lowPerformanceCount > 0 ? 'warning' : 'success'}
            icon={<AlertTriangle className="w-5 h-5" />}
          />
        </div>
      </section>

      {/* Seção Analítica com Gráficos Recharts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Desempenho Acadêmico por Estudante"
          subtitle="Média aritmética real das avaliações lançadas em GET /api/grades"
          className="lg:col-span-2"
        >
          <PerformanceBarChart
            items={studentPerformanceChart}
            valueLabel="Média do Aluno"
            emptyTitle="Nenhuma nota registrada"
            emptyDescription="Assim que os docentes lançarem avaliações, o comparativo de médias aparecerá neste painel."
          />
        </Card>

        <Card
          title="Assiduidade Geral da Instituição"
          subtitle="Proporção real de presenças vs. faltas em GET /api/attendance"
        >
          <AttendanceDonutChart
            present={presentCount}
            absent={absentCount}
            attendancePercentage={metrics.generalAttendancePercentage}
          />
        </Card>
      </section>

      {/* Tabelas / Listas de Resumo Administrativo */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monitoramento ODS 4: Alunos com Baixo Desempenho */}
        <Card
          title="Monitoramento Pedagógico (Baixo Desempenho)"
          subtitle={`Estudantes com média inferior a ${formatDecimal(MIN_PASSING_AVERAGE, 1)} (GET /api/indicators/low-performance)`}
          action={
            <Badge
              variant={lowPerformance.length > 0 ? 'warning' : 'success'}
            >
              {lowPerformance.length} estudante(s)
            </Badge>
          }
        >
          {lowPerformance.length === 0 ? (
            <EmptyState
              compact
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              title="Nenhum estudante em faixa de baixo desempenho"
              description={`Todos os alunos avaliados possuem média igual ou superior a ${formatDecimal(MIN_PASSING_AVERAGE, 1)}.`}
            />
          ) : (
            <div className="space-y-3">
              {lowPerformance.map((student) => (
                <div
                  key={student.studentId}
                  className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A] truncate">
                      {student.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      Requer acompanhamento pedagógico prioritário (ODS 4)
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="danger">
                      Média: {formatDecimal(student.average, 2)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Resumo das Turmas e Docentes */}
        <Card
          title="Turmas e Alocação Docente"
          subtitle="Visão geral das turmas ativas na instituição (GET /api/classes)"
          action={<Badge variant="info">{classes.length} turma(s)</Badge>}
        >
          {classes.length === 0 ? (
            <EmptyState
              compact
              title="Nenhuma turma cadastrada"
              description="Não existem turmas registradas no banco de dados no momento."
            />
          ) : (
            <div className="space-y-3">
              {classes.slice(0, 5).map((cls) => {
                const classEnrollments = enrollments.filter(
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
                        </strong>{' '}
                        • Docente:{' '}
                        <strong className="text-slate-800">
                          {cls.teacher?.name || '—'}
                        </strong>
                      </p>
                    </div>
                    <div className="shrink-0">
                      <Badge variant="success">
                        {classEnrollments} aluno(s) ativo(s)
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      {/* Atalhos Rápidos de Governança e Módulos */}
      <Card
        title="Atalhos de Gestão e Navegação Rápida"
        subtitle="Acesso direto aos módulos de Alunos, Professores, Disciplinas, Turmas, Matrículas e Governança"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Button
            type="button"
            variant="primary"
            fullWidth
            leftIcon={<GraduationCap className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/students')}
          >
            Gestão de Alunos
          </Button>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            leftIcon={<Users className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/teachers')}
          >
            Gestão de Professores
          </Button>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            leftIcon={<BookOpen className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/subjects')}
          >
            Gestão de Disciplinas
          </Button>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            leftIcon={<School className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/classes')}
          >
            Gestão de Turmas
          </Button>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            leftIcon={<ClipboardCheck className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/enrollments')}
          >
            Gestão de Matrículas
          </Button>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            leftIcon={<FileText className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/contents')}
          >
            Gestão de Conteúdos
          </Button>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            leftIcon={<ClipboardCheck className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/activities')}
          >
            Gestão de Atividades
          </Button>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            leftIcon={<Award className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/grades')}
          >
            Notas & Boletim
          </Button>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            leftIcon={<CalendarCheck className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/attendance')}
          >
            Frequência Escolar
          </Button>

          <Button
            type="button"
            variant="primary"
            fullWidth
            leftIcon={<BarChart3 className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/indicators')}
          >
            Indicadores ODS 4
          </Button>

          <Button
            type="button"
            variant="outline"
            fullWidth
            leftIcon={<ShieldCheck className="w-4 h-4" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/admin-governance')}
          >
            Governança ADMIN
          </Button>
        </div>
      </Card>
    </div>
  );
};
