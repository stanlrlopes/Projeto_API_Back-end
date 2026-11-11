import { AuthService } from '../src/services/authService';
import { AuthController } from '../src/controllers/authController';
import { StudentService } from '../src/services/studentService';
import { TeacherService } from '../src/services/teacherService';
import { ClassService } from '../src/services/classService';
import { SubjectService } from '../src/services/subjectService';
import { ContentService } from '../src/services/contentService';
import { ActivityService } from '../src/services/activityService';
import { GradeService } from '../src/services/gradeService';
import { AttendanceService } from '../src/services/attendanceService';
import { EnrollmentService } from '../src/services/enrollmentService';
import { IndicatorService } from '../src/services/indicatorService';
import { IndicatorController } from '../src/controllers/indicatorController';
import { UserRepository } from '../src/repositories/userRepository';
import { StudentRepository } from '../src/repositories/studentRepository';
import { TeacherRepository } from '../src/repositories/teacherRepository';
import { SubjectRepository } from '../src/repositories/subjectRepository';
import { ClassRepository } from '../src/repositories/classRepository';
import { EnrollmentRepository } from '../src/repositories/enrollmentRepository';
import { ContentRepository } from '../src/repositories/contentRepository';
import { ActivityRepository } from '../src/repositories/activityRepository';
import { GradeRepository } from '../src/repositories/gradeRepository';
import { AttendanceRepository } from '../src/repositories/attendanceRepository';
import { authMiddleware } from '../src/middlewares/authMiddleware';
import { roleMiddleware } from '../src/middlewares/roleMiddleware';
import { validate } from '../src/middlewares/validateMiddleware';
import { StudentController } from '../src/controllers/studentController';
import { ActivityController } from '../src/controllers/activityController';
import { createStudentSchema, updateStudentSchema, createSubjectSchema } from '../src/schemas/basicSchemas';
import { createActivitySchema, updateActivitySchema } from '../src/schemas/contentSchemas';
import { createAttendanceSchema } from '../src/schemas/evaluationSchemas';
import { createEnrollmentSchema } from '../src/schemas/academicSchemas';
import { registerSchema } from '../src/schemas/authSchema';
import { z } from 'zod';
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

jest.mock('../src/repositories/userRepository');
jest.mock('../src/repositories/studentRepository');
jest.mock('../src/repositories/teacherRepository');
jest.mock('../src/repositories/subjectRepository');
jest.mock('../src/repositories/classRepository');
jest.mock('../src/repositories/enrollmentRepository');
jest.mock('../src/repositories/contentRepository');
jest.mock('../src/repositories/activityRepository');
jest.mock('../src/repositories/gradeRepository');
jest.mock('../src/repositories/attendanceRepository');

var mockPrisma: {
  user: { create: jest.Mock };
  student: { findUnique: jest.Mock; findMany: jest.Mock; count: jest.Mock; create: jest.Mock };
  grade: { findMany: jest.Mock };
  attendance: { findMany: jest.Mock };
  teacher: { count: jest.Mock; create: jest.Mock };
  class: { count: jest.Mock };
  subject: { count: jest.Mock };
  $transaction: jest.Mock;
};

