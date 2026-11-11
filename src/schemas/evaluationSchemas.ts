import { z } from 'zod';

export const createGradeSchema = z.object({
  studentId: z.string().uuid('ID de aluno inválido'),
  activityId: z.string().uuid('ID de atividade inválido'),
  score: z.number().min(0, 'A nota não pode ser negativa')
});

export const updateGradeSchema = z.object({
  score: z.number().min(0, 'A nota não pode ser negativa')
});

export const createAttendanceSchema = z.object({
  studentId: z.string().uuid('ID de aluno inválido'),
  classId: z.string().uuid('ID de turma inválido'),
  date: z.coerce.date({ message: 'Data inválida' }),
  present: z.boolean()
});

export const updateAttendanceSchema = z.object({
  present: z.boolean()
});
