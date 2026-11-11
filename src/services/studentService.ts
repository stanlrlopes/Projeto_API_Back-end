import { StudentRepository } from '../repositories/studentRepository';
import { UserRepository } from '../repositories/userRepository';
import { z } from 'zod';
import { createStudentSchema, updateStudentSchema } from '../schemas/basicSchemas';
import { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const repository = new StudentRepository();
const userRepository = new UserRepository();

export interface Requester {
  id: string;
  role: Role;
}

export class StudentService {
  async getAll(page: number, limit: number, requester?: Requester) {
    const skip = (page - 1) * limit;
    const where: Prisma.StudentWhereInput | undefined =
      requester?.role === Role.ALUNO ? { userId: requester.id } : undefined;
    const total = await repository.count(where);
    const data = await repository.findAll(skip, limit, where);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string, requester?: Requester) {
    const student = await repository.findById(id);
    if (!student) throw { status: 404, message: 'Aluno não encontrado', code: 'STUDENT_NOT_FOUND' };
    if (requester?.role === Role.ALUNO && student.userId !== requester.id) {
      throw { status: 403, message: 'Acesso negado. Você só pode consultar seus próprios dados.', code: 'FORBIDDEN' };
    }
    return student;
  }

  async create(data: z.infer<typeof createStudentSchema>) {
    const existing = await repository.findByRegistrationOrEmail(data.registration, data.email);
    if (existing) throw { status: 409, message: 'Matrícula ou E-mail já cadastrado', code: 'DUPLICATE_RECORD' };

    if (data.userId) {
      const user = await userRepository.findById(data.userId);
      if (!user) {
        throw { status: 404, message: 'Usuário vinculado não encontrado', code: 'USER_NOT_FOUND' };
      }
      if (user.role !== Role.ALUNO) {
        throw { status: 400, message: 'O usuário vinculado deve possuir o perfil ALUNO', code: 'INCOMPATIBLE_USER_ROLE' };
      }
      if (user.student || user.teacher) {
        throw { status: 409, message: 'Este usuário já possui um perfil acadêmico vinculado', code: 'DUPLICATE_USER_LINK' };
      }
      return repository.create({
        userId: data.userId,
        name: data.name,
        email: data.email,
        birthDate: data.birthDate,
        registration: data.registration
      });
    }

    if (data.password) {
      const existingUser = await userRepository.findByEmail(data.email);
      if (existingUser) {
        throw { status: 409, message: 'E-mail de usuário já cadastrado', code: 'EMAIL_IN_USE' };
      }
      const hashedPassword = await bcrypt.hash(data.password, 10);
      return repository.createWithUser(
        {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: Role.ALUNO
        },
        {
          name: data.name,
          email: data.email,
          birthDate: data.birthDate,
          registration: data.registration
        }
      );
    }

    throw { status: 400, message: 'É necessário informar userId existente ou password para criação integrada', code: 'VALIDATION_ERROR' };
  }

  async update(id: string, data: z.infer<typeof updateStudentSchema>) {
    await this.getById(id);
    return repository.update(id, data);
  }

  async delete(id: string) {
    const existing = await this.getById(id);
    const hasEnrollments = Boolean(existing.enrollments && existing.enrollments.length > 0);
    const hasGrades = Boolean(existing.grades && existing.grades.length > 0);
    const hasAttendances = Boolean(existing.attendances && existing.attendances.length > 0);

    if (hasEnrollments || hasGrades || hasAttendances) {
      throw {
        status: 409,
        message: 'Não é possível excluir um aluno que já possui histórico acadêmico (matrículas, notas ou frequência).',
        code: 'STUDENT_HAS_HISTORY'
      };
    }

    return repository.delete(id);
  }
}
