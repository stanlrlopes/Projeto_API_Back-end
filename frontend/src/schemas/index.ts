import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'O e-mail é obrigatório')
    .email('Informe um endereço de e-mail válido'),
  password: z
    .string()
    .min(1, 'A senha é obrigatória')
    .min(6, 'A senha deve possuir no mínimo 6 caracteres'),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, 'O nome completo é obrigatório')
      .min(3, 'O nome deve possuir no mínimo 3 caracteres'),
    email: z
      .string()
      .min(1, 'O e-mail é obrigatório')
      .email('Informe um endereço de e-mail válido'),
    password: z
      .string()
      .min(1, 'A senha é obrigatória')
      .min(6, 'A senha deve possuir no mínimo 6 caracteres'),
    confirmPassword: z
      .string()
      .min(1, 'A confirmação de senha é obrigatória'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas informadas não coincidem',
    path: ['confirmPassword'],
  });

export type LoginFormInput = z.infer<typeof loginSchema>;
export type RegisterFormInput = z.infer<typeof registerSchema>;

export interface RegisterApiPayload {
  name: string;
  email: string;
  password: string;
}

// ============================================================================
// FASE 3.3.2 — Schemas de Alunos, Professores e Disciplinas (espelhando basicSchemas.ts)
// ============================================================================

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createStudentFormSchema = z
  .object({
    linkMode: z.enum(['password', 'userId']),
    name: z
      .string()
      .min(1, 'O nome do aluno é obrigatório')
      .min(3, 'O nome deve possuir no mínimo 3 caracteres'),
    email: z
      .string()
      .min(1, 'O e-mail é obrigatório')
      .email('Informe um endereço de e-mail válido'),
    registration: z
      .string()
      .min(1, 'A matrícula é obrigatória')
      .min(3, 'A matrícula deve possuir no mínimo 3 caracteres'),
    birthDate: z
      .string()
      .min(1, 'A data de nascimento é obrigatória')
      .refine((val) => !Number.isNaN(new Date(val).getTime()), {
        message: 'Informe uma data de nascimento válida',
      }),
    password: z.string().optional(),
    userId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.linkMode === 'password') {
      if (!data.password || data.password.trim().length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'A senha inicial deve possuir no mínimo 6 caracteres',
        });
      }
    } else if (data.linkMode === 'userId') {
      if (!data.userId || !uuidRegex.test(data.userId.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['userId'],
          message: 'Informe um UUID válido de usuário ALUNO existente',
        });
      }
    }
  });

export const updateStudentFormSchema = z.object({
  name: z
    .string()
    .min(1, 'O nome do aluno é obrigatório')
    .min(3, 'O nome deve possuir no mínimo 3 caracteres'),
  email: z
    .string()
    .min(1, 'O e-mail é obrigatório')
    .email('Informe um endereço de e-mail válido'),
  registration: z
    .string()
    .min(1, 'A matrícula é obrigatória')
    .min(3, 'A matrícula deve possuir no mínimo 3 caracteres'),
  birthDate: z
    .string()
    .min(1, 'A data de nascimento é obrigatória')
    .refine((val) => !Number.isNaN(new Date(val).getTime()), {
      message: 'Informe uma data de nascimento válida',
    }),
});

export const createTeacherFormSchema = z
  .object({
    linkMode: z.enum(['password', 'userId']),
    name: z
      .string()
      .min(1, 'O nome do professor é obrigatório')
      .min(3, 'O nome deve possuir no mínimo 3 caracteres'),
    email: z
      .string()
      .min(1, 'O e-mail é obrigatório')
      .email('Informe um endereço de e-mail válido'),
    registration: z
      .string()
      .min(1, 'O registro funcional é obrigatório')
      .min(3, 'O registro funcional deve possuir no mínimo 3 caracteres'),
    password: z.string().optional(),
    userId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.linkMode === 'password') {
      if (!data.password || data.password.trim().length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'A senha inicial deve possuir no mínimo 6 caracteres',
        });
      }
    } else if (data.linkMode === 'userId') {
      if (!data.userId || !uuidRegex.test(data.userId.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['userId'],
          message: 'Informe um UUID válido de usuário PROFESSOR existente',
        });
      }
    }
  });

export const updateTeacherFormSchema = z.object({
  name: z
    .string()
    .min(1, 'O nome do professor é obrigatório')
    .min(3, 'O nome deve possuir no mínimo 3 caracteres'),
  email: z
    .string()
    .min(1, 'O e-mail é obrigatório')
    .email('Informe um endereço de e-mail válido'),
  registration: z
    .string()
    .min(1, 'O registro funcional é obrigatório')
    .min(3, 'O registro funcional deve possuir no mínimo 3 caracteres'),
});

export const subjectFormSchema = z.object({
  name: z
    .string()
    .min(1, 'O nome da disciplina é obrigatório')
    .min(3, 'O nome da disciplina deve possuir no mínimo 3 caracteres'),
  description: z.string().optional(),
  workload: z.coerce
    .number({ invalid_type_error: 'Informe uma carga horária numérica' })
    .int('A carga horária deve ser um número inteiro de horas')
    .positive('A carga horária deve ser maior que zero'),
});

export type CreateStudentFormInput = z.infer<typeof createStudentFormSchema>;
export type UpdateStudentFormInput = z.infer<typeof updateStudentFormSchema>;
export type CreateTeacherFormInput = z.infer<typeof createTeacherFormSchema>;
export type UpdateTeacherFormInput = z.infer<typeof updateTeacherFormSchema>;
export type SubjectFormInput = z.infer<typeof subjectFormSchema>;

// ============================================================================
// FASE 3.3.3 — Schemas de Turmas e Matrículas (espelhando academicSchemas.ts)
// ============================================================================

