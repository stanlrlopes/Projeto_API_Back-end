import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  LogIn,
  Mail,
  Lock,
  ShieldCheck,
  GraduationCap,
  BookOpenCheck,
  UserPlus,
} from 'lucide-react';
import { loginSchema, LoginFormInput } from '../schemas';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getApiErrorMessage } from '../services/api';
import { Button, Input, PasswordInput, Alert, Badge } from '../components/ui';

interface LocationState {
  from?: {
    pathname?: string;
  };
  registeredEmail?: string;
}

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || {};

  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: state.registeredEmail || '',
      password: '',
    },
  });

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: LoginFormInput) => {
    setApiError(null);
    try {
      const authenticatedUser = await login({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      toast.success(
        `Bem-vindo(a), ${authenticatedUser.name}!`,
        `Sessão iniciada com perfil ${authenticatedUser.role}.`,
      );

      const destination = state.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        'E-mail ou senha inválidos. Verifique suas credenciais e tente novamente.',
      );
      setApiError(message);
    }
  };

  const fillDevSeedAccount = (email?: string) => {
    if (!import.meta.env.DEV || !email) return;
    setApiError(null);
    setValue('email', email, { shouldValidate: true });
    if (import.meta.env.VITE_DEV_SEED_PASSWORD) {
      setValue('password', import.meta.env.VITE_DEV_SEED_PASSWORD, {
        shouldValidate: true,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">
      {/* Painel Institucional Esquerdo */}
      <div className="lg:w-5/12 xl:w-1/2 bg-[#0F172A] text-white p-6 sm:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#1E3A8A]/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#2563EB]/25 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center font-bold text-lg text-white shadow-md">
              E
            </div>
            <div>
              <span className="font-bold tracking-tight text-lg text-white block leading-none">
                EducaAPI
              </span>
              <span className="text-xs text-slate-300 block mt-1">
                Plataforma Institucional de Gestão Acadêmica
              </span>
            </div>
          </div>
          <Badge variant="info" className="bg-[#1E3A8A] text-blue-100 border-blue-700">
            ODS 4 • ONU
          </Badge>
        </div>

        <div className="relative z-10 my-8 lg:my-0 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E3A8A]/70 border border-blue-700/60 text-xs font-medium text-blue-100">
            <ShieldCheck className="w-4 h-4 text-blue-300" />
            Autenticação JWT & Controle de Acesso por Papel (RBAC)
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
            Educação de Qualidade com Gestão Acadêmica Transparente.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
            Acompanhe turmas, matrículas, conteúdos programáticos, avaliações,
            notas, frequência escolar e indicadores pedagógicos em um ambiente
            seguro e estruturado por perfil.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <ShieldCheck className="w-5 h-5 text-blue-400 mb-1.5" />
              <p className="text-xs font-semibold text-white">Perfil ADMIN</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Governança institucional, vínculos e métricas globais.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <BookOpenCheck className="w-5 h-5 text-emerald-400 mb-1.5" />
              <p className="text-xs font-semibold text-white">
                Perfil PROFESSOR
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Gestão pedagógica restrita às suas turmas vinculadas.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <GraduationCap className="w-5 h-5 text-amber-400 mb-1.5" />
              <p className="text-xs font-semibold text-white">Perfil ALUNO</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Consulta individual isolada de notas, frequência e atividades.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 hidden lg:flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-4">
          <span>EducaAPI • Arquitetura React + TypeScript + Prisma</span>
          <span>Fase 3.2 — Identidade Visual & Autenticação</span>
        </div>
      </div>

      {/* Área do Formulário de Login */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
              Acessar Conta Institucional
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Informe seu e-mail e senha para entrar no portal acadêmico.
            </p>
          </div>

          {state.registeredEmail && !apiError && (
            <Alert variant="success" title="Cadastro realizado com sucesso!">
              Sua conta de estudante foi criada com perfil{' '}
              <strong>ALUNO</strong>. Faça login abaixo para acessar.
            </Alert>
          )}

          {apiError && (
            <Alert
              variant="error"
              title="Falha na autenticação"
              onClose={() => setApiError(null)}
            >
              {apiError}
            </Alert>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            <Input
              label="E-mail institucional"
              type="email"
              placeholder="seu.email@instituicao.edu.br"
              autoComplete="email"
              required
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <PasswordInput
              label="Senha de acesso"
              placeholder="Digite sua senha"
              autoComplete="current-password"
              required
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
                leftIcon={<LogIn className="w-4 h-4" />}
              >
                Entrar na Plataforma
              </Button>
            </div>
          </form>

          {/* Painel exclusivo para Desenvolvimento Local (eliminado via Dead-Code Elimination no build de produção) */}
          {import.meta.env.DEV &&
            Boolean(
              import.meta.env.VITE_DEV_ADMIN_EMAIL ||
                import.meta.env.VITE_DEV_TEACHER_EMAIL ||
                import.meta.env.VITE_DEV_STUDENT_EMAIL,
            ) && (
              <div className="pt-4 border-t border-dashed border-amber-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                    Ambiente DEV • Perfis de Teste
                  </span>
                  <Badge variant="warning">DEV ONLY</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {import.meta.env.VITE_DEV_ADMIN_EMAIL && (
                    <button
                      type="button"
                      onClick={() =>
                        fillDevSeedAccount(import.meta.env.VITE_DEV_ADMIN_EMAIL)
                      }
                      className="px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-medium text-[#0F172A] transition-colors text-center"
                    >
                      <span className="block font-semibold text-[#1E3A8A]">
                        ADMIN
                      </span>
                    </button>
                  )}
                  {import.meta.env.VITE_DEV_TEACHER_EMAIL && (
                    <button
                      type="button"
                      onClick={() =>
                        fillDevSeedAccount(
                          import.meta.env.VITE_DEV_TEACHER_EMAIL,
                        )
                      }
                      className="px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-medium text-[#0F172A] transition-colors text-center"
                    >
                      <span className="block font-semibold text-[#2563EB]">
                        PROFESSOR
                      </span>
                    </button>
                  )}
                  {import.meta.env.VITE_DEV_STUDENT_EMAIL && (
                    <button
                      type="button"
                      onClick={() =>
                        fillDevSeedAccount(
                          import.meta.env.VITE_DEV_STUDENT_EMAIL,
                        )
                      }
                      className="px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-medium text-[#0F172A] transition-colors text-center"
                    >
                      <span className="block font-semibold text-emerald-700">
                        ALUNO
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
            <span>Ainda não possui conta de estudante?</span>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Criar conta de Aluno
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
