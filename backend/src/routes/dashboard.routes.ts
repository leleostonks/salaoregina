import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  percentChange,
} from '../utils/helpers';

async function getRevenue(
  tenantId: string,
  from: Date,
  to: Date
): Promise<{ revenue: number; count: number }> {
  const result = await prisma.appointment.aggregate({
    where: {
      tenantId,
      status: 'COMPLETED',
      completedAt: { gte: from, lte: to },
    },
    _sum: { price: true },
    _count: { id: true },
  });
  return {
    revenue: result._sum.price ?? 0,
    count: result._count.id,
  };
}

async function getExpenses(tenantId: string, from: Date, to: Date): Promise<number> {
  const result = await prisma.expense.aggregate({
    where: {
      tenantId,
      status: 'PAID',
      paidAt: { gte: from, lte: to },
    },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export const overview = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const now = new Date();

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = endOfMonth(prevMonthStart);

  const [
    today,
    week,
    month,
    prevMonth,
    monthExpenses,
    pendingReceivables,
    upcomingExpenses,
    topProfessionals,
    topServices,
  ] = await Promise.all([
    getRevenue(tenantId, todayStart, todayEnd),
    getRevenue(tenantId, weekStart, todayEnd),
    getRevenue(tenantId, monthStart, monthEnd),
    getRevenue(tenantId, prevMonthStart, prevMonthEnd),
    getExpenses(tenantId, monthStart, monthEnd),
    prisma.expense.aggregate({
      where: { tenantId, status: 'PENDING' },
      _sum: { amount: true },
    }),
    prisma.expense.count({
      where: {
        tenantId,
        status: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.appointment.groupBy({
      by: ['professionalId'],
      where: { tenantId, status: 'COMPLETED', completedAt: { gte: monthStart, lte: monthEnd } },
      _sum: { price: true },
      _count: { id: true },
      orderBy: { _sum: { price: 'desc' } },
      take: 5,
    }),
    prisma.appointmentItem.groupBy({
      by: ['serviceId'],
      where: {
        appointment: {
          tenantId,
          status: 'COMPLETED',
          completedAt: { gte: monthStart, lte: monthEnd },
        },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
  ]);

  const monthProfit = month.revenue - monthExpenses;
  const avgTicket = month.count > 0 ? Math.round((month.revenue / month.count) * 100) / 100 : 0;

  const proIds = topProfessionals.map((p) => p.professionalId);
  const svcIds = topServices.map((s) => s.serviceId);

  const [professionals, services] = await Promise.all([
    prisma.professional.findMany({ where: { id: { in: proIds } }, select: { id: true, name: true } }),
    prisma.service.findMany({ where: { id: { in: svcIds } }, select: { id: true, name: true } }),
  ]);

  res.json({
    period: {
      today: now.toISOString().split('T')[0],
      month: monthStart.toISOString().slice(0, 7),
    },
    revenue: {
      today: today.revenue,
      week: week.revenue,
      month: month.revenue,
      previousMonth: prevMonth.revenue,
      growthPercent: percentChange(month.revenue, prevMonth.revenue),
    },
    appointments: {
      today: today.count,
      week: week.count,
      month: month.count,
      avgTicket,
    },
    finance: {
      revenue: month.revenue,
      expenses: monthExpenses,
      profit: monthProfit,
      pendingPayables: pendingReceivables._sum.amount ?? 0,
      upcomingExpensesCount: upcomingExpenses,
    },
    topProfessionals: topProfessionals.map((p) => ({
      id: p.professionalId,
      name: professionals.find((pr) => pr.id === p.professionalId)?.name ?? '—',
      revenue: p._sum.price ?? 0,
      appointments: p._count.id,
    })),
    topServices: topServices.map((s) => ({
      id: s.serviceId,
      name: services.find((sv) => sv.id === s.serviceId)?.name ?? '—',
      sold: s._count.id,
    })),
  });
});

export const revenueChart = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const days = parseInt((req.query.days as string) || '30', 10);
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      status: 'COMPLETED',
      completedAt: { gte: start, lte: now },
    },
    select: { completedAt: true, price: true },
  });

  const chart: Record<string, { revenue: number; count: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    chart[key] = { revenue: 0, count: 0 };
  }

  for (const apt of appointments) {
    if (!apt.completedAt) continue;
    const key = apt.completedAt.toISOString().split('T')[0];
    if (chart[key]) {
      chart[key].revenue += apt.price;
      chart[key].count += 1;
    }
  }

  res.json(
    Object.entries(chart).map(([date, data]) => ({ date, ...data }))
  );
});

export const cashFlow = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const month = parseInt((req.query.month as string) || String(new Date().getMonth() + 1), 10);
  const year = parseInt((req.query.year as string) || String(new Date().getFullYear()), 10);

  const start = new Date(year, month - 1, 1);
  const end = endOfMonth(start);

  const [revenue, expenses] = await Promise.all([
    prisma.appointment.findMany({
      where: { tenantId, status: 'COMPLETED', completedAt: { gte: start, lte: end } },
      select: { completedAt: true, price: true },
    }),
    prisma.expense.findMany({
      where: { tenantId, status: 'PAID', paidAt: { gte: start, lte: end } },
      select: { paidAt: true, amount: true },
    }),
  ]);

  const daysInMonth = end.getDate();
  const flow = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    inflow: 0,
    outflow: 0,
    balance: 0,
  }));

  for (const r of revenue) {
    if (!r.completedAt) continue;
    const day = r.completedAt.getDate() - 1;
    flow[day].inflow += r.price;
  }

  for (const e of expenses) {
    if (!e.paidAt) continue;
    const day = e.paidAt.getDate() - 1;
    flow[day].outflow += e.amount;
  }

  let running = 0;
  for (const f of flow) {
    running += f.inflow - f.outflow;
    f.balance = Math.round(running * 100) / 100;
    f.inflow = Math.round(f.inflow * 100) / 100;
    f.outflow = Math.round(f.outflow * 100) / 100;
  }

  res.json({ month, year, days: flow });
});
