import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { tenantScope } from '../middleware/auth';

const createSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  revenueTarget: z.number().positive(),
  professionalId: z.string().optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { month, year } = req.query;
  const where: Record<string, unknown> = tenantScope(req.user!.tenantId);
  if (month) where.month = parseInt(month as string, 10);
  if (year) where.year = parseInt(year as string, 10);

  const goals = await prisma.goal.findMany({
    where,
    include: { professional: { select: { id: true, name: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  res.json(goals);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = createSchema.parse(req.body);
  const tenantId = req.user!.tenantId;

  if (data.professionalId) {
    const pro = await prisma.professional.findFirst({
      where: { id: data.professionalId, tenantId },
    });
    if (!pro) throw new AppError(404, 'Profissional não encontrado');
  }

  const goal = await prisma.goal.create({
    data: {
      tenantId,
      month: data.month,
      year: data.year,
      revenueTarget: data.revenueTarget,
      professionalId: data.professionalId ?? null,
    },
    include: { professional: { select: { id: true, name: true } } },
  });
  res.status(201).json(goal);
});

export const progress = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const now = new Date();
  const month = parseInt((req.query.month as string) || String(now.getMonth() + 1), 10);
  const year = parseInt((req.query.year as string) || String(now.getFullYear()), 10);

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const goals = await prisma.goal.findMany({
    where: { tenantId, month, year },
    include: { professional: { select: { id: true, name: true } } },
  });

  const results = await Promise.all(
    goals.map(async (goal) => {
      const revenue = await prisma.appointment.aggregate({
        where: {
          tenantId,
          status: 'COMPLETED',
          completedAt: { gte: start, lte: end },
          ...(goal.professionalId ? { professionalId: goal.professionalId } : {}),
        },
        _sum: { price: true },
      });

      const achieved = revenue._sum.price ?? 0;
      const percent = Math.round((achieved / goal.revenueTarget) * 10000) / 100;

      return {
        goalId: goal.id,
        professional: goal.professional,
        target: goal.revenueTarget,
        achieved,
        percent,
        remaining: Math.max(0, goal.revenueTarget - achieved),
      };
    })
  );

  res.json(results);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.goal.findFirst({
    where: { id: (req.params.id as string), ...tenantScope(req.user!.tenantId) },
  });
  if (!existing) throw new AppError(404, 'Meta não encontrada');

  await prisma.goal.delete({ where: { id: (req.params.id as string) } });
  res.json({ message: 'Meta removida' });
});
