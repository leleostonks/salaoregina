import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { tenantScope } from '../middleware/auth';

const createSchema = z.object({
  description: z.string().min(2),
  amount: z.number().positive(),
  category: z
    .enum(['RENT', 'UTILITIES', 'SUPPLIES', 'SALARY', 'MARKETING', 'EQUIPMENT', 'OTHER'])
    .optional(),
  status: z.enum(['PENDING', 'PAID', 'OVERDUE']).optional(),
  dueDate: z.string(),
});

const updateSchema = createSchema.partial();

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { status, category, from, to } = req.query;
  const where: Record<string, unknown> = tenantScope(req.user!.tenantId);

  if (status) where.status = status;
  if (category) where.category = category;
  if (from || to) {
    where.dueDate = {};
    if (from) (where.dueDate as Record<string, Date>).gte = new Date(from as string);
    if (to) (where.dueDate as Record<string, Date>).lte = new Date(to as string);
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { dueDate: 'desc' },
  });
  res.json(expenses);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = createSchema.parse(req.body);
  const expense = await prisma.expense.create({
    data: {
      tenantId: req.user!.tenantId,
      description: data.description,
      amount: data.amount,
      category: data.category ?? 'OTHER',
      status: data.status ?? 'PENDING',
      dueDate: new Date(data.dueDate),
      paidAt: data.status === 'PAID' ? new Date() : null,
    },
  });
  res.status(201).json(expense);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);
  const existing = await prisma.expense.findFirst({
    where: { id: (req.params.id as string), ...tenantScope(req.user!.tenantId) },
  });
  if (!existing) throw new AppError(404, 'Despesa não encontrada');

  const expense = await prisma.expense.update({
    where: { id: (req.params.id as string) },
    data: {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      paidAt:
        data.status === 'PAID' && existing.status !== 'PAID'
          ? new Date()
          : data.status && data.status !== 'PAID'
            ? null
            : undefined,
    },
  });
  res.json(expense);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.expense.findFirst({
    where: { id: (req.params.id as string), ...tenantScope(req.user!.tenantId) },
  });
  if (!existing) throw new AppError(404, 'Despesa não encontrada');

  await prisma.expense.delete({ where: { id: (req.params.id as string) } });
  res.json({ message: 'Despesa removida' });
});

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { from, to } = req.query;

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) dateFilter.gte = new Date(from as string);
  if (to) dateFilter.lte = new Date(to as string);

  const [paid, pending, overdue] = await Promise.all([
    prisma.expense.aggregate({
      where: { tenantId, status: 'PAID', ...(Object.keys(dateFilter).length ? { paidAt: dateFilter } : {}) },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { tenantId, status: 'PENDING' },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { tenantId, status: 'OVERDUE' },
      _sum: { amount: true },
    }),
  ]);

  res.json({
    paid: paid._sum.amount ?? 0,
    pending: pending._sum.amount ?? 0,
    overdue: overdue._sum.amount ?? 0,
    total: (paid._sum.amount ?? 0) + (pending._sum.amount ?? 0) + (overdue._sum.amount ?? 0),
  });
});
