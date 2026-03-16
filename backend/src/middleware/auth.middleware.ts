import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  companyId?: string;
  userRole?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
      userId: string;
      companyId: string;
      role: string;
    };
    req.userId = decoded.userId;
    req.companyId = decoded.companyId;
    req.userRole = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.userRole !== 'ADMIN' && req.userRole !== 'SUPERVISOR') {
    res.status(403).json({ error: 'Acesso não autorizado' });
    return;
  }
  next();
};
