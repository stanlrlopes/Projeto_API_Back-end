import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/userRepository';
import { z } from 'zod';
import { registerSchema, loginSchema } from '../schemas/authSchema';
import { Role } from '@prisma/client';

const userRepository = new UserRepository();

export class AuthService {
  async register(
    data: Partial<z.infer<typeof registerSchema>> & { name: string; email: string; password: string },
    requester?: { id: string; role: Role }
  ) {
    const requestedRole = data.role ?? Role.ALUNO;

    let effectiveRequesterRole: Role | undefined;
    if (requester?.id) {
      const dbRequester = await userRepository.findById(requester.id);
      if (dbRequester) {
        effectiveRequesterRole = dbRequester.role;
      }
    }

    // Impede que usuários anônimos, removidos ou rebaixados no banco criem contas ADMIN ou PROFESSOR
    if (requestedRole !== Role.ALUNO && effectiveRequesterRole !== Role.ADMIN) {
      throw {
        status: 403,
        message: 'Acesso negado. O cadastro público permite criar exclusivamente contas de ALUNO.',
        code: 'FORBIDDEN'
      };
    }

    const assignedRole = effectiveRequesterRole === Role.ADMIN ? requestedRole : Role.ALUNO;

    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw { status: 409, message: 'E-mail já cadastrado', code: 'EMAIL_ALREADY_EXISTS' };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await userRepository.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: assignedRole,
    });

    const { password: _password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(data: z.infer<typeof loginSchema>) {
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      throw { status: 401, message: 'Credenciais inválidas', code: 'INVALID_CREDENTIALS' };
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw { status: 401, message: 'Credenciais inválidas', code: 'INVALID_CREDENTIALS' };
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    const { password: _password, ...userWithoutPassword } = user;

    return {
      token,
      user: {
        ...userWithoutPassword,
        studentId: user.student?.id ?? null,
        teacherId: user.teacher?.id ?? null,
      }
    };
  }

  async me(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw { status: 404, message: 'Usuário não encontrado', code: 'USER_NOT_FOUND' };
    }

    const { password: _password, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      studentId: user.student?.id ?? null,
      teacherId: user.teacher?.id ?? null,
    };
  }
}
