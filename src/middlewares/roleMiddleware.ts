import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export const roleMiddleware = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Usuário não autenticado', code: 'UNAUTHORIZED' } });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: { message: 'Acesso negado. Permissão insuficiente.', code: 'FORBIDDEN' } });
      return;
    }

    next();
  };
};
