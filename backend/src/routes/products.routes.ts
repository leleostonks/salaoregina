import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { tenantScope } from '../middleware/auth';
import { PLAN_LIMITS } from '../utils/helpers';

const createSchema = z.object({
  name: z.string().min(2),
  sku: z.string().optional(),
  quantity: z.number().int().min(0).optional(),
  minQuantity: z.number().int().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
});

const updateSchema = createSchema.partial().extend({
  active: z.boolean().optional(),
});

const adjustSchema = z.object({
  quantity: z.number().int(),
  reason: z.string().optional(),
});

async function requireInventoryPlan(tenantId: string) {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  if (!(PLAN_LIMITS[tenant.plan].features as readonly string[]).includes('inventory')) {
    throw new AppError(403, 'Controle de estoque disponível apenas no plano Premium');
  }
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  await requireInventoryPlan(req.user!.tenantId);
  const { active, lowStock } = req.query;
  const where: Record<string, unknown> = tenantScope(req.user!.tenantId);

  if (active !== undefined) where.active = active === 'true';

  let products = await prisma.product.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  if (lowStock === 'true') {
    products = products.filter((p) => p.quantity <= p.minQuantity);
  }

  res.json(products);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  await requireInventoryPlan(req.user!.tenantId);
  const data = createSchema.parse(req.body);

  const product = await prisma.product.create({
    data: {
      tenantId: req.user!.tenantId,
      name: data.name,
      sku: data.sku,
      quantity: data.quantity ?? 0,
      minQuantity: data.minQuantity ?? 5,
      unitCost: data.unitCost ?? 0,
      unitPrice: data.unitPrice ?? 0,
    },
  });
  res.status(201).json(product);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await requireInventoryPlan(req.user!.tenantId);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.product.findFirst({
    where: { id: req.params.id, ...tenantScope(req.user!.tenantId) },
  });
  if (!existing) throw new AppError(404, 'Produto não encontrado');

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data,
  });
  res.json(product);
});

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  await requireInventoryPlan(req.user!.tenantId);
  const data = adjustSchema.parse(req.body);
  const existing = await prisma.product.findFirst({
    where: { id: req.params.id, ...tenantScope(req.user!.tenantId) },
  });
  if (!existing) throw new AppError(404, 'Produto não encontrado');

  const newQty = existing.quantity + data.quantity;
  if (newQty < 0) throw new AppError(400, 'Estoque insuficiente');

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { quantity: newQty },
  });
  res.json(product);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await requireInventoryPlan(req.user!.tenantId);
  const existing = await prisma.product.findFirst({
    where: { id: req.params.id, ...tenantScope(req.user!.tenantId) },
  });
  if (!existing) throw new AppError(404, 'Produto não encontrado');

  await prisma.product.update({
    where: { id: req.params.id },
    data: { active: false },
  });
  res.json({ message: 'Produto desativado' });
});

export const alerts = asyncHandler(async (req: Request, res: Response) => {
  await requireInventoryPlan(req.user!.tenantId);
  const products = await prisma.product.findMany({
    where: { tenantId: req.user!.tenantId, active: true },
  });

  const lowStock = products
    .filter((p) => p.quantity <= p.minQuantity)
    .map((p) => ({
      id: p.id,
      name: p.name,
      quantity: p.quantity,
      minQuantity: p.minQuantity,
    }));

  res.json(lowStock);
});
