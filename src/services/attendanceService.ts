import { AttendanceRepository } from '../repositories/attendanceRepository';
import { ClassRepository } from '../repositories/classRepository';
import { EnrollmentRepository } from '../repositories/enrollmentRepository';
import { z } from 'zod';
import { createAttendanceSchema, updateAttendanceSchema } from '../schemas/evaluationSchemas';
import { Prisma, Role } from '@prisma/client';
import { Requester } from './studentService';

const repository = new AttendanceRepository();
const classRepository = new ClassRepository();
const enrollmentRepository = new EnrollmentRepository();

export class AttendanceService {
  async getAll(page: number, limit: number, requester?: Requester) {
    const skip = (page - 1) * limit;
    let where: Prisma.AttendanceWhereInput | undefined;
    if (requester?.role === Role.ALUNO) {
      where = { student: { userId: requester.id } };
    } else if (requester?.role === Role.PROFESSOR) {
      where = { class: { teacher: { userId: requester.id } } };
    }
    const total = await repository.count(where);
    const data = await repository.findAll(skip, limit, where);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string, requester?: Requester) {
    const entity = await repository.findById(id);
    if (!entity) throw { status: 404, message: 'Frequência não encontrada', code: 'ATTENDANCE_NOT_FOUND' };
    if (requester?.role === Role.ALUNO && entity.student?.userId !== requester.id) {
      throw { status: 403, message: 'Acesso negado. Você só pode consultar sua própria frequência.', code: 'FORBIDDEN' };
    }
    if (requester?.role === Role.PROFESSOR && entity.class?.teacher?.userId !== requester.id) {
      throw { status: 403, message: 'Acesso negado. Esta frequência pertence a uma turma de outro professor.', code: 'FORBIDDEN' };
    }
    return entity;
  }

  async create(data: z.infer<typeof createAttendanceSchema>, requester?: Requester) {
    const classEntity = await classRepository.findById(data.classId);
    if (!classEntity) {
      throw { status: 404, message: 'Turma não encontrada', code: 'CLASS_NOT_FOUND' };
    }
    if (requester?.role === Role.PROFESSOR && classEntity.teacher?.userId !== requester.id) {
      throw { status: 403, message: 'Acesso negado. Você só pode registrar frequência nas suas próprias turmas.', code: 'FORBIDDEN' };
    }

    const enrollment = await enrollmentRepository.findByStudentAndClass(data.studentId, data.classId);
    if (!enrollment || enrollment.status !== 'ACTIVE') {
      throw { status: 400, message: 'O aluno não possui matrícula ativa nesta turma', code: 'STUDENT_NOT_ENROLLED' };
    }

    // Normalizando a data para 00:00:00 e prevenindo duplicidade de faltas/presenças no mesmo dia
    const normalizedDate = new Date(data.date);
    normalizedDate.setUTCHours(0, 0, 0, 0);
    
    const existing = await repository.findByUniqueParams(data.studentId, data.classId, normalizedDate);
    if (existing) {
      throw { status: 409, message: 'Frequência já registrada para este aluno nesta data', code: 'DUPLICATE_ATTENDANCE' };
    }
    
    return repository.create({ ...data, date: normalizedDate });
  }

  async update(id: string, data: z.infer<typeof updateAttendanceSchema>, requester?: Requester) {
    await this.getById(id, requester);
    return repository.update(id, data);
  }

  async delete(id: string, requester?: Requester) {
    await this.getById(id, requester);
    return repository.delete(id);
  }
}
