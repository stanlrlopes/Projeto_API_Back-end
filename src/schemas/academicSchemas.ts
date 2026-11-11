import { z } from 'zod';
import { EnrollmentStatus } from '@prisma/client';

export const createClassSchema = z.object({
  name: z.string().min(3, 'Nome mínimo de 3 caracteres'),
  year: z.number().int().min(2000, 'Ano inválido'),
  semester: z.number().int().min(1).max(2, 'Semestre deve ser 1 ou 2'),
  teacherId: z.string().uuid('ID de professor inválido'),
  subjectId: z.string().uuid('ID de disciplina inválido')
});

export const updateClassSchema = createClassSchema.partial();

export const createEnrollmentSchema = z.object({
  studentId: z.string().uuid('ID de aluno inválido'),
  classId: z.string().uuid('ID de turma inválido'),
  status: z.nativeEnum(EnrollmentStatus).optional().default(EnrollmentStatus.ACTIVE)
});

export const updateEnrollmentSchema = z.object({
  status: z.nativeEnum(EnrollmentStatus)
});
