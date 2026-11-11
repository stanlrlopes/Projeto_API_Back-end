import { z } from 'zod';

export const createContentSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  subjectId: z.string().uuid('ID de disciplina inválido')
});

export const updateContentSchema = createContentSchema.partial();

export const createActivitySchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  contentId: z.string().uuid('ID de conteúdo inválido'),
  classId: z.string().uuid('ID de turma inválido'),
  dueDate: z.coerce.date({ message: 'Data de entrega inválida' }),
  maxScore: z.number().positive('A nota máxima deve ser maior que zero')
});

export const updateActivitySchema = createActivitySchema.partial();
