import React from 'react';
import { Calendar, ShieldCheck, BookOpenCheck, GraduationCap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { formatFullCurrentDate } from '../../utils/formatters';
import { Badge, LoadingState } from '../../components/ui';
import { AdminDashboardView } from './AdminDashboardView';
import { TeacherDashboardView } from './TeacherDashboardView';
import { StudentDashboardView } from './StudentDashboardView';
import { Role } from '../../types/api.types';

const roleHeaderConfig: Record<
  Role,
  {
    title: string;
    subtitle: string;
    badgeLabel: string;
    icon: React.ReactNode;
  }
> = {
  ADMIN: {
    title: 'Dashboard de Gestão Institucional',
    subtitle:
      'Indicadores globais da instituição, desempenho acadêmico, assiduidade e monitoramento ODS 4.',
    badgeLabel: 'ADMINISTRAÇÃO INSTITUCIONAL',
    icon: <ShieldCheck className="w-5 h-5 text-blue-300" />,
  },
  PROFESSOR: {
    title: 'Dashboard Pedagógico Docente',
    subtitle:
      'Acompanhamento das suas turmas vinculadas, atividades avaliativas, frequência e desempenho discente.',
    badgeLabel: 'CORPO DOCENTE',
    icon: <BookOpenCheck className="w-5 h-5 text-emerald-300" />,
  },
  ALUNO: {
    title: 'Meu Painel Acadêmico',
    subtitle:
      'Acompanhamento individual do seu boletim de notas, frequência escolar, turmas ativas e atividades.',
    badgeLabel: 'PORTAL DO ESTUDANTE',
    icon: <GraduationCap className="w-5 h-5 text-amber-300" />,
  },
};

export const DashboardPage: React.FC = () => {
  const { user, role, isLoading } = useAuth();

  if (isLoading || !role) {
    return (
      <LoadingState label="Preparando experiência personalizada do seu perfil..." />
    );
  }

  const headerInfo = roleHeaderConfig[role];
  const currentDateLabel = formatFullCurrentDate();

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Banner Institucional Superior Adaptado ao Perfil */}
      <section className="rounded-2xl bg-[#0F172A] text-white p-6 sm:p-8 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#1E3A8A]/45 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-[#2563EB]/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1E3A8A] text-blue-100 text-xs font-semibold tracking-wider uppercase border border-blue-700/60">
                {headerInfo.icon}
                {headerInfo.badgeLabel}
              </span>
              <Badge
                variant="info"
                className="bg-slate-800/90 text-slate-200 border-slate-700"
              >
                ODS 4 • Educação de Qualidade
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {headerInfo.title}
            </h1>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {headerInfo.subtitle}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800 text-xs text-slate-300 shrink-0">
            <div className="text-left lg:text-right">
              <span className="text-slate-400 block">Usuário autenticado</span>
              <span className="font-semibold text-white text-sm">
                {user?.name}
              </span>
              <span className="block text-[11px] text-slate-400">
                {user?.email}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 capitalize">
              <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{currentDateLabel}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Renderização Condicional Estrita por Perfil */}
      {role === 'ADMIN' && <AdminDashboardView />}
      {role === 'PROFESSOR' && <TeacherDashboardView />}
      {role === 'ALUNO' && <StudentDashboardView />}
    </div>
  );
};
