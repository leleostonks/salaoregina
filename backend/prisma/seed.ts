import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do SalonHub...\n');

  const password = await bcrypt.hash('senha123', 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'studio-regina' },
    update: {},
    create: {
      name: 'Studio Regina',
      slug: 'studio-regina',
      email: 'regina@salonhub.demo',
      phone: '(11) 99999-0000',
      plan: 'PROFESSIONAL',
    },
  });

  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'regina@salonhub.demo' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Regina Silva',
      email: 'regina@salonhub.demo',
      password,
      role: 'OWNER',
    },
  });

  const professionals = await Promise.all([
    prisma.professional.upsert({
      where: { id: 'seed-pro-1' },
      update: {},
      create: {
        id: 'seed-pro-1',
        tenantId: tenant.id,
        name: 'Ana Costa',
        commissionRate: 0.45,
        phone: '(11) 98888-0001',
      },
    }),
    prisma.professional.upsert({
      where: { id: 'seed-pro-2' },
      update: {},
      create: {
        id: 'seed-pro-2',
        tenantId: tenant.id,
        name: 'Juliana Mendes',
        commissionRate: 0.4,
        phone: '(11) 98888-0002',
      },
    }),
    prisma.professional.upsert({
      where: { id: 'seed-pro-3' },
      update: {},
      create: {
        id: 'seed-pro-3',
        tenantId: tenant.id,
        name: 'Carla Santos',
        commissionRate: 0.35,
        phone: '(11) 98888-0003',
      },
    }),
  ]);

  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: 'seed-svc-1' },
      update: {},
      create: { id: 'seed-svc-1', tenantId: tenant.id, name: 'Corte Feminino', price: 80, durationMin: 45, cost: 5 },
    }),
    prisma.service.upsert({
      where: { id: 'seed-svc-2' },
      update: {},
      create: { id: 'seed-svc-2', tenantId: tenant.id, name: 'Escova', price: 60, durationMin: 40, cost: 8 },
    }),
    prisma.service.upsert({
      where: { id: 'seed-svc-3' },
      update: {},
      create: { id: 'seed-svc-3', tenantId: tenant.id, name: 'Coloração', price: 180, durationMin: 120, cost: 35 },
    }),
    prisma.service.upsert({
      where: { id: 'seed-svc-4' },
      update: {},
      create: { id: 'seed-svc-4', tenantId: tenant.id, name: 'Manicure', price: 45, durationMin: 50, cost: 10 },
    }),
    prisma.service.upsert({
      where: { id: 'seed-svc-5' },
      update: {},
      create: { id: 'seed-svc-5', tenantId: tenant.id, name: 'Hidratação', price: 120, durationMin: 60, cost: 20 },
    }),
  ]);

  const clientNames = [
    'Maria Oliveira', 'Fernanda Lima', 'Patrícia Souza', 'Camila Rocha',
    'Beatriz Alves', 'Larissa Dias', 'Amanda Ferreira', 'Bruna Martins',
  ];

  const clients = [];
  for (let i = 0; i < clientNames.length; i++) {
    const c = await prisma.client.upsert({
      where: { id: `seed-cli-${i + 1}` },
      update: {},
      create: {
        id: `seed-cli-${i + 1}`,
        tenantId: tenant.id,
        name: clientNames[i],
        phone: `(11) 97777-000${i + 1}`,
        createdAt: new Date(Date.now() - (30 - i * 3) * 24 * 60 * 60 * 1000),
      },
    });
    clients.push(c);
  }

  const now = new Date();
  const paymentMethods = ['PIX', 'CREDIT_CARD', 'CASH', 'DEBIT_CARD'] as const;

  let appointmentCount = 0;
  for (let day = 29; day >= 0; day--) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    const appointmentsPerDay = Math.floor(Math.random() * 4) + 2;

    for (let j = 0; j < appointmentsPerDay; j++) {
      const service = services[Math.floor(Math.random() * services.length)];
      const professional = professionals[Math.floor(Math.random() * professionals.length)];
      const client = clients[Math.floor(Math.random() * clients.length)];
      const scheduledAt = new Date(date);
      scheduledAt.setHours(9 + j * 2, 0, 0, 0);

      const commission = service.price * professional.commissionRate;

      const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

      await prisma.appointment.create({
        data: {
          tenantId: tenant.id,
          clientId: client.id,
          professionalId: professional.id,
          serviceId: service.id,
          scheduledAt,
          completedAt: scheduledAt,
          status: 'COMPLETED',
          price: service.price,
          commission,
          paymentMethod: method,
          items: {
            create: [{ serviceId: service.id, price: service.price }],
          },
          payments: {
            create: [{ method, amount: service.price }],
          },
        },
      });
      appointmentCount++;
    }
  }

  const expenseData = [
    { description: 'Aluguel do salão', amount: 3500, category: 'RENT' as const, status: 'PAID' as const },
    { description: 'Energia elétrica', amount: 420, category: 'UTILITIES' as const, status: 'PAID' as const },
    { description: 'Produtos de beleza', amount: 890, category: 'SUPPLIES' as const, status: 'PAID' as const },
    { description: 'Instagram Ads', amount: 300, category: 'MARKETING' as const, status: 'PAID' as const },
    { description: 'Aluguel próximo mês', amount: 3500, category: 'RENT' as const, status: 'PENDING' as const },
    { description: 'Fornecedor tintas', amount: 650, category: 'SUPPLIES' as const, status: 'PENDING' as const },
  ];

  for (const exp of expenseData) {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + (exp.status === 'PENDING' ? 15 : -5));

    await prisma.expense.create({
      data: {
        tenantId: tenant.id,
        description: exp.description,
        amount: exp.amount,
        category: exp.category,
        status: exp.status,
        dueDate,
        paidAt: exp.status === 'PAID' ? dueDate : null,
      },
    });
  }

  const goalExists = await prisma.goal.findFirst({
    where: {
      tenantId: tenant.id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      professionalId: null,
    },
  });

  if (!goalExists) {
    await prisma.goal.create({
      data: {
        tenantId: tenant.id,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        revenueTarget: 15000,
      },
    });
  }

  console.log('✅ Seed concluído!\n');
  console.log('  Salão:     Studio Regina');
  console.log('  E-mail:    regina@salonhub.demo');
  console.log('  Senha:     senha123');
  console.log(`  Plano:     PROFESSIONAL`);
  console.log(`  Atendimentos criados: ${appointmentCount}`);
  console.log('\n  Login: POST http://localhost:3001/api/auth/login');
  console.log('  Body:  { "email": "regina@salonhub.demo", "password": "senha123" }\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
