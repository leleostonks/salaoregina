import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { tenantScope } from '../middleware/auth';
import { PAYMENT_METHODS } from '../utils/payments';
import { PaymentMethod } from '@prisma/client';

const paymentMethodEnum = z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'TRANSFER', 'OTHER']);

const createSchema = z.object({
  clientId: z.string(),
  professionalId: z.string(),
  serviceIds: z.array(z.string()).optional(),
  serviceId: z.string().optional(),
  scheduledAt: z.string().datetime({ offset: true }).or(z.string()),
  price: z.number().positive().optional(),
  notes: z.string().optional(),
}).refine(
  (d) => (d.serviceIds && d.serviceIds.length > 0) || !!d.serviceId,
  { message: 'Selecione ao menos um serviço' }
);

const completeSchema = z.object({
  paymentMethod: paymentMethodEnum.optional(),
  payments: z.array(z.object({
    method: paymentMethodEnum,
    amount: z.number().positive(),
  })).optional(),
  price: z.number().positive().optional(),
}).refine(
  (d) => d.paymentMethod || (d.payments && d.payments.length > 0),
  { message: 'Informe ao menos um método de pagamento' }
);

const updateSchema = z.object({
  scheduledAt: z.string().optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes: z.string().optional(),
});

const appointmentInclude = {
  client: { select: { id: true, name: true, phone: true } },
  professional: { select: { id: true, name: true } },
  service: { select: { id: true, name: true, price: true, durationMin: true } },
  items: {
    include: { service: { select: { id: true, name: true, price: true, durationMin: true } } },
  },
  payments: true,
};

function resolveServiceIds(data: z.infer<typeof createSchema>): string[] {
  if (data.serviceIds && data.serviceIds.length > 0) return data.serviceIds;
  if (data.serviceId) return [data.serviceId];
  return [];
}

export const listPaymentMethods = asyncHandler(async (_req: Request, res: Response) => {
  res.json(PAYMENT_METHODS);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { status, professionalId, from, to } = req.query;
  const where: Record<string, unknown> = tenantScope(req.user!.tenantId);

  if (status) where.status = status;
  if (professionalId) where.professionalId = professionalId;

  if (from || to) {
    where.scheduledAt = {};
    if (from) (where.scheduledAt as Record<string, Date>).gte = new Date(from as string);
    if (to) (where.scheduledAt as Record<string, Date>).lte = new Date(to as string);
  }

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { scheduledAt: 'desc' },
    include: appointmentInclude,
  });
  res.json(appointments);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await prisma.appointment.findFirst({
    where: { id: (req.params.id as string), ...tenantScope(req.user!.tenantId) },
    include: appointmentInclude,
  });
  if (!appointment) throw new AppError(404, 'Atendimento não encontrado');
  res.json(appointment);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = createSchema.parse(req.body);
  const tenantId = req.user!.tenantId;
  const serviceIds = resolveServiceIds(data);

  const [client, professional, services] = await Promise.all([
    prisma.client.findFirst({ where: { id: data.clientId, tenantId } }),
    prisma.professional.findFirst({ where: { id: data.professionalId, tenantId, active: true } }),
    prisma.service.findMany({ where: { id: { in: serviceIds }, tenantId, active: true } }),
  ]);

  if (!client) throw new AppError(404, 'Cliente não encontrado');
  if (!professional) throw new AppError(404, 'Profissional não encontrado');
  if (services.length !== serviceIds.length) throw new AppError(404, 'Um ou mais serviços não encontrados');

  const totalPrice = data.price ?? services.reduce((sum, s) => sum + s.price, 0);

  const appointment = await prisma.appointment.create({
    data: {
      tenantId,
      clientId: data.clientId,
      professionalId: data.professionalId,
      serviceId: services[0]?.id ?? null,
      scheduledAt: new Date(data.scheduledAt),
      price: totalPrice,
      notes: data.notes,
      items: {
        create: services.map((s) => ({
          serviceId: s.id,
          price: s.price,
        })),
      },
    },
    include: appointmentInclude,
  });
  res.status(201).json(appointment);
});

export const complete = asyncHandler(async (req: Request, res: Response) => {
  const data = completeSchema.parse(req.body);
  const tenantId = req.user!.tenantId;

  const appointment = await prisma.appointment.findFirst({
    where: { id: (req.params.id as string), tenantId },
    include: { professional: true, payments: true },
  });
  if (!appointment) throw new AppError(404, 'Atendimento não encontrado');
  if (appointment.status === 'COMPLETED') {
    throw new AppError(400, 'Atendimento já concluído');
  }

  const price = data.price ?? appointment.price;
  const commission = price * appointment.professional.commissionRate;

  let paymentsToCreate: { method: PaymentMethod; amount: number }[] = [];
  if (data.payments && data.payments.length > 0) {
    const sum = data.payments.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(sum - price) > 0.01) {
      throw new AppError(400, `Soma dos pagamentos (${sum}) deve ser igual ao total (${price})`);
    }
    paymentsToCreate = data.payments;
  } else if (data.paymentMethod) {
    paymentsToCreate = [{ method: data.paymentMethod, amount: price }];
  }

  const primaryMethod = paymentsToCreate.length === 1
    ? paymentsToCreate[0].method
    : paymentsToCreate[0]?.method ?? null;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.appointmentPayment.deleteMany({ where: { appointmentId: appointment.id } });
    return tx.appointment.update({
      where: { id: (req.params.id as string) },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        price,
        commission,
        paymentMethod: primaryMethod,
        payments: {
          create: paymentsToCreate.map((p) => ({
            method: p.method,
            amount: p.amount,
          })),
        },
      },
      include: appointmentInclude,
    });
  });

  res.json(updated);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);
  const existing = await prisma.appointment.findFirst({
    where: { id: (req.params.id as string), ...tenantScope(req.user!.tenantId) },
  });
  if (!existing) throw new AppError(404, 'Atendimento não encontrado');

  const appointment = await prisma.appointment.update({
    where: { id: (req.params.id as string) },
    data: {
      ...data,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    },
    include: appointmentInclude,
  });
  res.json(appointment);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.appointment.findFirst({
    where: { id: (req.params.id as string), ...tenantScope(req.user!.tenantId) },
  });
  if (!existing) throw new AppError(404, 'Atendimento não encontrado');

  await prisma.appointment.delete({ where: { id: (req.params.id as string) } });
  res.json({ message: 'Atendimento removido' });
});
