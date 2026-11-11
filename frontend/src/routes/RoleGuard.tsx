import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Role } from '../types/api.types';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';

interface RoleGuardProps {
  allowedRoles: Role[];
  children?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
}) => {
  const { user, role, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingState label="Verificando permissões de perfil..." />;
  }

  if (!user || !role || !allowedRoles.includes(role)) {
    return (
      <div className="max-w-2xl mx-auto my-8">
        <Card
          title="Acesso Restrito por Perfil (HTTP 403)"
          subtitle="Controle de acesso baseado em papéis (RBAC) — EducaAPI"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
              <div className="w-11 h-11 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-900">
                  Permissão Insuficiente para Acessar Este Módulo
                </h3>
                <p className="text-xs text-red-700 mt-0.5">
                  Sua sessão permanece ativa e protegida, porém seu perfil atual
                  não possui privilégios para visualizar esta área.
                </p>
              </div>
            </div>

            <Alert variant="warning" title="Política de Isolamento e Segurança">
              Todas as permissões são validadas tanto na interface quanto nos
              middlewares de autorização do Back-End (JWT + revalidação em banco
              de dados).
            </Alert>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block mb-1">
                  Seu perfil autenticado:
                </span>
                <Badge variant="info">{role || 'NÃO IDENTIFICADO'}</Badge>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">
                  Perfis exigidos nesta rota:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {allowedRoles.map((allowed) => (
                    <Badge key={allowed} variant="primary">
                      {allowed}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="primary"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate('/dashboard')}
              >
                Voltar ao Painel Principal
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
