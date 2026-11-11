import { EnrollmentRepository } from '../repositories/enrollmentRepository';
import { GradeRepository } from '../repositories/gradeRepository';
import { AttendanceRepository } from '../repositories/attendanceRepository';
import { z } from 'zod';
import { createEnrollmentSchema, updateEnrollmentSchema } from '../schemas/academicSchemas';
import { Prisma, Role } from '@prisma/client';
import { Requester } from './studentService';

const repository = new EnrollmentRepository();
const gradeRepository = new GradeRepository();
const attendanceRepository = new AttendanceRepository();

export class EnrollmentService {
  async getAll(page: number, limit: number, requester?: Requester) {
    const skip = (page - 1) * limit;
    let where: Prisma.EnrollmentWhereInput | undefined;
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
    const enrollment = await repository.findById(id);
    if (!enrollment) throw { status: 404, message: 'Matrícula não encontrada', code: 'ENROLLMENT_NOT_FOUND' };
    if (requester?.role === Role.ALUNO && enrollment.student?.userId !== requester.id) {
      throw { status: 403, message: 'Acesso negado. Você só pode consultar suas próprias matrículas.', code: 'FORBIDDEN' };
    }
    if (requester?.role === Role.PROFESSOR && enrollment.class?.teacher?.userId !== requester.id) {
      throw { status: 403, message: 'Acesso negado. Esta matrícula pertence a uma turma de outro professor.', code: 'FORBIDDEN' };
    }
    return enrollment;
  }
  async create(data: z.infer<typeof createEnrollmentSchema>) {
    const existing = await repository.findByStudentAndClass(data.studentId, data.classId);
    if (existing) {
      throw { status: 409, message: 'Aluno já matriculado nesta turma', code: 'DUPLICATE_ENROLLMENT' };
    }
    return repository.create(data);
  }
  async update(id: string, data: z.infer<typeof updateEnrollmentSchema>) {
    await this.getById(id);
    return repository.update(id, data);
  }
  async delete(id: string) {
    const existing = await this.getById(id);

    const gradesCount =
      (await gradeRepository.count({
        studentId: existing.studentId,
        activity: { classId: existing.classId }
      })) || 0;

    const attendancesCount =
      (await attendanceRepository.count({
        studentId: existing.studentId,
        classId: existing.classId
      })) || 0;

    if (gradesCount > 0 || attendancesCount > 0) {
      throw {
        status: 409,
        message:
          'Não é possível excluir uma matrícula que possui histórico acadêmico (notas ou frequência) vinculado nesta turma. Altere o status da matrícula para INACTIVE ou CANCELLED.',
        code: 'ENROLLMENT_HAS_HISTORY'
      };
    }

    return repository.delete(id);
  }
}
