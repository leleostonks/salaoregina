import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { tenantScope } from '../middleware/auth';

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;
  const where: Record<string, unknown> = tenantScope(req.user!.tenantId);

  if (search && typeof search === 'string') {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  const clients = await prisma.client.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { appointments: true } },
    },
  });
  res.json(clients);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const client = await prisma.client.findFirst({
    where: { id: req.params.id, ...tenantScope(req.user!.tenantId) },
    include: {
      appointments: {
        orderBy: { scheduledAt: 'desc' },
        take: 20,
        include: {
          service: { select: { name: true, price: true } },
          professional: { select: { name: true } },
        },
      },
    },
  });
  if (!client) throw new AppError(404, 'Cliente não encontrado');
  res.json(client);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = createSchema.parse(req.body);
  const client = await prisma.client.create({
    data: {
      tenantId: req.user!.tenantId,
      name: data.name,
      email: data.email || null,
      phone: data.phone,
      notes: data.notes,
    },
  });
  res.status(201).json(client);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);
  const existing = await prisma.client.findFirst({
    where: { id: req.params.id, ...tenantScope(req.user!.tenantId) },
  });
  if (!existing) throw new AppError(404, 'Cliente não encontrado');

  const client = await prisma.client.update({
    where: { id: req.params.id },
    data: {
      ...data,
      email: data.email === '' ? null : data.email,
    },
  });
  res.json(client);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.client.findFirst({
    where: { id: req.params.id, ...tenantScope(req.user!.tenantId) },
  });
  if (!existing) throw new AppError(404, 'Cliente não encontrado');

  await prisma.client.delete({ where: { id: req.params.id } });
  res.json({ message: 'Cliente removido' });
});

export const stats = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const totalClients = await prisma.client.count({ where: { tenantId } });

  const newClients = await prisma.client.count({
    where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
  });

  const clientsWithAppointments = await prisma.appointment.groupBy({
    by: ['clientId'],
    where: { tenantId, status: 'COMPLETED' },
    _count: { id: true },
  });

  const recurring = clientsWithAppointments.filter((c) => c._count.id > 1).length;

  res.json({
    total: totalClients,
    newLast30Days: newClients,
    recurring,
    oneTime: clientsWithAppointments.filter((c) => c._count.id === 1).length,
  });
});
