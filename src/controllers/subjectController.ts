import { Request, Response } from 'express';
import { SubjectService } from '../services/subjectService';

const service = new SubjectService();

export class SubjectController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
      const result = await service.getAll(page, limit);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, error: { message: error.message || 'Erro interno', code: error.code || 'INTERNAL_ERROR' } });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const result = await service.getById(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, error: { message: error.message || 'Erro interno', code: error.code || 'INTERNAL_ERROR' } });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const result = await service.create(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, error: { message: error.message || 'Erro interno', code: error.code || 'INTERNAL_ERROR' } });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const result = await service.update(req.params.id, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, error: { message: error.message || 'Erro interno', code: error.code || 'INTERNAL_ERROR' } });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await service.delete(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(error.status || 500).json({ success: false, error: { message: error.message || 'Erro interno', code: error.code || 'INTERNAL_ERROR' } });
    }
  }
}
