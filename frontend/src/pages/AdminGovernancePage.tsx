import React from 'react';
import { ShieldCheck, Lock, Users, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, Badge, Alert } from '../components/ui';

export const AdminGovernancePage: React.FC = () => {
  const { user, role } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
            Governança & Segurança Institucional (ADMIN)
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Área protegida por <code className="font-mono">RoleGuard</code> —
            acessível exclusivamente por administradores autenticados.
          </p>
        </div>
        <Badge variant="primary">ACESSO EXCLUSIVO: {role}</Badge>
      </div>

      <Alert variant="success" title="Autorização Administrativa Confirmada">
        O usuário <strong>{user?.name}</strong> ({user?.email}) possui perfil{' '}
        <strong>{role}</strong> validado no banco de dados via JWT.
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          title="Revalidação de Papel em Banco"
          subtitle="Proteção contra tokens obsoletos"
        >
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-[#0F172A]">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Middleware Ativo
            </div>
            <p className="leading-relaxed">
              Cada requisição autenticada consulta o papel atual do usuário no
              PostgreSQL, impedindo o uso de JWT antigo após revogação de
              privilégios.
            </p>
          </div>
        </Card>

        <Card
          title="Bloqueio de Elevação Pública"
          subtitle="POST /api/auth/register"
        >
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-[#0F172A]">
              <Lock className="w-4 h-4 text-[#2563EB]" />
              Restrição 403 Forbidden
            </div>
            <p className="leading-relaxed">
              Usuários anônimos ou não-administradores só podem registrar contas
              com perfil <code>ALUNO</code>. Contas <code>ADMIN</code> e{' '}
              <code>PROFESSOR</code> exigem token de administrador.
            </p>
          </div>
        </Card>

        <Card
          title="Criação Transacional"
          subtitle="Vínculo User + Student/Teacher"
        >
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-[#0F172A]">
              <Users className="w-4 h-4 text-[#1E3A8A]" />
              Atomicidade Prisma
            </div>
            <p className="leading-relaxed">
              Os fluxos administrativos criam ou vinculam usuários e perfis
              acadêmicos de forma atômica, evitando registros órfãos ou
              duplicados.
            </p>
          </div>
        </Card>
      </div>

      <Card title="Checklist de Conformidade de Segurança (Fase 2.1 + Fase 3.2)">
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
          {[
            'Token JWT armazenado em @EducaAPI:token e enviado via Authorization Bearer',
            'Sessão validada na inicialização via GET /api/auth/me',
            'Tratamento distinto entre 401 Unauthorized e 403 Forbidden',
            'Proteção de rotas privadas via ProtectedRoute',
            'Proteção de rotas por papel via RoleGuard (ADMIN, PROFESSOR, ALUNO)',
            'Cadastro público restrito exclusivamente ao perfil ALUNO',
          ].map((item) => (
            <li
              key={item}
              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};
