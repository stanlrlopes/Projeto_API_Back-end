import { ClassRepository } from '../repositories/classRepository';
import { z } from 'zod';
import { createClassSchema, updateClassSchema } from '../schemas/academicSchemas';
import { Prisma, Role } from '@prisma/client';
import { Requester } from './studentService';

const repository = new ClassRepository();

export class ClassService {
  async getAll(page: number, limit: number, requester?: Requester) {
    const skip = (page - 1) * limit;
    let where: Prisma.ClassWhereInput | undefined;
    if (requester?.role === Role.PROFESSOR) {
      where = { teacher: { userId: requester.id } };
    } else if (requester?.role === Role.ALUNO) {
      where = { enrollments: { some: { student: { userId: requester.id }, status: 'ACTIVE' } } };
    }
    const total = await repository.count(where);
    const data = await repository.findAll(skip, limit, where);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  async getById(id: string, requester?: Requester) {
    const classEntity = await repository.findById(id);
    if (!classEntity) throw { status: 404, message: 'Turma não encontrada', code: 'CLASS_NOT_FOUND' };
    if (requester?.role === Role.PROFESSOR && classEntity.teacher?.userId !== requester.id) {
      throw { status: 403, message: 'Acesso negado. Você só pode acessar suas próprias turmas.', code: 'FORBIDDEN' };
    }
    if (requester?.role === Role.ALUNO) {
      const hasActiveEnrollment = classEntity.enrollments?.some(
        (e) => e.student?.userId === requester.id && e.status === 'ACTIVE'
      );
      if (!hasActiveEnrollment) {
        throw { status: 403, message: 'Acesso negado. Você só pode consultar turmas nas quais possua matrícula ativa.', code: 'FORBIDDEN' };
      }
    }
    return classEntity;
  }
  async create(data: z.infer<typeof createClassSchema>) {
    return repository.create(data);
  }
  async update(id: string, data: z.infer<typeof updateClassSchema>) {
    await this.getById(id);
    return repository.update(id, data);
  }
  async delete(id: string) {
    const existing = await this.getById(id);
    const hasEnrollments = Boolean(existing.enrollments && existing.enrollments.length > 0);
    const hasActivities = Boolean(existing.activities && existing.activities.length > 0);
    const hasAttendances = Boolean(existing.attendances && existing.attendances.length > 0);

    if (hasEnrollments || hasActivities || hasAttendances) {
      throw {
        status: 409,
        message: 'Não é possível excluir uma turma que possui matrículas, atividades ou registros de frequência vinculados.',
        code: 'CLASS_HAS_DEPENDENCIES'
      };
    }

    return repository.delete(id);
  }
}