export const enrollmentStatusEnum = z.enum([
  'ACTIVE',
  'INACTIVE',
  'CANCELLED',
  'COMPLETED',
]);

export const classFormSchema = z.object({
  name: z
    .string()
    .min(1, 'O nome ou código da turma é obrigatório')
    .min(3, 'O nome da turma deve possuir no mínimo 3 caracteres'),
  year: z.coerce
    .number({ invalid_type_error: 'Informe um ano letivo válido' })
    .int('O ano letivo deve ser um número inteiro')
    .min(2000, 'O ano letivo deve ser igual ou superior a 2000'),
  semester: z.coerce
    .number({ invalid_type_error: 'Selecione o semestre letivo' })
    .int('O semestre deve ser um número inteiro')
    .min(1, 'O semestre deve ser 1 ou 2')
    .max(2, 'O semestre deve ser 1 ou 2'),
  teacherId: z
    .string()
    .min(1, 'Selecione o professor responsável')
    .regex(uuidRegex, 'Selecione um professor válido'),
  subjectId: z
    .string()
    .min(1, 'Selecione a disciplina vinculada')
    .regex(uuidRegex, 'Selecione uma disciplina válida'),
});

export const createEnrollmentFormSchema = z.object({
  studentId: z
    .string()
    .min(1, 'Selecione o aluno para a matrícula')
    .regex(uuidRegex, 'Selecione um aluno válido'),
  classId: z
    .string()
    .min(1, 'Selecione a turma para a matrícula')
    .regex(uuidRegex, 'Selecione uma turma válida'),
  status: enrollmentStatusEnum.default('ACTIVE'),
});

export const updateEnrollmentStatusFormSchema = z.object({
  status: enrollmentStatusEnum,
});

export type ClassFormInput = z.infer<typeof classFormSchema>;
export type CreateEnrollmentFormInput = z.infer<
  typeof createEnrollmentFormSchema
>;
export type UpdateEnrollmentStatusFormInput = z.infer<
  typeof updateEnrollmentStatusFormSchema
>;

// ============================================================================
// FASE 3.3.4 — Schemas de Conteúdos e Atividades (espelhando contentSchemas.ts)
// ============================================================================

export const contentFormSchema = z.object({
  title: z
    .string()
    .min(1, 'O título do conteúdo é obrigatório')
    .min(3, 'O título deve possuir no mínimo 3 caracteres'),
  description: z.string().optional(),
  subjectId: z
    .string()
    .min(1, 'Selecione a disciplina vinculada')
    .regex(uuidRegex, 'Selecione uma disciplina válida'),
});

export const activityFormSchema = z.object({
  title: z
    .string()
    .min(1, 'O título da atividade é obrigatório')
    .min(3, 'O título deve possuir no mínimo 3 caracteres'),
  description: z.string().optional(),
  contentId: z
    .string()
    .min(1, 'Selecione o conteúdo programático associado')
    .regex(uuidRegex, 'Selecione um conteúdo válido'),
  classId: z
    .string()
    .min(1, 'Selecione a turma letiva')
    .regex(uuidRegex, 'Selecione uma turma válida'),
  dueDate: z
    .string()
    .min(1, 'A data de entrega é obrigatória')
    .refine((val) => !Number.isNaN(new Date(val).getTime()), {
      message: 'Informe uma data de entrega válida',
    }),
  maxScore: z.coerce
    .number({ invalid_type_error: 'Informe a pontuação máxima da atividade' })
    .positive('A nota máxima deve ser maior que zero'),
});

export type ContentFormInput = z.infer<typeof contentFormSchema>;
export type ActivityFormInput = z.infer<typeof activityFormSchema>;

// ============================================================================
// FASE 3.3.5 — Schemas de Notas (espelhando evaluationSchemas.ts)
// ============================================================================

export const createGradeFormSchema = z.object({
  studentId: z
    .string()
    .min(1, 'Selecione o estudante matriculado')
    .regex(uuidRegex, 'Selecione um estudante válido'),
  activityId: z
    .string()
    .min(1, 'Selecione a atividade avaliativa')
    .regex(uuidRegex, 'Selecione uma atividade válida'),
  score: z.coerce
    .number({ invalid_type_error: 'Informe um valor numérico para a nota' })
    .min(0, 'A nota não pode ser negativa'),
});

export const updateGradeFormSchema = z.object({
  score: z.coerce
    .number({ invalid_type_error: 'Informe um valor numérico para a nota' })
    .min(0, 'A nota não pode ser negativa'),
});

export type CreateGradeFormInput = z.infer<typeof createGradeFormSchema>;
export type UpdateGradeFormInput = z.infer<typeof updateGradeFormSchema>;

// ============================================================================
// FASE 3.3.6 — Schemas de Frequência Escolar (espelhando evaluationSchemas.ts)
// ============================================================================

export const createAttendanceFormSchema = z.object({
  classId: z
    .string()
    .min(1, 'Selecione a turma letiva')
    .regex(uuidRegex, 'Selecione uma turma válida'),
  studentId: z
    .string()
    .min(1, 'Selecione o estudante matriculado')
    .regex(uuidRegex, 'Selecione um estudante válido'),
  date: z
    .string()
    .min(1, 'A data da chamada é obrigatória')
    .refine((val) => !Number.isNaN(new Date(val).getTime()), {
      message: 'Informe uma data válida para o registro de frequência',
    }),
  present: z.boolean(),
});

export const updateAttendanceFormSchema = z.object({
  present: z.boolean(),
});

export type CreateAttendanceFormInput = z.infer<
  typeof createAttendanceFormSchema
>;
export type UpdateAttendanceFormInput = z.infer<
  typeof updateAttendanceFormSchema
>;
