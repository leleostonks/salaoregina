import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const withoutItems = await prisma.appointment.findMany({
    where: { items: { none: {} }, serviceId: { not: null } },
    select: { id: true, serviceId: true, price: true },
  });

  for (const apt of withoutItems) {
    if (!apt.serviceId) continue;
    const service = await prisma.service.findUnique({ where: { id: apt.serviceId } });
    await prisma.appointmentItem.create({
      data: {
        appointmentId: apt.id,
        serviceId: apt.serviceId,
        price: service?.price ?? apt.price,
      },
    });
  }

  const completedWithoutPayments = await prisma.appointment.findMany({
    where: {
      status: 'COMPLETED',
      paymentMethod: { not: null },
      payments: { none: {} },
    },
    select: { id: true, paymentMethod: true, price: true },
  });

  for (const apt of completedWithoutPayments) {
    if (!apt.paymentMethod) continue;
    await prisma.appointmentPayment.create({
      data: {
        appointmentId: apt.id,
        method: apt.paymentMethod,
        amount: apt.price,
      },
    });
  }

  console.log(`Migrados ${withoutItems.length} itens de servico e ${completedWithoutPayments.length} pagamentos.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
