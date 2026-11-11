import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { UserRepository } from '../repositories/userRepository';

const userRepository = new UserRepository();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ success: false, error: { message: 'Token não fornecido', code: 'UNAUTHORIZED' } });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ success: false, error: { message: 'Token mal formatado', code: 'INVALID_TOKEN' } });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: Role };
    const currentUser = await userRepository.findById(decoded.id);

    if (!currentUser) {
      res.status(401).json({ success: false, error: { message: 'Usuário não encontrado ou inativo', code: 'UNAUTHORIZED' } });
      return;
    }

    // Utiliza sempre o papel (role) atual persistido no banco de dados
    req.user = { id: currentUser.id, role: currentUser.role };
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: { message: 'Token inválido ou expirado', code: 'INVALID_TOKEN' } });
  }
};