jest.mock('@prisma/client', () => {
  mockPrisma = {
    user: { create: jest.fn() },
    student: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
    grade: { findMany: jest.fn() },
    attendance: { findMany: jest.fn() },
    teacher: { count: jest.fn(), create: jest.fn() },
    class: { count: jest.fn() },
    subject: { count: jest.fn() },
    $transaction: jest.fn()
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
    Role: { ADMIN: 'ADMIN', PROFESSOR: 'PROFESSOR', ALUNO: 'ALUNO' },
    EnrollmentStatus: { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', CANCELLED: 'CANCELLED', COMPLETED: 'COMPLETED' }
  };
});

describe('EducaAPI - Testes de Negócio, Segurança e Autorização', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. AUTENTICAÇÃO, CADASTRO E REVALIDAÇÃO DE PRIVILÉGIOS JWT
  // =========================================================================
  describe('1. Autenticação, Cadastro e Revalidação de Privilégios JWT', () => {
    it('deve registrar usuário público como ALUNO por padrão', async () => {
      (UserRepository.prototype.findByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      (UserRepository.prototype.create as jest.Mock).mockResolvedValue({
        id: '1',
        name: 'A',
        email: 'a@a.com',
        password: 'hashed',
        role: Role.ALUNO
      });

      const auth = new AuthService();
      const res = await auth.register({ name: 'A', email: 'a@a.com', password: '123' });
      expect(res.email).toBe('a@a.com');
      expect(res.role).toBe(Role.ALUNO);
      expect(res).not.toHaveProperty('password');
    });

    it('deve realizar login e retornar studentId/teacherId na sessão', async () => {
      (UserRepository.prototype.findByEmail as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        password: 'hashed',
        role: Role.ALUNO,
        student: { id: 'stu-123' },
        teacher: null
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('token_jwt');

      const auth = new AuthService();
      const res = await auth.login({ email: 'a@a.com', password: '123' });
      expect(res.token).toBe('token_jwt');
      expect(res.user.studentId).toBe('stu-123');
      expect(res.user.teacherId).toBeNull();
    });

    it('deve rejeitar tentativa de cadastro público como ADMIN (403 FORBIDDEN)', async () => {
      const auth = new AuthService();
      await expect(
        auth.register({ name: 'Hacker Admin', email: 'hack@admin.com', password: '123456', role: Role.ADMIN })
      ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('deve rejeitar tentativa de cadastro público como PROFESSOR (403 FORBIDDEN)', async () => {
      const auth = new AuthService();
      await expect(
        auth.register({ name: 'Hacker Prof', email: 'hack@prof.com', password: '123456', role: Role.PROFESSOR })
      ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('deve permitir que ADMIN autenticado crie usuário PROFESSOR (201)', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ id: 'admin-1', role: Role.ADMIN });
      (UserRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'admin-1',
        role: Role.ADMIN
      });
      (UserRepository.prototype.findByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_prof');
      (UserRepository.prototype.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ id: 'prof-user-1', ...data })
      );

      const controller = new AuthController();
      const req: any = {
        headers: { authorization: 'Bearer valid_admin_token' },
        body: { name: 'Prof. Novo', email: 'prof.novo@educa.com', password: '123456', role: Role.PROFESSOR }
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await controller.register(req, res);

      expect(UserRepository.prototype.findById).toHaveBeenCalledWith('admin-1');
      expect(UserRepository.prototype.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.PROFESSOR })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ role: Role.PROFESSOR })
        })
      );
    });

    it('deve permitir que ADMIN autenticado crie outro usuário ADMIN (201)', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ id: 'admin-1', role: Role.ADMIN });
      (UserRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'admin-1',
        role: Role.ADMIN
      });
      (UserRepository.prototype.findByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_admin');
      (UserRepository.prototype.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ id: 'admin-user-2', ...data })
      );

      const controller = new AuthController();
      const req: any = {
        headers: { authorization: 'Bearer valid_admin_token' },
        body: { name: 'Admin 2', email: 'admin2@educa.com', password: '123456', role: Role.ADMIN }
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await controller.register(req, res);

      expect(UserRepository.prototype.findById).toHaveBeenCalledWith('admin-1');
      expect(UserRepository.prototype.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.ADMIN })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('deve rejeitar criação de ADMIN/PROFESSOR quando o token enviado no register é inválido ou expirado (403 FORBIDDEN)', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const controller = new AuthController();
      const req: any = {
        headers: { authorization: 'Bearer expired_admin_token' },
        body: { name: 'Tentativa Admin', email: 'fail@educa.com', password: '123456', role: Role.ADMIN }
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await controller.register(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'FORBIDDEN' })
        })
      );
      expect(UserRepository.prototype.create).not.toHaveBeenCalled();
    });

    it('deve bloquear criação privilegiada e acesso administrativo se o papel do usuário no banco foi alterado de ADMIN para ALUNO após emissão do JWT', async () => {
      // JWT antigo ainda declara role: ADMIN, porém no banco o usuário foi rebaixado para ALUNO
      (jwt.verify as jest.Mock).mockReturnValue({ id: 'ex-admin-1', role: Role.ADMIN });
      (UserRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'ex-admin-1',
        role: Role.ALUNO
      });

      // 1. Tentativa de criar PROFESSOR via AuthController.register com JWT antigo
      const controller = new AuthController();
      const regReq: any = {
        headers: { authorization: 'Bearer old_admin_jwt' },
        body: { name: 'Prof Indevido', email: 'indevido@educa.com', password: '123456', role: Role.PROFESSOR }
      };
      const regRes: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await controller.register(regReq, regRes);
      expect(regRes.status).toHaveBeenCalledWith(403);
      expect(UserRepository.prototype.create).not.toHaveBeenCalled();

      // 2. Tentativa de acessar rota protegida por authMiddleware + roleMiddleware([Role.ADMIN])
      const mwReq: any = { headers: { authorization: 'Bearer old_admin_jwt' } };
      const mwRes: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const nextAuth = jest.fn();

      await authMiddleware(mwReq, mwRes, nextAuth);
      // O authMiddleware deve sobrescrever req.user.role com o papel atual do banco (ALUNO)
      expect(mwReq.user).toEqual({ id: 'ex-admin-1', role: Role.ALUNO });
      expect(nextAuth).toHaveBeenCalled();

      const adminRoleGuard = roleMiddleware([Role.ADMIN]);
      const nextRole = jest.fn();
      adminRoleGuard(mwReq, mwRes, nextRole);

      expect(mwRes.status).toHaveBeenCalledWith(403);
      expect(nextRole).not.toHaveBeenCalled();
    });

    it('deve rejeitar em authMiddleware quando o usuário do JWT foi removido do banco (401 UNAUTHORIZED)', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ id: 'deleted-user', role: Role.ADMIN });
      (UserRepository.prototype.findById as jest.Mock).mockResolvedValue(null);

      const req: any = { headers: { authorization: 'Bearer token_usuario_removido' } };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'UNAUTHORIZED' })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('deve bloquear acesso sem permissão a operações administrativas em roleMiddleware (403 FORBIDDEN)', () => {
      const middleware = roleMiddleware([Role.ADMIN]);
      const req: any = { user: { id: 'user-aluno', role: Role.ALUNO } };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'FORBIDDEN' })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('deve rejeitar JWT inválido ou expirado com 401 INVALID_TOKEN', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const req: any = { headers: { authorization: 'Bearer token_expirado_ou_invalido' } };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'INVALID_TOKEN' })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. ISOLAMENTO DE DADOS DO ALUNO (getAll E getById EM TODOS OS MÓDULOS)
  // =========================================================================
  describe('2. Isolamento de Dados do ALUNO (Students, Grades, Attendance, Enrollments, Activities e Classes)', () => {
    const alunoRequester = { id: 'user-aluno-1', role: Role.ALUNO };

    it('Students: getAll deve filtrar pelo userId do ALUNO e getById deve permitir o próprio e bloquear outro aluno (403)', async () => {
      const studentSvc = new StudentService();

      (StudentRepository.prototype.count as jest.Mock).mockResolvedValue(1);
      (StudentRepository.prototype.findAll as jest.Mock).mockResolvedValue([{ id: 'student-1', userId: 'user-aluno-1' }]);

      await studentSvc.getAll(1, 10, alunoRequester);
      expect(StudentRepository.prototype.count).toHaveBeenCalledWith({ userId: 'user-aluno-1' });
      expect(StudentRepository.prototype.findAll).toHaveBeenCalledWith(0, 10, { userId: 'user-aluno-1' });

      // Próprio aluno: permitido
      (StudentRepository.prototype.findById as jest.Mock).mockResolvedValue({ id: 'student-1', userId: 'user-aluno-1' });
      const own = await studentSvc.getById('student-1', alunoRequester);
      expect(own.id).toBe('student-1');

      // Outro aluno: bloqueado (403 FORBIDDEN)
      (StudentRepository.prototype.findById as jest.Mock).mockResolvedValue({ id: 'student-2', userId: 'user-aluno-2' });
      await expect(studentSvc.getById('student-2', alunoRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('Grades: getAll deve filtrar pelas notas do ALUNO e getById deve permitir própria nota e bloquear a de outro aluno (403)', async () => {
      const gradeSvc = new GradeService();

      (GradeRepository.prototype.count as jest.Mock).mockResolvedValue(1);
      (GradeRepository.prototype.findAll as jest.Mock).mockResolvedValue([{ id: 'grade-1' }]);

      await gradeSvc.getAll(1, 10, alunoRequester);
      expect(GradeRepository.prototype.count).toHaveBeenCalledWith({ student: { userId: 'user-aluno-1' } });
      expect(GradeRepository.prototype.findAll).toHaveBeenCalledWith(0, 10, { student: { userId: 'user-aluno-1' } });

      // Própria nota: permitido
      (GradeRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'grade-1',
        student: { id: 'student-1', userId: 'user-aluno-1' }
      });
      const ownGrade = await gradeSvc.getById('grade-1', alunoRequester);
      expect(ownGrade.id).toBe('grade-1');

      // Nota de outro aluno: bloqueado (403 FORBIDDEN)
      (GradeRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'grade-2',
        student: { id: 'student-2', userId: 'user-aluno-2' }
      });
      await expect(gradeSvc.getById('grade-2', alunoRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('Attendance: getAll deve filtrar pelas frequências do ALUNO e getById deve permitir própria e bloquear a de outro aluno (403)', async () => {
      const attendanceSvc = new AttendanceService();

      (AttendanceRepository.prototype.count as jest.Mock).mockResolvedValue(1);
      (AttendanceRepository.prototype.findAll as jest.Mock).mockResolvedValue([{ id: 'att-1' }]);

      await attendanceSvc.getAll(1, 10, alunoRequester);
      expect(AttendanceRepository.prototype.count).toHaveBeenCalledWith({ student: { userId: 'user-aluno-1' } });
      expect(AttendanceRepository.prototype.findAll).toHaveBeenCalledWith(0, 10, { student: { userId: 'user-aluno-1' } });

      // Própria frequência: permitido
      (AttendanceRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'att-1',
        student: { id: 'student-1', userId: 'user-aluno-1' }
      });
      const ownAtt = await attendanceSvc.getById('att-1', alunoRequester);
      expect(ownAtt.id).toBe('att-1');

      // Frequência de outro aluno: bloqueado (403 FORBIDDEN)
      (AttendanceRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'att-2',
        student: { id: 'student-2', userId: 'user-aluno-2' }
      });
      await expect(attendanceSvc.getById('att-2', alunoRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('Enrollments: getAll deve filtrar pelas matrículas do ALUNO e getById deve permitir própria e bloquear a de outro aluno (403)', async () => {
      const enrollmentSvc = new EnrollmentService();

      (EnrollmentRepository.prototype.count as jest.Mock).mockResolvedValue(1);
      (EnrollmentRepository.prototype.findAll as jest.Mock).mockResolvedValue([{ id: 'enr-1' }]);

      await enrollmentSvc.getAll(1, 10, alunoRequester);
      expect(EnrollmentRepository.prototype.count).toHaveBeenCalledWith({ student: { userId: 'user-aluno-1' } });
      expect(EnrollmentRepository.prototype.findAll).toHaveBeenCalledWith(0, 10, { student: { userId: 'user-aluno-1' } });

      // Própria matrícula: permitido
      (EnrollmentRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'enr-1',
        student: { id: 'student-1', userId: 'user-aluno-1' }
      });
      const ownEnr = await enrollmentSvc.getById('enr-1', alunoRequester);
      expect(ownEnr.id).toBe('enr-1');

      // Matrícula de outro aluno: bloqueado (403 FORBIDDEN)
      (EnrollmentRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'enr-2',
        student: { id: 'student-2', userId: 'user-aluno-2' }
      });
      await expect(enrollmentSvc.getById('enr-2', alunoRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('Activities: getAll deve filtrar por turmas com matrícula ACTIVE e getById deve bloquear turma sem matrícula ativa (403)', async () => {
      const activitySvc = new ActivityService();
      const expectedWhere = {
        class: {
          enrollments: {
            some: {
              student: { userId: 'user-aluno-1' },
              status: 'ACTIVE'
            }
          }
        }
      };

      (ActivityRepository.prototype.count as jest.Mock).mockResolvedValue(1);
      (ActivityRepository.prototype.findAll as jest.Mock).mockResolvedValue([{ id: 'act-1' }]);

      await activitySvc.getAll(1, 10, alunoRequester);
      expect(ActivityRepository.prototype.count).toHaveBeenCalledWith(expectedWhere);
      expect(ActivityRepository.prototype.findAll).toHaveBeenCalledWith(0, 10, expectedWhere);

      // Atividade de turma com matrícula ACTIVE do aluno: permitido
      (ActivityRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'act-1',
        class: {
          enrollments: [{ status: 'ACTIVE', student: { userId: 'user-aluno-1' } }]
        }
      });
      const allowedAct = await activitySvc.getById('act-1', alunoRequester);
      expect(allowedAct.id).toBe('act-1');

      // Atividade de turma onde matrícula está CANCELLED / inexistente: bloqueado (403 FORBIDDEN)
      (ActivityRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'act-2',
        class: {
          enrollments: [{ status: 'CANCELLED', student: { userId: 'user-aluno-1' } }]
        }
      });
      await expect(activitySvc.getById('act-2', alunoRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('Classes: getAll deve filtrar por turmas com matrícula ACTIVE e getById deve bloquear turma sem matrícula ativa do ALUNO (403)', async () => {
      const classSvc = new ClassService();
      const expectedWhere = {
        enrollments: {
          some: {
            student: { userId: 'user-aluno-1' },
            status: 'ACTIVE'
          }
        }
      };

      (ClassRepository.prototype.count as jest.Mock).mockResolvedValue(1);
      (ClassRepository.prototype.findAll as jest.Mock).mockResolvedValue([{ id: 'class-1' }]);

      await classSvc.getAll(1, 10, alunoRequester);
      expect(ClassRepository.prototype.count).toHaveBeenCalledWith(expectedWhere);
      expect(ClassRepository.prototype.findAll).toHaveBeenCalledWith(0, 10, expectedWhere);

      // Turma na qual o aluno possui matrícula ACTIVE: permitido
      (ClassRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'class-1',
        enrollments: [{ status: 'ACTIVE', student: { userId: 'user-aluno-1' } }]
      });
      const allowedClass = await classSvc.getById('class-1', alunoRequester);
      expect(allowedClass.id).toBe('class-1');

      // Turma sem matrícula ativa do aluno (apenas outro aluno matriculado): bloqueado (403 FORBIDDEN)
      (ClassRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'class-other',
        enrollments: [{ status: 'ACTIVE', student: { userId: 'user-aluno-2' } }]
      });
      await expect(classSvc.getById('class-other', alunoRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });
  });

  // =========================================================================
  // 3. ISOLAMENTO DO PROFESSOR E VALIDAÇÃO DE MATRÍCULA ATIVA
  // =========================================================================
  describe('3. Isolamento do PROFESSOR (Classes, Enrollments, Activities, Grades, Attendance e Indicators)', () => {
    const profRequester = { id: 'user-prof-1', role: Role.PROFESSOR };

    it('Classes e Enrollments: deve filtrar getAll pelas turmas do PROFESSOR e bloquear getById de turma de outro professor (403)', async () => {
      const classSvc = new ClassService();
      const enrollmentSvc = new EnrollmentService();

      // Classes getAll
      (ClassRepository.prototype.count as jest.Mock).mockResolvedValue(1);
      (ClassRepository.prototype.findAll as jest.Mock).mockResolvedValue([{ id: 'class-1' }]);
      await classSvc.getAll(1, 10, profRequester);
      expect(ClassRepository.prototype.findAll).toHaveBeenCalledWith(0, 10, { teacher: { userId: 'user-prof-1' } });

      // Classes getById: turma de outro professor -> 403 FORBIDDEN
      (ClassRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'class-2',
        teacher: { id: 't-2', userId: 'user-prof-2' }
      });
      await expect(classSvc.getById('class-2', profRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });

      // Enrollments getAll
      (EnrollmentRepository.prototype.count as jest.Mock).mockResolvedValue(1);
      (EnrollmentRepository.prototype.findAll as jest.Mock).mockResolvedValue([{ id: 'enr-1' }]);
      await enrollmentSvc.getAll(1, 10, profRequester);
      expect(EnrollmentRepository.prototype.findAll).toHaveBeenCalledWith(0, 10, {
        class: { teacher: { userId: 'user-prof-1' } }
      });

      // Enrollments getById: matrícula em turma de outro professor -> 403 FORBIDDEN
      (EnrollmentRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'enr-other',
        class: { id: 'class-2', teacher: { id: 't-2', userId: 'user-prof-2' } }
      });
      await expect(enrollmentSvc.getById('enr-other', profRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('Activities: deve isolar getAll, getById, create, update (incluindo troca de classId) e delete para turmas do próprio PROFESSOR', async () => {
      const activitySvc = new ActivityService();

      // getAll filtra pelas turmas do professor
      (ActivityRepository.prototype.count as jest.Mock).mockResolvedValue(1);
      (ActivityRepository.prototype.findAll as jest.Mock).mockResolvedValue([{ id: 'act-1' }]);
      await activitySvc.getAll(1, 10, profRequester);
      expect(ActivityRepository.prototype.findAll).toHaveBeenCalledWith(0, 10, {
        class: { teacher: { userId: 'user-prof-1' } }
      });

      // getById em atividade de outro professor -> 403
      (ActivityRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'act-other',
        classId: 'class-other',
        class: { id: 'class-other', teacher: { id: 't-2', userId: 'user-prof-2' } }
      });
      await expect(activitySvc.getById('act-other', profRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });

      // create em turma de outro professor -> 403
      (ClassRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'class-other',
        teacher: { id: 't-2', userId: 'user-prof-2' }
      });
      await expect(
        activitySvc.create(
          { classId: 'class-other', title: 'Prova', description: 'Desc', dueDate: new Date(), maxScore: 10 },
          profRequester
        )
      ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });

      // update em atividade de outro professor -> 403
      await expect(activitySvc.update('act-other', { title: 'Alterado' }, profRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });

      // update tentando mover atividade da própria turma para turma de outro professor -> 403
      (ActivityRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'act-own',
        classId: 'class-own',
        class: { id: 'class-own', teacher: { id: 't-1', userId: 'user-prof-1' } }
      });
      (ClassRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'class-other',
        teacher: { id: 't-2', userId: 'user-prof-2' }
      });
      await expect(activitySvc.update('act-own', { classId: 'class-other' }, profRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });

      // delete em atividade de outro professor -> 403
      (ActivityRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'act-other',
        classId: 'class-other',
        class: { id: 'class-other', teacher: { id: 't-2', userId: 'user-prof-2' } }
      });
      await expect(activitySvc.delete('act-other', profRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('Grades: deve isolar getAll, getById, create, update e delete para turmas do próprio PROFESSOR (403 para turma alheia)', async () => {
      const gradeSvc = new GradeService();

      // getAll
      (GradeRepository.prototype.count as jest.Mock).mockResolvedValue(1);
      (GradeRepository.prototype.findAll as jest.Mock).mockResolvedValue([{ id: 'g-1' }]);
      await gradeSvc.getAll(1, 10, profRequester);
      expect(GradeRepository.prototype.findAll).toHaveBeenCalledWith(0, 10, {
        activity: { class: { teacher: { userId: 'user-prof-1' } } }
      });

      // getById, update e delete em nota de turma de outro professor -> 403
      (GradeRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'grade-other',
        activityId: 'act-other',
        activity: { class: { teacher: { id: 't-2', userId: 'user-prof-2' } } }
      });
      await expect(gradeSvc.getById('grade-other', profRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
      await expect(gradeSvc.update('grade-other', { score: 7 }, profRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
      await expect(gradeSvc.delete('grade-other', profRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });

      // create em atividade de turma de outro professor -> 403
      (GradeRepository.prototype.findByStudentAndActivity as jest.Mock).mockResolvedValue(null);
      (ActivityRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'act-other',
        classId: 'class-other',
        maxScore: 10,
        class: { id: 'class-other', teacher: { id: 't-2', userId: 'user-prof-2' } }
      });
      await expect(gradeSvc.create({ studentId: 's1', activityId: 'act-other', score: 9 }, profRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('Attendance: deve isolar getAll, getById, create, update e delete para turmas do próprio PROFESSOR (403 para turma alheia)', async () => {
      const attendanceSvc = new AttendanceService();

      // getAll
      (AttendanceRepository.prototype.count as jest.Mock).mockResolvedValue(1);
      (AttendanceRepository.prototype.findAll as jest.Mock).mockResolvedValue([{ id: 'att-1' }]);
      await attendanceSvc.getAll(1, 10, profRequester);
      expect(AttendanceRepository.prototype.findAll).toHaveBeenCalledWith(0, 10, {
        class: { teacher: { userId: 'user-prof-1' } }
      });

      // getById, update e delete em frequência de turma de outro professor -> 403
      (AttendanceRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'att-other',
        class: { id: 'class-other', teacher: { id: 't-2', userId: 'user-prof-2' } }
      });
      await expect(attendanceSvc.getById('att-other', profRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
      await expect(attendanceSvc.update('att-other', { present: false }, profRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
      await expect(attendanceSvc.delete('att-other', profRequester))
        .rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });

      // create em turma de outro professor -> 403
      (ClassRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'class-other',
        teacher: { id: 't-2', userId: 'user-prof-2' }
      });
      await expect(
        attendanceSvc.create({ studentId: 's1', classId: 'class-other', date: new Date(), present: true }, profRequester)
      ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('Grade e Attendance: deve validar matrícula ativa (400 STUDENT_NOT_ENROLLED) e barrar nota acima de maxScore (400 INVALID_SCORE)', async () => {
      const gradeSvc = new GradeService();
      const attendanceSvc = new AttendanceService();

      (GradeRepository.prototype.findByStudentAndActivity as jest.Mock).mockResolvedValue(null);
      (ActivityRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'a1',
        classId: 'class-1',
        maxScore: 10,
        class: { id: 'class-1', teacher: { userId: 'user-prof-1' } }
      });

      // 1. Aluno sem matrícula ativa ao lançar nota -> 400 STUDENT_NOT_ENROLLED
      (EnrollmentRepository.prototype.findByStudentAndClass as jest.Mock).mockResolvedValue(null);
      await expect(gradeSvc.create({ studentId: 's-nao-matriculado', activityId: 'a1', score: 8 }, profRequester))
        .rejects.toMatchObject({ status: 400, code: 'STUDENT_NOT_ENROLLED' });

      // 2. Aluno com matrícula ACTIVE ao lançar nota -> sucesso (8) e bloqueio se > maxScore (11)
      (EnrollmentRepository.prototype.findByStudentAndClass as jest.Mock).mockResolvedValue({
        id: 'enr-1',
        status: 'ACTIVE'
      });
      (GradeRepository.prototype.create as jest.Mock).mockResolvedValue({ id: 'g1', score: 8 });

      const ok = await gradeSvc.create({ studentId: 's1', activityId: 'a1', score: 8 }, profRequester);
      expect(ok.score).toBe(8);

      await expect(gradeSvc.create({ studentId: 's1', activityId: 'a1', score: 11 }, profRequester))
        .rejects.toHaveProperty('code', 'INVALID_SCORE');

      // 3. Aluno sem matrícula ativa ao registrar frequência -> 400 STUDENT_NOT_ENROLLED
      (ClassRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'class-1',
        teacher: { userId: 'user-prof-1' }
      });
      (EnrollmentRepository.prototype.findByStudentAndClass as jest.Mock).mockResolvedValue({
        id: 'enr-inativa',
        status: 'CANCELLED'
      });
      await expect(
        attendanceSvc.create({ studentId: 's1', classId: 'class-1', date: new Date(), present: true }, profRequester)
      ).rejects.toMatchObject({ status: 400, code: 'STUDENT_NOT_ENROLLED' });
    });

    it('Indicators Individuais (IndicatorController): deve isolar acesso de ALUNO e PROFESSOR com 403 FORBIDDEN', async () => {
      const controller = new IndicatorController();

      // 1. ALUNO tentando consultar média de outro aluno -> 403 FORBIDDEN
      mockPrisma.student.findUnique.mockResolvedValue({ id: 'stu-2', userId: 'user-aluno-2' });
      const reqAluno: any = { params: { id: 'stu-2' }, user: { id: 'user-aluno-1', role: Role.ALUNO } };
      const resAluno: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await controller.getAverage(reqAluno, resAluno);
      expect(resAluno.status).toHaveBeenCalledWith(403);

      // 2. PROFESSOR tentando consultar frequência de aluno fora de suas turmas -> 403 FORBIDDEN
      mockPrisma.student.findUnique.mockResolvedValue({
        id: 'stu-2',
        userId: 'user-aluno-2',
        enrollments: [{ class: { teacher: { userId: 'user-prof-2' } } }]
      });
      const reqProfBlocked: any = { params: { id: 'stu-2' }, user: profRequester };
      const resProfBlocked: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await controller.getAttendance(reqProfBlocked, resProfBlocked);
      expect(resProfBlocked.status).toHaveBeenCalledWith(403);

      // 3. PROFESSOR consultando média de aluno matriculado em sua turma -> 200 OK
      mockPrisma.student.findUnique.mockResolvedValue({
        id: 'stu-1',
        name: 'Aluno 1',
        userId: 'user-aluno-1',
        enrollments: [{ class: { teacher: { userId: 'user-prof-1' } } }]
      });
      mockPrisma.grade.findMany.mockResolvedValue([{ score: 9 }]);
      const reqProfAllowed: any = { params: { id: 'stu-1' }, user: profRequester };
      const resProfAllowed: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await controller.getAverage(reqProfAllowed, resProfAllowed);
      expect(resProfAllowed.status).toHaveBeenCalledWith(200);
    });
  });

  // =========================================================================
  // 4. INTEGRIDADE DOS VÍNCULOS E ATOMICIDADE DE TRANSAÇÃO (prisma.$transaction)
  // =========================================================================
  describe('4. Student/Teacher CRUD, Integridade de Vínculos e Transações Atômicas', () => {
    it('deve criar, consultar, atualizar e excluir aluno', async () => {
      (StudentRepository.prototype.findByRegistrationOrEmail as jest.Mock).mockResolvedValue(null);
      (UserRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'u1',
        role: Role.ALUNO,
        student: null,
        teacher: null
      });
      (StudentRepository.prototype.create as jest.Mock).mockResolvedValue({ id: '1', name: 'João' });
      const svc = new StudentService();
      const created = await svc.create({
        userId: 'u1',
        name: 'João',
        email: 'j@j.com',
        birthDate: new Date(),
        registration: '123'
      });
      expect(created.id).toBe('1');

      (StudentRepository.prototype.count as jest.Mock).mockResolvedValue(1);
      (StudentRepository.prototype.findAll as jest.Mock).mockResolvedValue([{ id: '1' }]);
      const list = await svc.getAll(1, 10);
      expect(list.data.length).toBe(1);

      (StudentRepository.prototype.findById as jest.Mock).mockResolvedValue({ id: '1' });
      (StudentRepository.prototype.update as jest.Mock).mockResolvedValue({ id: '1', name: 'Updated' });
      const updated = await svc.update('1', { name: 'Updated' });
      expect(updated.name).toBe('Updated');

      (StudentRepository.prototype.delete as jest.Mock).mockResolvedValue({ id: '1' });
      await svc.delete('1');
      expect(StudentRepository.prototype.delete).toHaveBeenCalledWith('1');
    });

    it('deve rejeitar userId inexistente (404), role incompatível (400) e vínculo duplicado (409) tanto em Student quanto em Teacher', async () => {
      const studentSvc = new StudentService();
      const teacherSvc = new TeacherService();

      (StudentRepository.prototype.findByRegistrationOrEmail as jest.Mock).mockResolvedValue(null);
      (TeacherRepository.prototype.findByRegistrationOrEmail as jest.Mock).mockResolvedValue(null);

      // 1. userId inexistente em Student e Teacher (404 USER_NOT_FOUND)
      (UserRepository.prototype.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        studentSvc.create({ userId: 'u-404', name: 'João', email: 'j@j.com', birthDate: new Date(), registration: 'M01' })
      ).rejects.toMatchObject({ status: 404, code: 'USER_NOT_FOUND' });

      await expect(
        teacherSvc.create({ userId: 'u-404', name: 'Prof Maria', email: 'm@m.com', registration: 'P01' })
      ).rejects.toMatchObject({ status: 404, code: 'USER_NOT_FOUND' });

      // 2. Role incompatível em Student (usuário PROFESSOR) e Teacher (usuário ALUNO) (400 INCOMPATIBLE_USER_ROLE)
      (UserRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'u-prof',
        role: Role.PROFESSOR,
        student: null,
        teacher: null
      });
      await expect(
        studentSvc.create({ userId: 'u-prof', name: 'João', email: 'j@j.com', birthDate: new Date(), registration: 'M01' })
      ).rejects.toMatchObject({ status: 400, code: 'INCOMPATIBLE_USER_ROLE' });

      (UserRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'u-aluno',
        role: Role.ALUNO,
        student: null,
        teacher: null
      });
      await expect(
        teacherSvc.create({ userId: 'u-aluno', name: 'Prof Maria', email: 'm@m.com', registration: 'P01' })
      ).rejects.toMatchObject({ status: 400, code: 'INCOMPATIBLE_USER_LINK' in {} ? 'INCOMPATIBLE_USER_ROLE' : 'INCOMPATIBLE_USER_ROLE' });

      // 3. Vínculo duplicado em Student e Teacher (409 DUPLICATE_USER_LINK)
      (UserRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'u-aluno',
        role: Role.ALUNO,
        student: { id: 's-existente' },
        teacher: null
      });
      await expect(
        studentSvc.create({ userId: 'u-aluno', name: 'João 2', email: 'j2@j.com', birthDate: new Date(), registration: 'M02' })
      ).rejects.toMatchObject({ status: 409, code: 'DUPLICATE_USER_LINK' });

      (UserRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'u-prof',
        role: Role.PROFESSOR,
        student: null,
        teacher: { id: 't-existente' }
      });
      await expect(
        teacherSvc.create({ userId: 'u-prof', name: 'Prof 2', email: 'p2@p.com', registration: 'P02' })
      ).rejects.toMatchObject({ status: 409, code: 'DUPLICATE_USER_LINK' });
    });

    it('deve realizar criação integrada com password e comprovar rollback atômico em prisma.$transaction sem deixar User órfão em caso de falha', async () => {
      const studentSvc = new StudentService();
      const teacherSvc = new TeacherService();

      (StudentRepository.prototype.findByRegistrationOrEmail as jest.Mock).mockResolvedValue(null);
      (TeacherRepository.prototype.findByRegistrationOrEmail as jest.Mock).mockResolvedValue(null);
      (UserRepository.prototype.findByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_pwd');

      // Delega createWithUser do mock para a implementação real dos repositórios que usa prisma.$transaction
      const { StudentRepository: ActualStudentRepo } = jest.requireActual('../src/repositories/studentRepository');
      const { TeacherRepository: ActualTeacherRepo } = jest.requireActual('../src/repositories/teacherRepository');
      const realStudentRepo = new ActualStudentRepo();
      const realTeacherRepo = new ActualTeacherRepo();

      (StudentRepository.prototype.createWithUser as jest.Mock).mockImplementation((u, s) =>
        realStudentRepo.createWithUser(u, s)
      );
      (TeacherRepository.prototype.createWithUser as jest.Mock).mockImplementation((u, t) =>
        realTeacherRepo.createWithUser(u, t)
      );

      // Estado simulado do banco para comprovar commit e rollback transacional
      const committedUsers: any[] = [];
      const committedStudents: any[] = [];
      const committedTeachers: any[] = [];

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        const stagedUsers = [...committedUsers];
        const stagedStudents = [...committedStudents];
        const stagedTeachers = [...committedTeachers];

        const tx = {
          user: {
            create: jest.fn().mockImplementation(async ({ data }) => {
              const newUser = { id: `user-${stagedUsers.length + 1}`, ...data };
              stagedUsers.push(newUser);
              return newUser;
            })
          },
          student: {
            create: jest.fn().mockImplementation(async ({ data }) => {
              if (data.registration === 'FAIL-TX') {
                throw new Error('Unique constraint failed on registration');
              }
              const newStu = { id: `stu-${stagedStudents.length + 1}`, ...data };
              stagedStudents.push(newStu);
              return newStu;
            })
          },
          teacher: {
            create: jest.fn().mockImplementation(async ({ data }) => {
              if (data.registration === 'FAIL-TX-PROF') {
                throw new Error('Database error on teacher creation');
              }
              const newTea = { id: `tea-${stagedTeachers.length + 1}`, ...data };
              stagedTeachers.push(newTea);
              return newTea;
            })
          }
        };

        // Se qualquer operação dentro de callback(tx) lançar erro, os arrays committed* NÃO são atualizados (rollback!)
        const result = await callback(tx);
        committedUsers.splice(0, committedUsers.length, ...stagedUsers);
        committedStudents.splice(0, committedStudents.length, ...stagedStudents);
        committedTeachers.splice(0, committedTeachers.length, ...stagedTeachers);
        return result;
      });

      // Caso 1: Sucesso na criação integrada de Student com password
      const createdStudent = await studentSvc.create({
        password: 'password123',
        name: 'Aluno Transacional',
        email: 'tx.aluno@educa.com',
        birthDate: new Date(),
        registration: 'S-TX-01'
      });
      expect(createdStudent.userId).toBe('user-1');
      expect(committedUsers).toHaveLength(1);
      expect(committedStudents).toHaveLength(1);

      // Caso 2: Falha ao criar Student dentro da transação -> rollback completo (nenhum User órfão adicionado!)
      await expect(
        studentSvc.create({
          password: 'password123',
          name: 'Aluno Falha TX',
          email: 'tx.fail@educa.com',
          birthDate: new Date(),
          registration: 'FAIL-TX'
        })
      ).rejects.toThrow('Unique constraint failed on registration');
      expect(committedUsers).toHaveLength(1); // Continua 1, sem usuário órfão!
      expect(committedStudents).toHaveLength(1);

      // Caso 3: Falha ao criar Teacher dentro da transação -> rollback completo (nenhum User órfão adicionado!)
      await expect(
        teacherSvc.create({
          password: 'password123',
          name: 'Prof Falha TX',
          email: 'tx.prof.fail@educa.com',
          registration: 'FAIL-TX-PROF'
        })
      ).rejects.toThrow('Database error on teacher creation');
      expect(committedUsers).toHaveLength(1); // Continua 1, sem usuário órfão!
      expect(committedTeachers).toHaveLength(0);
    });
  });

  // =========================================================================
  // 5. PAGINAÇÃO EM GRANDE VOLUME (> 100 REGISTROS)
  // =========================================================================
  describe('5. Paginação em Grande Volume (> 100 registros)', () => {
    it('deve paginar corretamente 250 registros distribuídos em 3 páginas (100, 100 e 50)', async () => {
      const totalRecords = 250;
      const limit = 100;
      (StudentRepository.prototype.count as jest.Mock).mockResolvedValue(totalRecords);
      (StudentRepository.prototype.findAll as jest.Mock).mockImplementation((skip: number, take: number) => {
        const remaining = Math.max(0, totalRecords - skip);
        const count = Math.min(take, remaining);
        return Promise.resolve(Array.from({ length: count }, (_, i) => ({ id: `stu-${skip + i + 1}` })));
      });

      const svc = new StudentService();

      const page1 = await svc.getAll(1, limit);
      expect(StudentRepository.prototype.findAll).toHaveBeenNthCalledWith(1, 0, 100, undefined);
      expect(page1.data).toHaveLength(100);
      expect(page1.data[0].id).toBe('stu-1');
      expect(page1.data[99].id).toBe('stu-100');
      expect(page1.pagination).toEqual({ page: 1, limit: 100, total: 250, totalPages: 3 });

      const page2 = await svc.getAll(2, limit);
      expect(StudentRepository.prototype.findAll).toHaveBeenNthCalledWith(2, 100, 100, undefined);
      expect(page2.data).toHaveLength(100);
      expect(page2.data[0].id).toBe('stu-101');
      expect(page2.data[99].id).toBe('stu-200');
      expect(page2.pagination).toEqual({ page: 2, limit: 100, total: 250, totalPages: 3 });

      const page3 = await svc.getAll(3, limit);
      expect(StudentRepository.prototype.findAll).toHaveBeenNthCalledWith(3, 200, 100, undefined);
      expect(page3.data).toHaveLength(50);
      expect(page3.data[0].id).toBe('stu-201');
      expect(page3.data[49].id).toBe('stu-250');
      expect(page3.pagination).toEqual({ page: 3, limit: 100, total: 250, totalPages: 3 });
    });
  });

  // =========================================================================
  // 6. INDICATORS (INTELIGÊNCIA E ODS 4)
  // =========================================================================
  describe('6. Indicators (Inteligência e ODS 4)', () => {
    it('deve calcular média aritmética do aluno', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.grade.findMany.mockResolvedValue([{ score: 8 }, { score: 10 }]);
      const svc = new IndicatorService();
      const res = await svc.getStudentAverage('1');
      expect(res.average).toBe(9);
    });

    it('deve calcular frequência e formatar percentual', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.attendance.findMany.mockResolvedValue([{ present: true }, { present: false }, { present: true }]);
      const svc = new IndicatorService();
      const res = await svc.getStudentAttendance('1');
      expect(res.totalClasses).toBe(3);
      expect(res.present).toBe(2);
      expect(res.absent).toBe(1);
      expect(res.attendancePercentage).toBeCloseTo(66.67);
    });

    it('deve retornar array apenas com alunos de baixo desempenho (< 6.0)', async () => {
      mockPrisma.student.findMany.mockResolvedValue([
        { id: '1', name: 'Bom Aluno', grades: [{ score: 8 }] },
        { id: '2', name: 'Aluno em Risco', grades: [{ score: 5 }, { score: 4 }] }
      ]);
      const svc = new IndicatorService();
      const res = await svc.getLowPerformanceStudents();
      expect(res).toHaveLength(1);
      expect(res[0].name).toBe('Aluno em Risco');
      expect(res[0].average).toBe(4.5);
    });

    it('deve retornar dados agregados no dashboard', async () => {
      mockPrisma.student.count.mockResolvedValue(10);
      mockPrisma.teacher.count.mockResolvedValue(2);
      mockPrisma.class.count.mockResolvedValue(3);
      mockPrisma.subject.count.mockResolvedValue(4);
      mockPrisma.grade.findMany.mockResolvedValue([{ score: 7 }, { score: 8 }]);
      mockPrisma.attendance.findMany.mockResolvedValue([{ present: true }, { present: true }]);
      mockPrisma.student.findMany.mockResolvedValue([]);

      const svc = new IndicatorService();
      const dash = await svc.getDashboard();
      expect(dash.totalStudents).toBe(10);
      expect(dash.generalAverage).toBe(7.5);
      expect(dash.generalAttendancePercentage).toBe(100);
      expect(dash.lowPerformanceCount).toBe(0);
    });
  });

  // =========================================================================
  // 7. FASE 3.3.4.1 — CONTEÚDOS, ATIVIDADES E PROTEÇÃO CONTRA CASCATA
  // =========================================================================
  describe('7. Fase 3.3.4.1 — Segurança de Conteúdos, Integridade de Atividades e Bloqueio de Cascatas Destrutivas', () => {
    const adminReq = { id: 'u-admin', role: Role.ADMIN };
    const profReq = { id: 'u-prof-1', role: Role.PROFESSOR };
    const alunoReq = { id: 'u-aluno-1', role: Role.ALUNO };

    it('Conteúdos (Itens 1 a 15): ADMIN gerencia tudo; PROFESSOR e ALUNO têm leitura isolada por escopo e bloqueio 403 na escrita; dependências bloqueiam delete/update de subjectId com 409', async () => {
      const contentSvc = new ContentService();

      // 1 & 2. ADMIN lista todos e consulta por ID
      (ContentRepository.prototype.count as jest.Mock).mockResolvedValue(2);
      (ContentRepository.prototype.findAll as jest.Mock).mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
      const adminList = await contentSvc.getAll(1, 10, adminReq);
      expect(ContentRepository.prototype.findAll).toHaveBeenCalledWith(0, 10, undefined);
      expect(adminList.data).toHaveLength(2);

      (ContentRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'c1',
        subjectId: 'sub-1',
        activities: []
      });
      const adminDetail = await contentSvc.getById('c1', adminReq);
      expect(adminDetail.id).toBe('c1');

      // 3, 4 & 5. ADMIN cria, edita e exclui conteúdo sem dependências
      (SubjectRepository.prototype.findById as jest.Mock).mockResolvedValue({ id: 'sub-1', name: 'Matemática' });
      (ContentRepository.prototype.create as jest.Mock).mockResolvedValue({ id: 'c-new', title: 'Limites', subjectId: 'sub-1' });
      const created = await contentSvc.create({ title: 'Limites', subjectId: 'sub-1' }, adminReq);
      expect(created.id).toBe('c-new');

      (ContentRepository.prototype.update as jest.Mock).mockResolvedValue({ id: 'c1', title: 'Limites Editado', subjectId: 'sub-1' });
      const updated = await contentSvc.update('c1', { title: 'Limites Editado' }, adminReq);
      expect(updated.title).toBe('Limites Editado');

      (ContentRepository.prototype.delete as jest.Mock).mockResolvedValue({ id: 'c1' });
      await contentSvc.delete('c1', adminReq);
      expect(ContentRepository.prototype.delete).toHaveBeenCalledWith('c1');

      // 6 & 10. PROFESSOR lista apenas conteúdos de disciplinas de suas turmas e recebe 403 fora do escopo
      await contentSvc.getAll(1, 10, profReq);
      expect(ContentRepository.prototype.findAll).toHaveBeenLastCalledWith(0, 10, {
        subject: { classes: { some: { teacher: { userId: 'u-prof-1' } } } }
      });

      (ContentRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'c-other',
        subject: { classes: [{ teacher: { userId: 'u-prof-2' } }] }
      });
      await expect(contentSvc.getById('c-other', profReq)).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN'
      });

      // 7, 8 & 9. PROFESSOR não pode criar, editar ou excluir conteúdo (403 FORBIDDEN)
      await expect(contentSvc.create({ title: 'Novo', subjectId: 'sub-1' }, profReq)).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN'
      });
      await expect(contentSvc.update('c1', { title: 'Edit' }, profReq)).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN'
      });
      await expect(contentSvc.delete('c1', profReq)).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN'
      });

      // 11, 12 & 13. ALUNO lista apenas conteúdos com matrícula ACTIVE, recebe 403 fora do escopo e 403 na escrita
      await contentSvc.getAll(1, 10, alunoReq);
      expect(ContentRepository.prototype.findAll).toHaveBeenLastCalledWith(0, 10, {
        subject: {
          classes: {
            some: {
              enrollments: { some: { student: { userId: 'u-aluno-1' }, status: 'ACTIVE' } }
            }
          }
        }
      });

      (ContentRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'c-other',
        subject: {
          classes: [{ enrollments: [{ status: 'CANCELLED', student: { userId: 'u-aluno-1' } }] }]
        }
      });
      await expect(contentSvc.getById('c-other', alunoReq)).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN'
      });
      await expect(contentSvc.create({ title: 'Tentativa Aluno', subjectId: 'sub-1' }, alunoReq)).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN'
      });

      // 14 & 15. Exclusão de conteúdo com atividades e troca incompatível de subjectId retornam 409 CONTENT_HAS_DEPENDENCIES
      (ContentRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'c-with-act',
        subjectId: 'sub-1',
        activities: [{ id: 'act-1', classId: 'cls-1' }]
      });
      (SubjectRepository.prototype.findById as jest.Mock).mockResolvedValue({ id: 'sub-2' });

      await expect(contentSvc.update('c-with-act', { subjectId: 'sub-2' }, adminReq)).rejects.toMatchObject({
        status: 409,
        code: 'CONTENT_HAS_DEPENDENCIES'
      });
      await expect(contentSvc.delete('c-with-act', adminReq)).rejects.toMatchObject({
        status: 409,
        code: 'CONTENT_HAS_DEPENDENCIES'
      });
    });

    it('Atividades (Itens 16 a 26): valida compatibilidade content.subjectId === class.subjectId e protege notas existentes contra redução de maxScore, troca de classId e exclusão (409)', async () => {
      const activitySvc = new ActivityService();

      // 21. Conteúdo de disciplina diferente da turma é rejeitado na criação (409 INCOMPATIBLE_CONTENT_SUBJECT)
      (ClassRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'cls-mat',
        subjectId: 'sub-mat',
        teacher: { userId: 'u-prof-1' }
      });
      (ContentRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'cnt-hist',
        subjectId: 'sub-hist'
      });

      await expect(
        activitySvc.create(
          {
            title: 'Prova Mista',
            classId: 'cls-mat',
            contentId: 'cnt-hist',
            dueDate: new Date(),
            maxScore: 10
          },
          profReq
        )
      ).rejects.toMatchObject({ status: 409, code: 'INCOMPATIBLE_CONTENT_SUBJECT' });

      // 22 & 25. Edição de contentId para disciplina incompatível é bloqueada (409 INCOMPATIBLE_CONTENT_SUBJECT)
      (ActivityRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'act-1',
        classId: 'cls-mat',
        contentId: 'cnt-mat',
        maxScore: 10,
        content: { id: 'cnt-mat', subjectId: 'sub-mat' },
        class: { id: 'cls-mat', subjectId: 'sub-mat', teacher: { userId: 'u-prof-1' } },
        grades: [{ id: 'g-1', score: 8.5 }]
      });

      await expect(
        activitySvc.update('act-1', { contentId: 'cnt-hist' }, profReq)
      ).rejects.toMatchObject({ status: 409, code: 'INCOMPATIBLE_CONTENT_SUBJECT' });

      // 23. Redução de maxScore abaixo da maior nota existente (8.5) é bloqueada (409 INVALID_MAX_SCORE)
      await expect(
        activitySvc.update('act-1', { maxScore: 7.0 }, profReq)
      ).rejects.toMatchObject({ status: 409, code: 'INVALID_MAX_SCORE' });

      // 24. Mudança de classId quando já existem notas lançadas é bloqueada (409 ACTIVITY_HAS_GRADES)
      (ClassRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'cls-mat-2',
        subjectId: 'sub-mat',
        teacher: { userId: 'u-prof-1' }
      });
      await expect(
        activitySvc.update('act-1', { classId: 'cls-mat-2' }, profReq)
      ).rejects.toMatchObject({ status: 409, code: 'ACTIVITY_HAS_GRADES' });

      // 26. Exclusão de atividade que possui notas lançadas retorna 409 ACTIVITY_HAS_GRADES
      await expect(activitySvc.delete('act-1', profReq)).rejects.toMatchObject({
        status: 409,
        code: 'ACTIVITY_HAS_GRADES'
      });
    });

    it('Regressão de Exclusão com Dependências (Itens 27, 28, 29 e 30): bloqueia exclusão física de Class, Student, Teacher e Subject com histórico/vínculos (409)', async () => {
      const classSvc = new ClassService();
      const studentSvc = new StudentService();
      const teacherSvc = new TeacherService();
      const subjectSvc = new SubjectService();

      // 27. Turma com matrículas/atividades -> 409 CLASS_HAS_DEPENDENCIES
      (ClassRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'cls-1',
        enrollments: [{ id: 'enr-1' }],
        activities: [],
        attendances: []
      });
      await expect(classSvc.delete('cls-1')).rejects.toMatchObject({
        status: 409,
        code: 'CLASS_HAS_DEPENDENCIES'
      });

      // 28. Aluno com histórico acadêmico -> 409 STUDENT_HAS_HISTORY
      (StudentRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'stu-1',
        enrollments: [{ id: 'enr-1' }],
        grades: [{ id: 'g-1', score: 9 }],
        attendances: []
      });
      await expect(studentSvc.delete('stu-1')).rejects.toMatchObject({
        status: 409,
        code: 'STUDENT_HAS_HISTORY'
      });

      // 29. Professor com turmas vinculadas -> 409 TEACHER_HAS_DEPENDENCIES
      (TeacherRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'tea-1',
        classes: [{ id: 'cls-1' }]
      });
      await expect(teacherSvc.delete('tea-1')).rejects.toMatchObject({
        status: 409,
        code: 'TEACHER_HAS_DEPENDENCIES'
      });

      // 30. Disciplina com conteúdos ou turmas vinculadas -> 409 SUBJECT_HAS_DEPENDENCIES
      (SubjectRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        classes: [],
        contents: [{ id: 'cnt-1' }]
      });
      await expect(subjectSvc.delete('sub-1')).rejects.toMatchObject({
        status: 409,
        code: 'SUBJECT_HAS_DEPENDENCIES'
      });
    });
  });

  // =========================================================================
  // 8. FASE 4.2.1 — MIDDLEWARE ZOD E VALIDAÇÃO/TRANSFORMAÇÃO DE ENTRADAS
  // =========================================================================
  describe('8. Fase 4.2.1 — Middleware Zod: Coerção de Datas, Remoção de Campos Extras (.strip), .strict() e .passthrough()', () => {
    it('1. deve validar uma data YYYY-MM-DD e entregá-la ao controller/serviço como objeto Date (birthDate, dueDate e date)', () => {
      const studentMw = validate(createStudentSchema);
      const reqStudent: any = {
        body: {
          name: 'Maria Clara',
          email: 'maria.clara@educa.com',
          birthDate: '2006-05-15',
          registration: 'S-2026-01',
          password: 'Password@123'
        }
      };
      const resStudent: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const nextStudent = jest.fn();

      studentMw(reqStudent, resStudent, nextStudent);
      expect(nextStudent).toHaveBeenCalledTimes(1);
      expect(reqStudent.body.birthDate).toBeInstanceOf(Date);
      expect((reqStudent.body.birthDate as Date).toISOString()).toBe('2006-05-15T00:00:00.000Z');

      const activityMw = validate(createActivitySchema);
      const reqActivity: any = {
        body: {
          title: 'Avaliação Bimestral',
          description: 'Capítulos 1 a 4',
          contentId: '550e8400-e29b-41d4-a716-446655440000',
          classId: '660e8400-e29b-41d4-a716-446655440001',
          dueDate: '2026-11-20',
          maxScore: 10
        }
      };
      const resActivity: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const nextActivity = jest.fn();

      activityMw(reqActivity, resActivity, nextActivity);
      expect(nextActivity).toHaveBeenCalledTimes(1);
      expect(reqActivity.body.dueDate).toBeInstanceOf(Date);
      expect((reqActivity.body.dueDate as Date).toISOString()).toBe('2026-11-20T00:00:00.000Z');

      const attendanceMw = validate(createAttendanceSchema);
      const reqAttendance: any = {
        body: {
          studentId: '550e8400-e29b-41d4-a716-446655440000',
          classId: '660e8400-e29b-41d4-a716-446655440001',
          date: '2026-10-15',
          present: true
        }
      };
      const resAttendance: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const nextAttendance = jest.fn();

      attendanceMw(reqAttendance, resAttendance, nextAttendance);
      expect(nextAttendance).toHaveBeenCalledTimes(1);
      expect(reqAttendance.body.date).toBeInstanceOf(Date);
    });

    it('2. deve retornar erro de validação HTTP 400 VALIDATION_ERROR quando uma data inválida for enviada', () => {
      const studentMw = validate(createStudentSchema);
      const reqInvalidDate: any = {
        body: {
          name: 'Aluno Data Inválida',
          email: 'invalido@educa.com',
          birthDate: 'data-invalida-nao-existe',
          registration: 'S-ERR-01'
        }
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      studentMw(reqInvalidDate, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            details: expect.any(Array)
          })
        })
      );
    });

    it('3 & 4. deve remover campos extras não declarados (comportamento padrão .strip()) e preservar todos os campos permitidos e defaults', () => {
      const subjectMw = validate(createSubjectSchema);
      const reqSubject: any = {
        body: {
          name: 'Física Quântica',
          description: 'Introdução à mecânica quântica',
          workload: 80,
          id: 'id-forjado-pelo-cliente',
          createdAt: '2020-01-01T00:00:00.000Z',
          isAdmin: true,
          hackField: 'malicious_payload'
        }
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      subjectMw(reqSubject, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(reqSubject.body).toEqual({
        name: 'Física Quântica',
        description: 'Introdução à mecânica quântica',
        workload: 80
      });
      expect(reqSubject.body).not.toHaveProperty('id');
      expect(reqSubject.body).not.toHaveProperty('createdAt');
      expect(reqSubject.body).not.toHaveProperty('isAdmin');
      expect(reqSubject.body).not.toHaveProperty('hackField');

      // Verifica aplicação de valores default definidos nos schemas (registerSchema e createEnrollmentSchema)
      const registerMw = validate(registerSchema);
      const reqReg: any = {
        body: {
          name: 'Novo Usuário',
          email: 'novo@educa.com',
          password: 'password123',
          unexpectedProp: 'removido'
        }
      };
      const nextReg = jest.fn();
      registerMw(reqReg, res, nextReg);
      expect(nextReg).toHaveBeenCalledTimes(1);
      expect(reqReg.body).toEqual({
        name: 'Novo Usuário',
        email: 'novo@educa.com',
        password: 'password123',
        role: Role.ALUNO
      });

      const enrollmentMw = validate(createEnrollmentSchema);
      const reqEnr: any = {
        body: {
          studentId: '550e8400-e29b-41d4-a716-446655440000',
          classId: '660e8400-e29b-41d4-a716-446655440001',
          extraField: 'deve_sair'
        }
      };
      const nextEnr = jest.fn();
      enrollmentMw(reqEnr, res, nextEnr);
      expect(nextEnr).toHaveBeenCalledTimes(1);
      expect(reqEnr.body).toEqual({
        studentId: '550e8400-e29b-41d4-a716-446655440000',
        classId: '660e8400-e29b-41d4-a716-446655440001',
        status: 'ACTIVE'
      });
    });

    it('5. deve rejeitar campos desconhecidos com HTTP 400 VALIDATION_ERROR quando o schema utilizar .strict()', () => {
      const strictSchema = z
        .object({
          title: z.string().min(3)
        })
        .strict();
      const strictMw = validate(strictSchema);

      const req: any = {
        body: {
          title: 'Título Válido',
          unknownField: 'nao_permitido'
        }
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      strictMw(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
        })
      );
    });

    it('6. deve preservar campos extras quando o schema utilizar explicitamente .passthrough()', () => {
      const passthroughSchema = z
        .object({
          title: z.string().min(3),
          eventDate: z.coerce.date()
        })
        .passthrough();
      const passthroughMw = validate(passthroughSchema);

      const req: any = {
        body: {
          title: 'Evento Acadêmico',
          eventDate: '2026-08-10',
          customMetadata: { source: 'portal', version: 2 }
        }
      };
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      passthroughMw(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body.eventDate).toBeInstanceOf(Date);
      expect(req.body.customMetadata).toEqual({ source: 'portal', version: 2 });
    });

    it('7. deve executar criação e atualização em StudentController e ActivityController recebendo objetos Date coagidos e sem campos extras', async () => {
      const studentController = new StudentController();
      const activityController = new ActivityController();

      // 7a. Criação e atualização de Aluno passando pelo middleware validate
      (StudentRepository.prototype.findByRegistrationOrEmail as jest.Mock).mockResolvedValue(null);
      (UserRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440099',
        role: Role.ALUNO,
        student: null,
        teacher: null
      });
      (StudentRepository.prototype.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ id: 'stu-created-1', ...data })
      );

      const reqCreateStu: any = {
        body: {
          userId: '550e8400-e29b-41d4-a716-446655440099',
          name: 'Lucas Mendes',
          email: 'lucas@educa.com',
          birthDate: '2007-03-25',
          registration: 'S-2026-99',
          injectedProperty: 'must_be_stripped'
        }
      };
      const resCreateStu: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const nextCreateStu = jest.fn();

      validate(createStudentSchema)(reqCreateStu, resCreateStu, nextCreateStu);
      expect(nextCreateStu).toHaveBeenCalledTimes(1);
      await studentController.create(reqCreateStu, resCreateStu);

      expect(resCreateStu.status).toHaveBeenCalledWith(201);
      const passedStudentData = (StudentRepository.prototype.create as jest.Mock).mock.calls[0][0];
      expect(passedStudentData.birthDate).toBeInstanceOf(Date);
      expect(passedStudentData).not.toHaveProperty('injectedProperty');

      // Update de Aluno com birthDate YYYY-MM-DD e campo extra
      (StudentRepository.prototype.findById as jest.Mock).mockResolvedValue({ id: 'stu-created-1' });
      (StudentRepository.prototype.update as jest.Mock).mockImplementation((id, data) =>
        Promise.resolve({ id, ...data })
      );

      const reqUpdateStu: any = {
        params: { id: 'stu-created-1' },
        body: {
          name: 'Lucas Mendes Atualizado',
          birthDate: '2007-03-26',
          userId: 'tentativa-trocar-userId-bloqueada-pelo-omit',
          extraField: 'removido'
        }
      };
      const resUpdateStu: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const nextUpdateStu = jest.fn();

      validate(updateStudentSchema)(reqUpdateStu, resUpdateStu, nextUpdateStu);
      expect(nextUpdateStu).toHaveBeenCalledTimes(1);
      await studentController.update(reqUpdateStu, resUpdateStu);

      expect(resUpdateStu.status).toHaveBeenCalledWith(200);
      const passedUpdateStuData = (StudentRepository.prototype.update as jest.Mock).mock.calls[0][1];
      expect(passedUpdateStuData.birthDate).toBeInstanceOf(Date);
      expect(passedUpdateStuData).not.toHaveProperty('userId');
      expect(passedUpdateStuData).not.toHaveProperty('extraField');

      // 7b. Criação e atualização de Atividade passando pelo middleware validate
      (ClassRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: '660e8400-e29b-41d4-a716-446655440001',
        subjectId: 'sub-1',
        teacher: { userId: 'u-prof-1' }
      });
      (ContentRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        subjectId: 'sub-1'
      });
      (ActivityRepository.prototype.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ id: 'act-created-1', ...data })
      );

      const reqCreateAct: any = {
        user: { id: 'u-prof-1', role: Role.PROFESSOR },
        body: {
          title: 'Trabalho Prático',
          description: 'Entrega via portal',
          contentId: '550e8400-e29b-41d4-a716-446655440000',
          classId: '660e8400-e29b-41d4-a716-446655440001',
          dueDate: '2026-12-05',
          maxScore: 10,
          unauthorizedFlag: true
        }
      };
      const resCreateAct: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const nextCreateAct = jest.fn();

      validate(createActivitySchema)(reqCreateAct, resCreateAct, nextCreateAct);
      expect(nextCreateAct).toHaveBeenCalledTimes(1);
      await activityController.create(reqCreateAct, resCreateAct);

      expect(resCreateAct.status).toHaveBeenCalledWith(201);
      const passedActivityData = (ActivityRepository.prototype.create as jest.Mock).mock.calls[0][0];
      expect(passedActivityData.dueDate).toBeInstanceOf(Date);
      expect(passedActivityData).not.toHaveProperty('unauthorizedFlag');

      // Update de Atividade com dueDate YYYY-MM-DD
      (ActivityRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'act-created-1',
        classId: '660e8400-e29b-41d4-a716-446655440001',
        contentId: '550e8400-e29b-41d4-a716-446655440000',
        maxScore: 10,
        class: { id: '660e8400-e29b-41d4-a716-446655440001', subjectId: 'sub-1', teacher: { userId: 'u-prof-1' } },
        content: { id: '550e8400-e29b-41d4-a716-446655440000', subjectId: 'sub-1' },
        grades: []
      });
      (ActivityRepository.prototype.update as jest.Mock).mockImplementation((id, data) =>
        Promise.resolve({ id, ...data })
      );

      const reqUpdateAct: any = {
        params: { id: 'act-created-1' },
        user: { id: 'u-prof-1', role: Role.PROFESSOR },
        body: {
          dueDate: '2026-12-10',
          extraActField: 'ignorado'
        }
      };
      const resUpdateAct: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const nextUpdateAct = jest.fn();

      validate(updateActivitySchema)(reqUpdateAct, resUpdateAct, nextUpdateAct);
      expect(nextUpdateAct).toHaveBeenCalledTimes(1);
      await activityController.update(reqUpdateAct, resUpdateAct);

      expect(resUpdateAct.status).toHaveBeenCalledWith(200);
      const passedUpdateActData = (ActivityRepository.prototype.update as jest.Mock).mock.calls[0][1];
      expect(passedUpdateActData.dueDate).toBeInstanceOf(Date);
      expect(passedUpdateActData).not.toHaveProperty('extraActField');
    });
  });

  // =========================================================================
  // 9. FASE 4.2.2 — INTEGRIDADE DE CONTAS E PRESERVAÇÃO DO HISTÓRICO ACADÊMICO
  // =========================================================================
  describe('9. Fase 4.2.2 — Integridade de Contas (ALTO-02) e Proteção de Matrículas (MÉDIO-01)', () => {
    it('1 & 2. deve excluir Student e Teacher sem histórico em transação e remover a conta User associada quando não houver outros vínculos', async () => {
      const studentSvc = new StudentService();
      const teacherSvc = new TeacherService();

      const { StudentRepository: ActualStudentRepo } = jest.requireActual('../src/repositories/studentRepository');
      const { TeacherRepository: ActualTeacherRepo } = jest.requireActual('../src/repositories/teacherRepository');
      const realStudentRepo = new ActualStudentRepo();
      const realTeacherRepo = new ActualTeacherRepo();

      (StudentRepository.prototype.delete as jest.Mock).mockImplementation((id) => realStudentRepo.delete(id));
      (TeacherRepository.prototype.delete as jest.Mock).mockImplementation((id) => realTeacherRepo.delete(id));

      const committedUsers: any[] = [
        { id: 'u-stu-1', email: 'stu1@educa.com', role: Role.ALUNO },
        { id: 'u-tea-1', email: 'tea1@educa.com', role: Role.PROFESSOR }
      ];
      const committedStudents: any[] = [{ id: 'stu-1', userId: 'u-stu-1', name: 'Aluno Sem Histórico' }];
      const committedTeachers: any[] = [{ id: 'tea-1', userId: 'u-tea-1', name: 'Prof Sem Turmas' }];

      mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        const stagedUsers = [...committedUsers];
        const stagedStudents = [...committedStudents];
        const stagedTeachers = [...committedTeachers];

        const tx = {
          student: {
            delete: jest.fn().mockImplementation(async ({ where: { id } }) => {
              const idx = stagedStudents.findIndex((s) => s.id === id);
              if (idx === -1) throw new Error('Student not found');
              const [removed] = stagedStudents.splice(idx, 1);
              return removed;
            })
          },
          teacher: {
            delete: jest.fn().mockImplementation(async ({ where: { id } }) => {
              const idx = stagedTeachers.findIndex((t) => t.id === id);
              if (idx === -1) throw new Error('Teacher not found');
              const [removed] = stagedTeachers.splice(idx, 1);
              return removed;
            })
          },
          user: {
            findUnique: jest.fn().mockImplementation(async ({ where: { id } }) => {
              const u = stagedUsers.find((user) => user.id === id);
              if (!u) return null;
              return {
                ...u,
                student: stagedStudents.find((s) => s.userId === id) || null,
                teacher: stagedTeachers.find((t) => t.userId === id) || null
              };
            }),
            delete: jest.fn().mockImplementation(async ({ where: { id } }) => {
              const idx = stagedUsers.findIndex((u) => u.id === id);
              if (idx === -1) throw new Error('User not found');
              const [removed] = stagedUsers.splice(idx, 1);
              return removed;
            })
          }
        };

        const result = await callback(tx);
        committedUsers.splice(0, committedUsers.length, ...stagedUsers);
        committedStudents.splice(0, committedStudents.length, ...stagedStudents);
        committedTeachers.splice(0, committedTeachers.length, ...stagedTeachers);
        return result;
      });

      // 1. Exclusão de Student sem histórico -> remove Student e User órfão
      (StudentRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'stu-1',
        userId: 'u-stu-1',
        enrollments: [],
        grades: [],
        attendances: []
      });
      await studentSvc.delete('stu-1');
      expect(committedStudents).toHaveLength(0);
      expect(committedUsers.find((u) => u.id === 'u-stu-1')).toBeUndefined();

      // 2. Exclusão de Teacher sem turmas -> remove Teacher e User órfão
      (TeacherRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'tea-1',
        userId: 'u-tea-1',
        classes: []
      });
      await teacherSvc.delete('tea-1');
      expect(committedTeachers).toHaveLength(0);
      expect(committedUsers).toHaveLength(0);
    });

    it('3. deve preservar a conta User quando ela possuir outros vínculos legítimos (outro perfil associado ou role ADMIN)', async () => {
      const studentSvc = new StudentService();
      const teacherSvc = new TeacherService();

      const { StudentRepository: ActualStudentRepo } = jest.requireActual('../src/repositories/studentRepository');
      const { TeacherRepository: ActualTeacherRepo } = jest.requireActual('../src/repositories/teacherRepository');
      const realStudentRepo = new ActualStudentRepo();
      const realTeacherRepo = new ActualTeacherRepo();

      (StudentRepository.prototype.delete as jest.Mock).mockImplementation((id) => realStudentRepo.delete(id));
      (TeacherRepository.prototype.delete as jest.Mock).mockImplementation((id) => realTeacherRepo.delete(id));

      const userDeleteSpy = jest.fn();

      // Caso A: User possui também perfil Teacher ao excluir Student
      mockPrisma.$transaction.mockImplementationOnce(async (callback: (tx: any) => Promise<any>) => {
        const tx = {
          student: {
            delete: jest.fn().mockResolvedValue({ id: 'stu-shared', userId: 'u-shared' })
          },
          user: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'u-shared',
              role: Role.ALUNO,
              student: null,
              teacher: { id: 'tea-linked', userId: 'u-shared' }
            }),
            delete: userDeleteSpy
          }
        };
        return callback(tx);
      });

      (StudentRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'stu-shared',
        userId: 'u-shared',
        enrollments: [],
        grades: [],
        attendances: []
      });
      await studentSvc.delete('stu-shared');
      expect(userDeleteSpy).not.toHaveBeenCalled();

      // Caso B: User possui também perfil Student (ou role ADMIN) ao excluir Teacher
      mockPrisma.$transaction.mockImplementationOnce(async (callback: (tx: any) => Promise<any>) => {
        const tx = {
          teacher: {
            delete: jest.fn().mockResolvedValue({ id: 'tea-shared', userId: 'u-admin-shared' })
          },
          user: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'u-admin-shared',
              role: Role.ADMIN,
              student: null,
              teacher: null
            }),
            delete: userDeleteSpy
          }
        };
        return callback(tx);
      });

      (TeacherRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'tea-shared',
        userId: 'u-admin-shared',
        classes: []
      });
      await teacherSvc.delete('tea-shared');
      expect(userDeleteSpy).not.toHaveBeenCalled();
    });

    it('4 & 9. deve bloquear exclusão de perfis com dependências (409) e garantir rollback se a transação de exclusão falhar', async () => {
      const studentSvc = new StudentService();
      const teacherSvc = new TeacherService();

      const { StudentRepository: ActualStudentRepo } = jest.requireActual('../src/repositories/studentRepository');
      const realStudentRepo = new ActualStudentRepo();
      (StudentRepository.prototype.delete as jest.Mock).mockImplementation((id) => realStudentRepo.delete(id));

      // 4. Bloqueio de Student com frequência e Teacher com turma (sem chamar delete transacional)
      (StudentRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'stu-dep',
        userId: 'u-dep',
        enrollments: [],
        grades: [],
        attendances: [{ id: 'att-1' }]
      });
      await expect(studentSvc.delete('stu-dep')).rejects.toMatchObject({
        status: 409,
        code: 'STUDENT_HAS_HISTORY'
      });

      (TeacherRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'tea-dep',
        userId: 'u-tea-dep',
        classes: [{ id: 'cls-1' }]
      });
      await expect(teacherSvc.delete('tea-dep')).rejects.toMatchObject({
        status: 409,
        code: 'TEACHER_HAS_DEPENDENCIES'
      });

      // 9. Falha na exclusão de User dentro da transação não deixa Student parcialmente excluído (rollback atômico)
      const committedUsers = [{ id: 'u-tx-fail', role: Role.ALUNO }];
      const committedStudents = [{ id: 'stu-tx-fail', userId: 'u-tx-fail' }];

      mockPrisma.$transaction.mockImplementationOnce(async (callback: (tx: any) => Promise<any>) => {
        const stagedUsers = [...committedUsers];
        const stagedStudents = [...committedStudents];

        const tx = {
          student: {
            delete: jest.fn().mockImplementation(async ({ where: { id } }) => {
              const idx = stagedStudents.findIndex((s) => s.id === id);
              const [removed] = stagedStudents.splice(idx, 1);
              return removed;
            })
          },
          user: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'u-tx-fail',
              role: Role.ALUNO,
              student: null,
              teacher: null
            }),
            delete: jest.fn().mockRejectedValue(new Error('Simulated DB failure on user delete'))
          }
        };

        const result = await callback(tx);
        committedUsers.splice(0, committedUsers.length, ...stagedUsers);
        committedStudents.splice(0, committedStudents.length, ...stagedStudents);
        return result;
      });

      (StudentRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'stu-tx-fail',
        userId: 'u-tx-fail',
        enrollments: [],
        grades: [],
        attendances: []
      });

      await expect(studentSvc.delete('stu-tx-fail')).rejects.toThrow('Simulated DB failure on user delete');
      expect(committedStudents).toHaveLength(1);
      expect(committedUsers).toHaveLength(1);
    });

    it('5, 6, 7 & 8. deve proteger Enrollment contra exclusão quando houver notas ou frequências na turma (409 ENROLLMENT_HAS_HISTORY) e permitir exclusão quando não houver histórico naquela turma (mesmo que exista em outras turmas)', async () => {
      const enrollmentSvc = new EnrollmentService();

      (EnrollmentRepository.prototype.findById as jest.Mock).mockResolvedValue({
        id: 'enr-target',
        studentId: 'stu-1',
        classId: 'cls-target',
        status: 'ACTIVE'
      });

      // 5. Bloqueio de exclusão de Enrollment com notas na turma da matrícula (409 ENROLLMENT_HAS_HISTORY)
      (GradeRepository.prototype.count as jest.Mock).mockResolvedValueOnce(2);
      (AttendanceRepository.prototype.count as jest.Mock).mockResolvedValueOnce(0);

      await expect(enrollmentSvc.delete('enr-target')).rejects.toMatchObject({
        status: 409,
        code: 'ENROLLMENT_HAS_HISTORY',
        message: expect.stringMatching(/INACTIVE|CANCELLED/)
      });
      expect(GradeRepository.prototype.count).toHaveBeenCalledWith({
        studentId: 'stu-1',
        activity: { classId: 'cls-target' }
      });
      expect(EnrollmentRepository.prototype.delete).not.toHaveBeenCalled();

      // 6. Bloqueio de exclusão de Enrollment com frequência na turma da matrícula (409 ENROLLMENT_HAS_HISTORY)
      (GradeRepository.prototype.count as jest.Mock).mockResolvedValueOnce(0);
      (AttendanceRepository.prototype.count as jest.Mock).mockResolvedValueOnce(3);

      await expect(enrollmentSvc.delete('enr-target')).rejects.toMatchObject({
        status: 409,
        code: 'ENROLLMENT_HAS_HISTORY',
        message: expect.stringMatching(/INACTIVE|CANCELLED/)
      });
      expect(AttendanceRepository.prototype.count).toHaveBeenCalledWith({
        studentId: 'stu-1',
        classId: 'cls-target'
      });
      expect(EnrollmentRepository.prototype.delete).not.toHaveBeenCalled();

      // 7 & 8. Exclusão permitida quando o aluno NÃO possui notas nem frequência na turma da matrícula
      // (mesmo que possua notas/frequências em outra turma cls-other, pois o filtro usa classId: 'cls-target')
      const allGradesInDb = [{ id: 'g-other', studentId: 'stu-1', activity: { classId: 'cls-other' } }];
      const allAttendancesInDb = [{ id: 'att-other', studentId: 'stu-1', classId: 'cls-other' }];

      (GradeRepository.prototype.count as jest.Mock).mockImplementationOnce(async (where: any) => {
        return allGradesInDb.filter(
          (g) => g.studentId === where.studentId && g.activity.classId === where.activity.classId
        ).length;
      });
      (AttendanceRepository.prototype.count as jest.Mock).mockImplementationOnce(async (where: any) => {
        return allAttendancesInDb.filter(
          (a) => a.studentId === where.studentId && a.classId === where.classId
        ).length;
      });
      (EnrollmentRepository.prototype.delete as jest.Mock).mockResolvedValueOnce({
        id: 'enr-target',
        studentId: 'stu-1',
        classId: 'cls-target'
      });

      const deleted = await enrollmentSvc.delete('enr-target');
      expect(deleted.id).toBe('enr-target');
      expect(EnrollmentRepository.prototype.delete).toHaveBeenCalledWith('enr-target');
    });
  });
});
