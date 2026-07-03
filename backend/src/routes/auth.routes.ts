import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthPayload } from '../middleware/auth';
import { slugify } from '../utils/helpers';

const registerSchema = z.object({
  salonName: z.string().min(2, 'Nome do salão obrigatório'),
  ownerName: z.string().min(2, 'Nome do proprietário obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findFirst({
    where: { email: data.email },
  });
  if (existing) {
    throw new AppError(409, 'E-mail já cadastrado');
  }

  let slug = slugify(data.salonName);
  const slugExists = await prisma.tenant.findUnique({ where: { slug } });
  if (slugExists) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: data.salonName,
        slug,
        email: data.email,
        phone: data.phone,
        plan: 'BASIC',
      },
    });

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: data.ownerName,
        email: data.email,
        password: hashedPassword,
        role: 'OWNER',
      },
    });

    return { tenant, user };
  });

  const token = signToken({
    userId: result.user.id,
    tenantId: result.tenant.id,
    role: result.user.role,
    email: result.user.email,
  });

  res.status(201).json({
    message: 'Salão cadastrado com sucesso',
    token,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
    },
    tenant: {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug,
      plan: result.tenant.plan,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findFirst({
    where: { email: data.email, active: true },
    include: { tenant: true },
  });

  if (!user || !user.tenant.active) {
    throw new AppError(401, 'E-mail ou senha incorretos');
  }

  const valid = await bcrypt.compare(data.password, user.password);
  if (!valid) {
    throw new AppError(401, 'E-mail ou senha incorretos');
  }

  const token = signToken({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    tenant: {
      id: user.tenant.id,
      name: user.tenant.name,
      slug: user.tenant.slug,
      plan: user.tenant.plan,
    },
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          phone: true,
          email: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(404, 'Usuário não encontrado');
  }

  res.json(user);
});
