import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { startOfDay, endOfDay } from '../utils/helpers';

const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 19;
const SLOT_STEP_MIN = 30;

async function resolveTenant(slug: string) {
  const tenant = await prisma.tenant.findFirst({ where: { slug, active: true } });
  if (!tenant) throw new AppError(404, 'Salão não encontrado');
  return tenant;
}

export const info = asyncHandler(async (req: Request, res: Response) => {
  const tenant = await resolveTenant(req.params.slug as string);
  res.json({ name: tenant.name, slug: tenant.slug, phone: tenant.phone });
});

export const listServices = asyncHandler(async (req: Request, res: Response) => {
  const tenant = await resolveTenant(req.params.slug as string);
  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, price: true, durationMin: true },
  });
  res.json(services);
});

export const listProfessionals = asyncHandler(async (req: Request, res: Response) => {
  const tenant = await resolveTenant(req.params.slug as string);
  const professionals = await prisma.professional.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  res.json(professionals);
});

function parseServiceIds(raw: unknown): string[] {
  const str = Array.isArray(raw) ? raw.join(',') : String(raw ?? '');
  const ids = str.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) throw new AppError(400, 'Selecione ao menos um serviço');
  return ids;
}

async function resolveServices(tenantId: string, serviceIds: string[]) {
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, tenantId, active: true },
  });
  if (services.length !== serviceIds.length) {
    throw new AppError(404, 'Um ou mais serviços não encontrados');
  }
  return services;
}

const availabilityQuerySchema = z.object({
  professionalId: z.string(),
  serviceIds: z.string(),
  date: z.string(),
});

export const availability = asyncHandler(async (req: Request, res: Response) => {
  const tenant = await resolveTenant(req.params.slug as string);
  const query = availabilityQuerySchema.parse(req.query);
  const serviceIds = parseServiceIds(query.serviceIds);

  const services = await resolveServices(tenant.id, serviceIds);
  const totalDuration = services.reduce((sum, s) => sum + s.durationMin, 0);

  const professional = await prisma.professional.findFirst({
    where: { id: query.professionalId, tenantId: tenant.id, active: true },
  });
  if (!professional) throw new AppError(404, 'Profissional não encontrado');

  const day = new Date(`${query.date}T00:00:00`);
  if (Number.isNaN(day.getTime())) throw new AppError(400, 'Data inválida');

  const existing = await prisma.appointment.findMany({
    where: {
      tenantId: tenant.id,
      professionalId: professional.id,
      status: { not: 'CANCELLED' },
      scheduledAt: { gte: startOfDay(day), lte: endOfDay(day) },
    },
    include: { items: { include: { service: { select: { durationMin: true } } } }, service: { select: { durationMin: true } } },
  });

  const dayStart = new Date(day);
  dayStart.setHours(BUSINESS_START_HOUR, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(BUSINESS_END_HOUR, 0, 0, 0);

  const now = new Date();
  const slots: string[] = [];

  for (
    let slotStart = new Date(dayStart);
    slotStart.getTime() + totalDuration * 60000 <= dayEnd.getTime();
    slotStart = new Date(slotStart.getTime() + SLOT_STEP_MIN * 60000)
  ) {
    if (slotStart < now) continue;

    const slotEnd = new Date(slotStart.getTime() + totalDuration * 60000);
    const overlaps = existing.some((a) => {
      const aStart = a.scheduledAt;
      const aDurationMin = a.items.length > 0
        ? a.items.reduce((sum, i) => sum + (i.service?.durationMin ?? 0), 0)
        : (a.service?.durationMin ?? 60);
      const aEnd = new Date(aStart.getTime() + aDurationMin * 60000);
      return slotStart < aEnd && slotEnd > aStart;
    });

    if (!overlaps) slots.push(slotStart.toISOString());
  }

  res.json(slots);
});

const bookSchema = z.object({
  professionalId: z.string(),
  serviceIds: z.array(z.string()).min(1, 'Selecione ao menos um serviço'),
  scheduledAt: z.string(),
  clientName: z.string().min(2, 'Informe seu nome'),
  clientPhone: z.string().min(8, 'Informe um telefone válido'),
});

export const book = asyncHandler(async (req: Request, res: Response) => {
  const tenant = await resolveTenant(req.params.slug as string);
  const data = bookSchema.parse(req.body);

  const services = await resolveServices(tenant.id, data.serviceIds);
  const totalDuration = services.reduce((sum, s) => sum + s.durationMin, 0);
  const totalPrice = services.reduce((sum, s) => sum + s.price, 0);

  const professional = await prisma.professional.findFirst({
    where: { id: data.professionalId, tenantId: tenant.id, active: true },
  });
  if (!professional) throw new AppError(404, 'Profissional não encontrado');

  const scheduledAt = new Date(data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt < new Date()) {
    throw new AppError(400, 'Horário inválido');
  }

  const slotEnd = new Date(scheduledAt.getTime() + totalDuration * 60000);
  const sameDayAppointments = await prisma.appointment.findMany({
    where: {
      tenantId: tenant.id,
      professionalId: professional.id,
      status: { not: 'CANCELLED' },
      scheduledAt: { gte: startOfDay(scheduledAt), lte: endOfDay(scheduledAt) },
    },
    include: { items: { include: { service: { select: { durationMin: true } } } }, service: { select: { durationMin: true } } },
  });
  const hasConflict = sameDayAppointments.some((a) => {
    const aStart = a.scheduledAt;
    const aDurationMin = a.items.length > 0
      ? a.items.reduce((sum, i) => sum + (i.service?.durationMin ?? 0), 0)
      : (a.service?.durationMin ?? 60);
    const aEnd = new Date(aStart.getTime() + aDurationMin * 60000);
    return scheduledAt < aEnd && slotEnd > aStart;
  });
  if (hasConflict) {
    throw new AppError(409, 'Esse horário acabou de ser reservado, escolha outro');
  }

  let client = await prisma.client.findFirst({
    where: { tenantId: tenant.id, phone: data.clientPhone },
  });
  if (!client) {
    client = await prisma.client.create({
      data: { tenantId: tenant.id, name: data.clientName, phone: data.clientPhone },
    });
  }

  const appointment = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      clientId: client.id,
      professionalId: professional.id,
      serviceId: services[0].id,
      scheduledAt,
      price: totalPrice,
      status: 'SCHEDULED',
      items: {
        create: services.map((s) => ({ serviceId: s.id, price: s.price })),
      },
    },
    include: {
      items: { include: { service: { select: { name: true, price: true, durationMin: true } } } },
      professional: { select: { name: true } },
    },
  });

  res.status(201).json(appointment);
});

const lookupSchema = z.object({
  phone: z.string().min(8, 'Informe um telefone válido'),
});

export const myAppointments = asyncHandler(async (req: Request, res: Response) => {
  const tenant = await resolveTenant(req.params.slug as string);
  const { phone } = lookupSchema.parse(req.body);

  const client = await prisma.client.findFirst({
    where: { tenantId: tenant.id, phone },
  });
  if (!client) return res.json([]);

  const appointments = await prisma.appointment.findMany({
    where: { tenantId: tenant.id, clientId: client.id },
    include: {
      items: { include: { service: { select: { name: true, price: true, durationMin: true } } } },
      professional: { select: { name: true } },
    },
    orderBy: { scheduledAt: 'desc' },
  });

  res.json(appointments);
});
