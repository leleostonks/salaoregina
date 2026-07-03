import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { tenantScope } from '../middleware/auth';
import { PLAN_LIMITS } from '../utils/helpers';

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  commissionRate: z.number().min(0).max(1).optional(),
});

const updateSchema = createSchema.partial().extend({
  active: z.boolean().optional(),
});

async function checkProfessionalLimit(tenantId: string) {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const limit = PLAN_LIMITS[tenant.plan].maxProfessionals;
  const count = await prisma.professional.count({
    where: { tenantId, active: true },
  });
  if (count >= limit) {
    throw new AppError(
      403,
      `Limite de ${limit} profissionais atingido no plano ${tenant.plan}. Faça upgrade.`
    );
  }
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { active } = req.query;
  const where: Record<string, unknown> = tenantScope(req.user!.tenantId);
  if (active !== undefined) where.active = active === 'true';

  const professionals = await prisma.professional.findMany({
    where,
    orderBy: { name: 'asc' },
  });
  res.json(professionals);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const professional = await prisma.professional.findFirst({
    where: { id: (req.params.id as string), ...tenantScope(req.user!.tenantId) },
  });
  if (!professional) throw new AppError(404, 'Profissional não encontrado');
  res.json(professional);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = createSchema.parse(req.body);
  await checkProfessionalLimit(req.user!.tenantId);

  const professional = await prisma.professional.create({
    data: {
      tenantId: req.user!.tenantId,
      name: data.name,
      email: data.email || null,
      phone: data.phone,
      commissionRate: data.commissionRate ?? 0.4,
    },
  });
  res.status(201).json(professional);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);
  const existing = await prisma.professional.findFirst({
    where: { id: (req.params.id as string), ...tenantScope(req.user!.tenantId) },
  });
  if (!existing) throw new AppError(404, 'Profissional não encontrado');

  const professional = await prisma.professional.update({
    where: { id: (req.params.id as string) },
    data: {
      ...data,
      email: data.email === '' ? null : data.email,
    },
  });
  res.json(professional);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.professional.findFirst({
    where: { id: (req.params.id as string), ...tenantScope(req.user!.tenantId) },
  });
  if (!existing) throw new AppError(404, 'Profissional não encontrado');

  await prisma.professional.update({
    where: { id: (req.params.id as string) },
    data: { active: false },
  });
  res.json({ message: 'Profissional desativado' });
});

export const ranking = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { from, to } = req.query;

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) dateFilter.gte = new Date(from as string);
  if (to) dateFilter.lte = new Date(to as string);

  const appointments = await prisma.appointment.groupBy({
    by: ['professionalId'],
    where: {
      tenantId,
      status: 'COMPLETED',
      ...(Object.keys(dateFilter).length ? { completedAt: dateFilter } : {}),
    },
    _sum: { price: true, commission: true },
    _count: { id: true },
  });

  const professionals = await prisma.professional.findMany({
    where: { tenantId, id: { in: appointments.map((a) => a.professionalId) } },
  });

  const ranking = appointments
    .map((a) => {
      const pro = professionals.find((p) => p.id === a.professionalId);
      return {
        professionalId: a.professionalId,
        name: pro?.name ?? 'Desconhecido',
        revenue: a._sum.price ?? 0,
        commission: a._sum.commission ?? 0,
        appointments: a._count.id,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  res.json(ranking);
});
