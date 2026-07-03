import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './errorHandler';
import { prisma } from '../lib/prisma';

export interface AuthPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Token não fornecido', 'UNAUTHORIZED'));
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    next(new AppError(401, 'Token inválido ou expirado', 'INVALID_TOKEN'));
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Não autenticado'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Sem permissão para esta ação'));
    }
    next();
  };
}

export async function ensureTenantAccess(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new AppError(401, 'Não autenticado'));
  }

  const tenant = await prisma.tenant.findFirst({
    where: { id: req.user.tenantId, active: true },
  });

  if (!tenant) {
    return next(new AppError(403, 'Salão inativo ou não encontrado'));
  }

  next();
}

export function tenantScope(tenantId: string) {
  return { tenantId };
}
