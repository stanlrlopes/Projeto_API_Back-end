import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  CheckCircle2,
  Server,
  ShieldCheck,
  KeyRound,
  UserCheck,
  RefreshCw,
  Palette,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { RBAC_PROFILE_CONFIG } from '../contexts';
import { API_BASE_URL } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Card, Badge, Button, Alert } from '../components/ui';

interface HealthStatus {
  status: string;
  timestamp: string;
}

export const SystemStatusPage: React.FC = () => {
  const { user, role, studentId, teacherId, refreshSession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);

  const healthUrl = API_BASE_URL.replace(/\/api\/?$/, '/health');

  const {
    data: health,
    isLoading: isHealthLoading,
    isError: isHealthError,
  } = useQuery<HealthStatus>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await axios.get<HealthStatus>(healthUrl, {
        timeout: 5000,
      });
      return response.data;
    },
  });

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const syncedUser = await refreshSession();
      if (syncedUser) {
        toast.success(
          'Sessão validada com sucesso',
          `GET /api/auth/me confirmou o perfil ${syncedUser.role}.`,
        );
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Banner de Boas-vindas e Status da API */}
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">FASE 3.2 ATIVA</Badge>
              {role && (
                <Badge
                  variant={
                    role === 'ADMIN'
                      ? 'primary'
                      : role === 'PROFESSOR'
                        ? 'info'
                        : 'success'
                  }
                >
                  PERFIL: {role}
                </Badge>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] pt-1">
              Olá, {user?.name || 'Usuário Institucional'}!
            </h2>
            <p className="text-sm text-slate-600">
              Sua sessão está autenticada via JWT e sincronizada com o Back-End
              PostgreSQL da EducaAPI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isHealthLoading && (
              <Badge variant="neutral">
                <Server className="w-3.5 h-3.5 mr-1.5 animate-pulse text-[#2563EB]" />
                Verificando API...
              </Badge>
            )}
            {!isHealthLoading && !isHealthError && health?.status === 'OK' && (
              <Badge variant="success">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                API Online ({healthUrl})
              </Badge>
            )}
            {isHealthError && (
              <Badge variant="warning">
                <Server className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                API configurada em {API_BASE_URL}
              </Badge>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              isLoading={isSyncing}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={handleManualSync}
            >
              Revalidar /auth/me
            </Button>
          </div>
        </div>
      </Card>

      {/* Resumo da Sessão Autenticada e Vínculos Acadêmicos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Identidade da Sessão (/api/auth/me)"
          subtitle="Dados reais retornados pelo token JWT ativo"
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block mb-1">ID do Usuário (UUID)</span>
              <span className="font-mono font-semibold text-[#0F172A] break-all">
                {user?.id}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block mb-1">E-mail Institucional</span>
              <span className="font-semibold text-[#0F172A] break-all">
                {user?.email}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block mb-1">
                Vínculo de Aluno (studentId)
              </span>
              {studentId ? (
                <div className="space-y-1">
                  <Badge variant="success">VINCULADO</Badge>
                  <p className="font-mono text-[11px] text-slate-700 break-all mt-1">
                    {studentId}
                  </p>
                </div>
              ) : (
                <span className="text-slate-500 italic">
                  Não aplicável / Sem vínculo de aluno
                </span>
              )}
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block mb-1">
                Vínculo de Professor (teacherId)
              </span>
              {teacherId ? (
                <div className="space-y-1">
                  <Badge variant="info">VINCULADO</Badge>
                  <p className="font-mono text-[11px] text-slate-700 break-all mt-1">
                    {teacherId}
                  </p>
                </div>
              ) : (
                <span className="text-slate-500 italic">
                  Não aplicável / Sem vínculo docente
                </span>
              )}
            </div>
          </div>
        </Card>

        <Card
          title="Verificação de Rotas e UI"
          subtitle="Atalhos para inspecionar os recursos da Fase 3.2"
        >
          <div className="space-y-3">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              leftIcon={<UserCheck className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/profile')}
            >
              Ver Meu Perfil & Vínculos
            </Button>

            <Button
              type="button"
              variant="outline"
              fullWidth
              leftIcon={<Palette className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/design-system')}
            >
              Catálogo Design System
            </Button>

            <Button
              type="button"
              variant="outline"
              fullWidth
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/admin-governance')}
            >
              Testar Rota Restrita (ADMIN)
            </Button>
          </div>
        </Card>
      </div>

      {role !== 'ADMIN' && (
        <Alert variant="info" title="Isolamento Horizontal e RBAC Ativos">
          Você está conectado com o perfil <strong>{role}</strong>. Caso tente
          acessar a rota restrita <code>/admin-governance</code>, o componente{' '}
          <code>RoleGuard</code> exibirá a tela institucional de Acesso Negado
          (HTTP 403) preservando sua sessão ativa.
        </Alert>
      )}

      {/* Matriz de Permissões por Perfil */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#2563EB]" />
            Matriz de Acesso por Perfil (RBAC)
          </h3>
          <span className="text-xs text-slate-500">
            Sincronizado com middlewares do Back-End
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(RBAC_PROFILE_CONFIG).map((profile) => {
            const isCurrentRole = role === profile.role;
            return (
              <div
                key={profile.role}
                className={`bg-white rounded-xl border p-6 flex flex-col justify-between transition-all ${
                  isCurrentRole
                    ? 'border-[#2563EB] ring-2 ring-[#2563EB]/15 shadow-sm'
                    : 'border-slate-200 opacity-85'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge
                      variant={isCurrentRole ? 'primary' : 'neutral'}
                    >
                      {profile.role}
                    </Badge>
                    {isCurrentRole ? (
                      <span className="text-xs font-semibold text-[#2563EB] flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" />
                        Perfil Atual
                      </span>
                    ) : (
                      <ShieldCheck
                        className="w-5 h-5 text-slate-400"
                        strokeWidth={1.75}
                      />
                    )}
                  </div>
                  <h4 className="text-base font-semibold text-[#0F172A]">
                    {profile.label}
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {profile.description}
                  </p>
                  <ul className="mt-4 space-y-1.5 text-xs text-slate-700">
                    {profile.modules.map((mod) => (
                      <li key={mod} className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCurrentRole ? 'bg-[#2563EB]' : 'bg-slate-400'
                          }`}
                        />
                        {mod}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
