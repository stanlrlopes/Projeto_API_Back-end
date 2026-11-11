import React from 'react';
import { Menu, LogOut, User as UserIcon, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Badge, BadgeVariant } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Role } from '../../types/api.types';

interface HeaderProps {
  onOpenSidebar: () => void;
}

const roleBadgeVariant: Record<Role, BadgeVariant> = {
  ADMIN: 'primary',
  PROFESSOR: 'info',
  ALUNO: 'success',
};

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const { user, role, studentId, teacherId, logout, refreshSession } =
    useAuth();
  const toast = useToast();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefreshSession = async () => {
    setIsRefreshing(true);
    try {
      const updated = await refreshSession();
      if (updated) {
        toast.success(
          'Sessão revalidada',
          `Dados sincronizados com GET /api/auth/me (${updated.role}).`,
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-[#0F172A] hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-sm sm:text-base font-semibold text-[#0F172A] leading-tight">
            Portal Acadêmico Institucional
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            Ambiente autenticado com controle de acesso por papel (RBAC)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {role && (
          <Badge variant={roleBadgeVariant[role]} className="hidden xs:inline-flex">
            {role}
          </Badge>
        )}

        {studentId && (
          <Badge variant="neutral" className="hidden md:inline-flex">
            Aluno vinculado
          </Badge>
        )}

        {teacherId && (
          <Badge variant="neutral" className="hidden md:inline-flex">
            Docente vinculado
          </Badge>
        )}

        <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-[#1E3A8A]/10 text-[#1E3A8A] flex items-center justify-center font-semibold text-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="text-right max-w-[160px]">
            <p className="text-xs font-semibold text-[#0F172A] truncate">
              {user?.name}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRefreshSession}
          isLoading={isRefreshing}
          title="Revalidar sessão com GET /api/auth/me"
          aria-label="Revalidar sessão"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={logout}
          leftIcon={<LogOut className="w-4 h-4" />}
        >
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
};
