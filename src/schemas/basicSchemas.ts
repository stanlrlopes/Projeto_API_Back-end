import { z } from 'zod';

export const createStudentSchema = z.object({
  userId: z.string().uuid('ID de usuário inválido').optional(),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres').optional(),
  name: z.string().min(3, 'Nome mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  birthDate: z.coerce.date(),
  registration: z.string().min(3, 'Matrícula inválida')
});

export const updateStudentSchema = createStudentSchema.partial().omit({ userId: true, password: true });

export const createTeacherSchema = z.object({
  userId: z.string().uuid('ID de usuário inválido').optional(),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres').optional(),
  name: z.string().min(3, 'Nome mínimo 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  registration: z.string().min(3, 'Matrícula inválida')
});

export const updateTeacherSchema = createTeacherSchema.partial().omit({ userId: true, password: true });

export const createSubjectSchema = z.object({
  name: z.string().min(3, 'Nome da disciplina mínimo 3 caracteres'),
  description: z.string().optional(),
  workload: z.number().positive('Carga horária deve ser positiva')
});

export const updateSubjectSchema = createSubjectSchema.partial();
