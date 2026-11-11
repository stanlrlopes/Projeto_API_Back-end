import React from 'react';
import {
  User as UserIcon,
  Mail,
  Shield,
  GraduationCap,
  BookOpenCheck,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card, Badge, Alert } from '../components/ui';

export const ProfilePage: React.FC = () => {
  const { user, role, studentId, teacherId } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
          Meu Perfil & Vínculo Acadêmico
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Informações da sua conta autenticada e vínculos institucionais
          retornados pelo endpoint <code className="font-mono">GET /api/auth/me</code>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Credenciais de Usuário"
          subtitle="Registro principal na tabela Users"
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <UserIcon className="w-5 h-5 text-[#2563EB] shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Nome Completo</p>
                <p className="font-semibold text-[#0F172A]">{user?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <Mail className="w-5 h-5 text-[#2563EB] shrink-0" />
              <div>
                <p className="text-xs text-slate-500">E-mail Institucional</p>
                <p className="font-semibold text-[#0F172A]">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <Shield className="w-5 h-5 text-[#2563EB] shrink-0" />
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Papel de Acesso (Role)</p>
                  <p className="font-semibold text-[#0F172A]">{role}</p>
                </div>
                <Badge
                  variant={
                    role === 'ADMIN'
                      ? 'primary'
                      : role === 'PROFESSOR'
                        ? 'info'
                        : 'success'
                  }
                >
                  {role}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card
          title="Vínculo Acadêmico"
          subtitle="Associação relacional com Aluno (Student) ou Professor (Teacher)"
        >
          {role === 'ALUNO' && (
            <div className="space-y-4">
              {user?.student || studentId ? (
                <>
                  <Alert variant="success" title="Vínculo de Aluno Ativo">
                    Sua conta de usuário está vinculada a um registro acadêmico
                    de estudante. Seus dados são isolados horizontalmente.
                  </Alert>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block">Student ID</span>
                      <span className="font-mono font-semibold text-[#0F172A] break-all">
                        {studentId}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block">
                        Matrícula (Registration)
                      </span>
                      <span className="font-mono font-semibold text-[#0F172A]">
                        {user?.student?.registration || 'S-VINCULADO'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <Alert
                  variant="warning"
                  title="Aguardando Vínculo de Matrícula"
                >
                  Sua conta de usuário (<code>ALUNO</code>) foi criada via
                  auto-cadastro público e aguarda vinculação acadêmica pela
                  secretaria escolar (<code>ADMIN</code>).
                </Alert>
              )}
            </div>
          )}

          {role === 'PROFESSOR' && (
            <div className="space-y-4">
              {user?.teacher || teacherId ? (
                <>
                  <Alert variant="info" title="Vínculo Docente Ativo">
                    Sua conta está associada ao corpo docente e possui acesso
                    restrito às turmas sob sua responsabilidade.
                  </Alert>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block">Teacher ID</span>
                      <span className="font-mono font-semibold text-[#0F172A] break-all">
                        {teacherId}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block">
                        Registro Funcional
                      </span>
                      <span className="font-mono font-semibold text-[#0F172A]">
                        {user?.teacher?.registration || 'T-VINCULADO'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <Alert variant="warning" title="Sem Vínculo Docente">
                  Este usuário possui papel <code>PROFESSOR</code>, mas ainda
                  não foi associado a um registro Teacher.
                </Alert>
              )}
            </div>
          )}

          {role === 'ADMIN' && (
            <div className="space-y-4">
              <Alert variant="info" title="Credencial Administrativa Global">
                Contas <strong>ADMIN</strong> possuem jurisdição global sobre a
                plataforma e não requerem vínculo individual de aluno ou
                professor.
              </Alert>
              <div className="flex items-center gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <GraduationCap className="w-5 h-5 text-[#1E3A8A]" />
                <BookOpenCheck className="w-5 h-5 text-[#2563EB]" />
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span className="text-slate-700 font-medium">
                  Acesso liberado para criação transacional de Alunos,
                  Professores, Turmas, Disciplinas e Matrículas.
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
