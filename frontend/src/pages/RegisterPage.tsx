import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  UserPlus,
  User as UserIcon,
  Mail,
  Lock,
  ShieldCheck,
  ArrowLeft,
  GraduationCap,
} from 'lucide-react';
import { registerSchema, RegisterFormInput } from '../schemas';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getApiErrorMessage } from '../services/api';
import { Button, Input, PasswordInput, Alert, Badge } from '../components/ui';

export const RegisterPage: React.FC = () => {
  const {
    register: registerAccount,
    isAuthenticated,
    isLoading,
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: RegisterFormInput) => {
    setApiError(null);
    try {
      const createdUser = await registerAccount({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      toast.success(
        'Cadastro concluído com sucesso!',
        `Conta ${createdUser.email} registrada com perfil ${createdUser.role}.`,
      );

      navigate('/login', {
        replace: true,
        state: { registeredEmail: createdUser.email },
      });
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        'Não foi possível concluir o cadastro. Verifique os dados informados.',
      );
      setApiError(message);
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
                Auto-Cadastro Público de Estudante
              </span>
            </div>
          </div>
          <Badge variant="success" className="bg-emerald-900/70 text-emerald-200 border-emerald-700">
            PERFIL ALUNO
          </Badge>
        </div>

        <div className="relative z-10 my-8 lg:my-0 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E3A8A]/70 border border-blue-700/60 text-xs font-medium text-blue-100">
            <GraduationCap className="w-4 h-4 text-blue-300" />
            Portal do Estudante • ODS 4 Educação de Qualidade
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
            Crie sua conta de Aluno na EducaAPI.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
            O cadastro público cria exclusivamente contas com perfil{' '}
            <strong className="text-white">ALUNO</strong>. Contas de corpo
            docente (<strong className="text-white">PROFESSOR</strong>) e
            administradores (<strong className="text-white">ADMIN</strong>) são
            provisionadas exclusivamente pela administração escolar.
          </p>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Diretriz de Segurança Institucional
            </div>
            <p className="leading-relaxed">
              Toda conta pública recebe automaticamente o papel{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300">
                ALUNO
              </code>{' '}
              validado pelo Back-End, impedindo qualquer elevação indevida de
              privilégios.
            </p>
          </div>
        </div>

        <div className="relative z-10 hidden lg:flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-4">
          <span>EducaAPI • Proteção contra Elevação de Privilégios</span>
          <span>Fase 3.2 — Identidade Visual & Autenticação</span>
        </div>
      </div>

      {/* Área do Formulário de Cadastro */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
                Cadastro de Estudante
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Preencha seus dados para criar seu acesso como aluno.
              </p>
            </div>
            <Badge variant="success">ALUNO</Badge>
          </div>

          <Alert variant="info" title="Perfil atribuído automaticamente">
            Este formulário cria exclusivamente uma conta de{' '}
            <strong>ALUNO</strong>. Após o cadastro, a secretaria/administração
            poderá vincular sua matrícula acadêmica às turmas.
          </Alert>

          {apiError && (
            <Alert
              variant="error"
              title="Não foi possível concluir o cadastro"
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
              label="Nome completo"
              type="text"
              placeholder="Ex.: Maria Clara Oliveira"
              autoComplete="name"
              required
              leftIcon={<UserIcon className="w-4 h-4" />}
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="E-mail"
              type="email"
              placeholder="maria.oliveira@educaapi.com"
              autoComplete="email"
              required
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <PasswordInput
              label="Senha"
              placeholder="Mínimo de 6 caracteres"
              autoComplete="new-password"
              required
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />

            <PasswordInput
              label="Confirmar senha"
              placeholder="Repita a senha informada"
              autoComplete="new-password"
              required
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                Concluir Cadastro de Aluno
              </Button>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>Já possui uma conta cadastrada?</span>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar para Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
