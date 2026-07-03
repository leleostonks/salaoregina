import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { tenantScope } from '../middleware/auth';

const createSchema = z.object({
  name: z.string().min(2),
  price: z.number().positive(),
  durationMin: z.number().int().positive().optional(),
  cost: z.number().min(0).optional(),
});

const updateSchema = createSchema.partial().extend({
  active: z.boolean().optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { active } = req.query;
  const where: Record<string, unknown> = tenantScope(req.user!.tenantId);
  if (active !== undefined) where.active = active === 'true';

  const services = await prisma.service.findMany({
    where,
    orderBy: { name: 'asc' },
  });
  res.json(services);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const service = await prisma.service.findFirst({
    where: { id: (req.params.id as string), ...tenantScope(req.user!.tenantId) },
  });
  if (!service) throw new AppError(404, 'Serviço não encontrado');
  res.json(service);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = createSchema.parse(req.body);
  const service = await prisma.service.create({
    data: {
      tenantId: req.user!.tenantId,
      name: data.name,
      price: data.price,
      durationMin: data.durationMin ?? 60,
      cost: data.cost ?? 0,
    },
  });
  res.status(201).json(service);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);
  const existing = await prisma.service.findFirst({
    where: { id: (req.params.id as string), ...tenantScope(req.user!.tenantId) },
  });
  if (!existing) throw new AppError(404, 'Serviço não encontrado');

  const service = await prisma.service.update({
    where: { id: (req.params.id as string) },
    data,
  });
  res.json(service);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.service.findFirst({
    where: { id: (req.params.id as string), ...tenantScope(req.user!.tenantId) },
  });
  if (!existing) throw new AppError(404, 'Serviço não encontrado');

  await prisma.service.update({
    where: { id: (req.params.id as string) },
    data: { active: false },
  });
  res.json({ message: 'Serviço desativado' });
});

export const analysis = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { from, to } = req.query;

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) dateFilter.gte = new Date(from as string);
  if (to) dateFilter.lte = new Date(to as string);

  const grouped = await prisma.appointmentItem.groupBy({
    by: ['serviceId'],
    where: {
      appointment: {
        tenantId,
        status: 'COMPLETED',
        ...(Object.keys(dateFilter).length ? { completedAt: dateFilter } : {}),
      },
    },
    _sum: { price: true },
    _count: { id: true },
  });

  const services = await prisma.service.findMany({
    where: { tenantId, id: { in: grouped.map((g) => g.serviceId) } },
  });

  const analysis = grouped
    .map((g) => {
      const service = services.find((s) => s.id === g.serviceId);
      const revenue = g._sum.price ?? 0;
      const count = g._count.id;
      const cost = (service?.cost ?? 0) * count;
      return {
        serviceId: g.serviceId,
        name: service?.name ?? 'Desconhecido',
        price: service?.price ?? 0,
        durationMin: service?.durationMin ?? 0,
        sold: count,
        revenue,
        profit: revenue - cost,
        avgTicket: count > 0 ? revenue / count : 0,
      };
    })
    .sort((a, b) => b.sold - a.sold);

  res.json(analysis);
});
