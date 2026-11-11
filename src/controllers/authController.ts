import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      let requester = req.user;
      const authHeader = req.headers.authorization;
      if (!requester && authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          requester = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: Role };
        } catch {
          // Se um token inválido foi enviado, mantém requester indefinido (tratado como anônimo)
          requester = undefined;
        }
      }

      const user = await authService.register(req.body, requester);
      res.status(201).json({ success: true, data: user });
    } catch (error: any) {
      res.status(error.status || 500).json({
        success: false,
        error: {
          message: error.message || 'Erro interno do servidor',
          code: error.code || 'INTERNAL_SERVER_ERROR'
        }
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const data = await authService.login(req.body);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(error.status || 500).json({
        success: false,
        error: {
          message: error.message || 'Erro interno do servidor',
          code: error.code || 'INTERNAL_SERVER_ERROR'
        }
      });
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Não autenticado', code: 'UNAUTHORIZED' } });
        return;
      }
      
      const user = await authService.me(req.user.id);
      res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      res.status(error.status || 500).json({
        success: false,
        error: {
          message: error.message || 'Erro interno do servidor',
          code: error.code || 'INTERNAL_SERVER_ERROR'
        }
      });
    }
  }
}
