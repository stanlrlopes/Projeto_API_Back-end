import { Request, Response } from 'express';
import { IndicatorService } from '../services/indicatorService';
import { PrismaClient, Role } from '@prisma/client';

const service = new IndicatorService();
const prisma = new PrismaClient();

export class IndicatorController {
  
  // Função auxiliar para validar o acesso de ALUNO (próprios dados) e PROFESSOR (alunos de suas turmas)
  private async checkStudentAccess(req: Request, studentId: string): Promise<boolean> {
    const currentUser = req.user;
    if (!currentUser) {
      return false;
    }
    if (currentUser.role === Role.ALUNO) {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student || student.userId !== currentUser.id) {
        return false;
      }
    } else if (currentUser.role === Role.PROFESSOR) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { enrollments: { include: { class: { include: { teacher: true } } } } }
      });
      if (!student) {
        return false;
      }
      const isInTeacherClass = student.enrollments?.some(
        (e) => e.class?.teacher?.userId === currentUser.id
      );
      if (!isInTeacherClass) {
        return false;
      }
    }
    return true;
  }

  async getAverage(req: Request, res: Response): Promise<void> {
    try {
      const hasAccess = await this.checkStudentAccess(req, req.params.id);
      if (!hasAccess) {
        res.status(403).json({ success: false, error: { message: 'Acesso negado', code: 'FORBIDDEN' } });
        return;
      }
      
      const result = await service.getStudentAverage(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, error: { message: error.message || 'Erro interno', code: error.code || 'INTERNAL_ERROR' } });
    }
  }

  async getAttendance(req: Request, res: Response): Promise<void> {
    try {
      const hasAccess = await this.checkStudentAccess(req, req.params.id);
      if (!hasAccess) {
        res.status(403).json({ success: false, error: { message: 'Acesso negado', code: 'FORBIDDEN' } });
        return;
      }
      
      const result = await service.getStudentAttendance(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, error: { message: error.message || 'Erro interno', code: error.code || 'INTERNAL_ERROR' } });
    }
  }

  async getLowPerformance(req: Request, res: Response): Promise<void> {
    try {
      const result = await service.getLowPerformanceStudents();
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, error: { message: error.message || 'Erro interno', code: error.code || 'INTERNAL_ERROR' } });
    }
  }

  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const result = await service.getDashboard();
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, error: { message: error.message || 'Erro interno', code: error.code || 'INTERNAL_ERROR' } });
    }
  }
}
