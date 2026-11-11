import { GradeRepository } from '../repositories/gradeRepository';
import { ActivityRepository } from '../repositories/activityRepository';
import { EnrollmentRepository } from '../repositories/enrollmentRepository';
import { z } from 'zod';
import { createGradeSchema, updateGradeSchema } from '../schemas/evaluationSchemas';
import { Prisma, Role } from '@prisma/client';
import { Requester } from './studentService';

const repository = new GradeRepository();
const activityRepository = new ActivityRepository();
const enrollmentRepository = new EnrollmentRepository();

export class GradeService {
  async getAll(page: number, limit: number, requester?: Requester) {
    const skip = (page - 1) * limit;
    let where: Prisma.GradeWhereInput | undefined;
    if (requester?.role === Role.ALUNO) {
      where = { student: { userId: requester.id } };
    } else if (requester?.role === Role.PROFESSOR) {
      where = { activity: { class: { teacher: { userId: requester.id } } } };
    }
    const total = await repository.count(where);
    const data = await repository.findAll(skip, limit, where);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string, requester?: Requester) {
    const entity = await repository.findById(id);
    if (!entity) throw { status: 404, message: 'Nota não encontrada', code: 'GRADE_NOT_FOUND' };
    if (requester?.role === Role.ALUNO && entity.student?.userId !== requester.id) {
      throw { status: 403, message: 'Acesso negado. Você só pode consultar suas próprias notas.', code: 'FORBIDDEN' };
    }
    if (requester?.role === Role.PROFESSOR && entity.activity?.class?.teacher?.userId !== requester.id) {
      throw { status: 403, message: 'Acesso negado. Esta nota pertence a uma turma de outro professor.', code: 'FORBIDDEN' };
    }
    return entity;
  }

  async create(data: z.infer<typeof createGradeSchema>, requester?: Requester) {
    // Validação de Duplicidade
    const existing = await repository.findByStudentAndActivity(data.studentId, data.activityId);
    if (existing) {
      throw { status: 409, message: 'Aluno já possui nota para esta atividade', code: 'DUPLICATE_GRADE' };
    }
    
    // Regra de Negócio: nota não pode ser maior que o maxScore
    const activity = await activityRepository.findById(data.activityId);
    if (!activity) {
      throw { status: 404, message: 'Atividade não encontrada', code: 'ACTIVITY_NOT_FOUND' };
    }
    if (requester?.role === Role.PROFESSOR && activity.class?.teacher?.userId !== requester.id) {
      throw { status: 403, message: 'Acesso negado. Você só pode lançar notas em atividades das suas próprias turmas.', code: 'FORBIDDEN' };
    }
    if (activity.classId) {
      const enrollment = await enrollmentRepository.findByStudentAndClass(data.studentId, activity.classId);
      if (!enrollment || enrollment.status !== 'ACTIVE') {
        throw { status: 400, message: 'O aluno não possui matrícula ativa na turma desta atividade', code: 'STUDENT_NOT_ENROLLED' };
      }
    }
    if (data.score > activity.maxScore) {
      throw { 
        status: 400, 
        message: `A nota informada (${data.score}) excede a nota máxima permitida (${activity.maxScore})`, 
        code: 'INVALID_SCORE' 
      };
    }

    return repository.create(data);
  }

  async update(id: string, data: z.infer<typeof updateGradeSchema>, requester?: Requester) {
    const grade = await this.getById(id, requester);
    
    if (data.score !== undefined) {
      const activity = await activityRepository.findById(grade.activityId);
      if (activity && data.score > activity.maxScore) {
        throw { 
          status: 400, 
          message: `A nota informada excede a nota máxima permitida (${activity.maxScore})`, 
          code: 'INVALID_SCORE' 
        };
      }
    }
    
    return repository.update(id, data);
  }

  async delete(id: string, requester?: Requester) {
    await this.getById(id, requester);
    return repository.delete(id);
  }
}
