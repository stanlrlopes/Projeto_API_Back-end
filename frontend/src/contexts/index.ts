import { Role } from '../types/api.types';

export { AuthContext, AuthProvider } from './AuthContext';
export type { AuthContextValue } from './AuthContext';
export { ToastContext, ToastProvider } from './ToastContext';
export type { ToastContextValue } from './ToastContext';

export interface RoleModuleConfig {
  role: Role;
  label: string;
  description: string;
  modules: string[];
}

export const RBAC_PROFILE_CONFIG: Record<Role, RoleModuleConfig> = {
  ADMIN: {
    role: 'ADMIN',
    label: 'Administrador Institucional',
    description:
      'Gestão completa de usuários, vínculos acadêmicos, disciplinas, turmas, matrículas e indicadores globais.',
    modules: [
      'Dashboard Institucional',
      'Alunos (CRUD + Transacional)',
      'Professores (CRUD + Transacional)',
      'Disciplinas (CRUD)',
      'Turmas (CRUD)',
      'Matrículas (CRUD)',
      'Conteúdos, Atividades, Notas e Frequência',
      'Indicadores ODS 4 e Baixo Desempenho',
    ],
  },
  PROFESSOR: {
    role: 'PROFESSOR',
    label: 'Corpo Docente (Professor)',
    description:
      'Gestão pedagógica restrita às suas próprias turmas vinculadas: conteúdos, atividades, notas, frequência e indicadores.',
    modules: [
      'Dashboard Pedagógico',
      'Minhas Turmas e Matrículas Vinculadas',
      'Conteúdos e Atividades Avaliativas',
      'Lançamento de Notas e Registro de Frequência',
      'Indicadores de Desempenho de Alunos da Turma',
    ],
  },
  ALUNO: {
    role: 'ALUNO',
    label: 'Estudante (Aluno)',
    description:
      'Acompanhamento individual isolado: boletim de notas, frequência, atividades de turmas ativas e indicadores próprios.',
    modules: [
      'Meu Painel Acadêmico',
      'Minhas Turmas e Matrículas Ativas',
      'Atividades e Conteúdos Disponíveis',
      'Minhas Notas e Frequência Individual',
    ],
  },
};
