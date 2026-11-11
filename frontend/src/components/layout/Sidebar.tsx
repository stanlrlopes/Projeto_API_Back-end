import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCheck,
  ShieldCheck,
  Palette,
  Server,
  Users,
  GraduationCap,
  BookOpen,
  School,
  ClipboardList,
  FileText,
  ClipboardCheck,
  Award,
  CalendarCheck,
  BarChart3,
  X,
  Lock,
} from 'lucide-react';
import { Role } from '../../types/api.types';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles: Role[];
  badge?: string;
  disabled?: boolean;
}

const activePhaseNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
    roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
  },
  {
    label: 'Alunos',
    to: '/students',
    icon: <GraduationCap className="w-4 h-4" />,
    roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
  },
  {
    label: 'Professores',
    to: '/teachers',
    icon: <Users className="w-4 h-4" />,
    roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
  },
  {
    label: 'Disciplinas',
    to: '/subjects',
    icon: <BookOpen className="w-4 h-4" />,
    roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
  },
  {
    label: 'Turmas',
    to: '/classes',
    icon: <School className="w-4 h-4" />,
    roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
  },
  {
    label: 'Matrículas',
    to: '/enrollments',
    icon: <ClipboardList className="w-4 h-4" />,
    roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
  },
  {
    label: 'Conteúdos',
    to: '/contents',
    icon: <FileText className="w-4 h-4" />,
    roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
  },
  {
    label: 'Atividades',
    to: '/activities',
    icon: <ClipboardCheck className="w-4 h-4" />,
    roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
  },
  {
    label: 'Notas & Boletim',
    to: '/grades',
    icon: <Award className="w-4 h-4" />,
    roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
  },
  {
    label: 'Frequência Escolar',
    to: '/attendance',
    icon: <CalendarCheck className="w-4 h-4" />,
    roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
  },
  {
    label: 'Indicadores ODS 4',
    to: '/indicators',
    icon: <BarChart3 className="w-4 h-4" />,
    roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
  },
  {
    label: 'Meu Perfil & Vínculo',
    to: '/profile',
    icon: <UserCheck className="w-4 h-4" />,
    roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
  },
  {
    label: 'Governança ADMIN',
    to: '/admin-governance',
    icon: <ShieldCheck className="w-4 h-4" />,
    roles: ['ADMIN'],
    badge: 'ADMIN',
  },
  {
    label: 'Design System UI',
    to: '/design-system',
    icon: <Palette className="w-4 h-4" />,
    roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
  },
  {
    label: 'Status & Matriz RBAC',
    to: '/system-status',
    icon: <Server className="w-4 h-4" />,
    roles: ['ADMIN', 'PROFESSOR', 'ALUNO'],
  },
];

const plannedAcademicModules: NavItem[] = [];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { role, studentId, teacherId } = useAuth();

  const visibleActiveItems = activePhaseNavItems.filter(
    (item) => role && item.roles.includes(role),
  );
  const visiblePlannedItems = plannedAcademicModules.filter(
    (item) => role && item.roles.includes(role),
  );

  return (
    <>
      {/* Backdrop em telas móveis / tablets */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Navegação lateral principal"
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0F172A] text-white flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabeçalho da Marca */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center font-bold text-white shadow-xs">
              E
            </div>
            <div>
              <span className="font-bold tracking-tight text-base text-white block leading-none">
                EducaAPI
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">
                Gestão Escolar • ODS 4
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            aria-label="Fechar menu lateral"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo do Vínculo Institucional */}
        <div className="px-4 py-3 bg-[#1E3A8A]/40 border-b border-slate-800/80 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">Perfil Ativo:</span>
            <span className="px-2 py-0.5 rounded bg-[#2563EB] text-white font-semibold text-[11px]">
              {role || 'VISITANTE'}
            </span>
          </div>
          {studentId && (
            <p className="mt-1.5 text-[11px] text-slate-300 truncate">
              Vínculo Aluno:{' '}
              <span className="font-mono text-white">
                {studentId.slice(0, 8)}...
              </span>
            </p>
          )}
          {teacherId && (
            <p className="mt-1.5 text-[11px] text-slate-300 truncate">
              Vínculo Docente:{' '}
              <span className="font-mono text-white">
                {teacherId.slice(0, 8)}...
              </span>
            </p>
          )}
        </div>

        {/* Lista de Navegação */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Módulos Ativos (Fase 3.3.7)
            </p>
            <ul className="space-y-1">
              {visibleActiveItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#2563EB] text-white shadow-xs'
                          : 'text-slate-300 hover:bg-[#1E3A8A]/60 hover:text-white'
                      }`
                    }
                  >
                    <span className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                    {item.badge && (
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-white/15 text-white">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {visiblePlannedItems.length > 0 && (
            <div>
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Próximas Subfases ({role})
              </p>
              <ul className="space-y-1">
                {visiblePlannedItems.map((item) => (
                  <li key={item.label}>
                    <div
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-400/80 bg-slate-900/40 cursor-not-allowed select-none"
                      title="Previsto para as próximas subfases"
                    >
                      <span className="flex items-center gap-2.5">
                        {item.icon}
                        <span>{item.label}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        <Lock className="w-2.5 h-2.5" />
                        {item.badge}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        {/* Rodapé Institucional */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400">
          <p className="font-medium text-slate-300">EducaAPI v1.0</p>
          <p className="mt-0.5">ONU • ODS 4 Educação de Qualidade</p>
        </div>
      </aside>
    </>
  );
};
