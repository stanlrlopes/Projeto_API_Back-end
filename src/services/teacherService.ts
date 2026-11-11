import { TeacherRepository } from '../repositories/teacherRepository';
import { UserRepository } from '../repositories/userRepository';
import { z } from 'zod';
import { createTeacherSchema, updateTeacherSchema } from '../schemas/basicSchemas';
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const repository = new TeacherRepository();
const userRepository = new UserRepository();

export class TeacherService {
  async getAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const total = await repository.count();
    const data = await repository.findAll(skip, limit);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const teacher = await repository.findById(id);
    if (!teacher) throw { status: 404, message: 'Professor não encontrado', code: 'TEACHER_NOT_FOUND' };
    return teacher;
  }

  async create(data: z.infer<typeof createTeacherSchema>) {
    const existing = await repository.findByRegistrationOrEmail(data.registration, data.email);
    if (existing) throw { status: 409, message: 'Matrícula ou E-mail já cadastrado', code: 'DUPLICATE_RECORD' };

    if (data.userId) {
      const user = await userRepository.findById(data.userId);
      if (!user) {
        throw { status: 404, message: 'Usuário vinculado não encontrado', code: 'USER_NOT_FOUND' };
      }
      if (user.role !== Role.PROFESSOR) {
        throw { status: 400, message: 'O usuário vinculado deve possuir o perfil PROFESSOR', code: 'INCOMPATIBLE_USER_ROLE' };
      }
      if (user.teacher || user.student) {
        throw { status: 409, message: 'Este usuário já possui um perfil acadêmico vinculado', code: 'DUPLICATE_USER_LINK' };
      }
      return repository.create({
        userId: data.userId,
        name: data.name,
        email: data.email,
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
          role: Role.PROFESSOR
        },
        {
          name: data.name,
          email: data.email,
          registration: data.registration
        }
      );
    }

    throw { status: 400, message: 'É necessário informar userId existente ou password para criação integrada', code: 'VALIDATION_ERROR' };
  }

  async update(id: string, data: z.infer<typeof updateTeacherSchema>) {
    await this.getById(id);
    return repository.update(id, data);
  }

  async delete(id: string) {
    const existing = await this.getById(id);
    if (existing.classes && existing.classes.length > 0) {
      throw {
        status: 409,
        message: 'Não é possível excluir um professor que possui turmas vinculadas.',
        code: 'TEACHER_HAS_DEPENDENCIES'
      };
    }
    return repository.delete(id);
  }
}
