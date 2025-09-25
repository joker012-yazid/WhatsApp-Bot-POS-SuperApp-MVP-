import { Prisma, PrismaClient, Role, PaymentMethod, TicketStatus } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const operatingHours: Prisma.JsonObject = {
    monday: { open: '09:00', close: '18:00' },
    tuesday: { open: '09:00', close: '18:00' },
    wednesday: { open: '09:00', close: '18:00' },
    thursday: { open: '09:00', close: '18:00' },
    friday: { open: '09:00', close: '18:00' },
    saturday: { open: '10:00', close: '16:00' },
    sunday: { open: 'Closed', close: 'Closed' }
  };

  const branch = await prisma.branch.upsert({
    where: { code: 'HQ' },
    update: {},
    create: {
      code: 'HQ',
      name: 'Headquarters',
      operatingHours,
      selfSignupEnabled: false
    }
  });

  const passwordHash = createHash('sha256').update('Admin123!').digest('hex');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@spec.local' },
    update: {},
    create: {
      email: 'admin@spec.local',
      passwordHash,
      fullName: 'Spec Admin',
      role: Role.ADMIN
    }
  });

  const waSession = await prisma.waSession.upsert({
    where: { id: 'seed-session-hq' },
    update: {},
    create: {
      id: 'seed-session-hq',
      branchId: branch.id,
      label: 'HQ Primary Session'
    }
  });

  const customer = await prisma.customer.upsert({
    where: { phone: '+60123456789' },
    update: { fullName: 'Contoh Customer' },
    create: {
      fullName: 'Contoh Customer',
      phone: '+60123456789',
      email: 'customer@example.com'
    }
  });

  const product = await prisma.product.upsert({
    where: {
      branchId_sku: {
        branchId: branch.id,
        sku: 'SKU-001'
      }
    },
    update: {},
    create: {
      branchId: branch.id,
      name: 'Produk Contoh',
      sku: 'SKU-001',
      priceCents: 2500,
      stockQty: 100
    }
  });

  const sale = await prisma.sale.create({
    data: {
      branchId: branch.id,
      customerId: customer.id,
      paymentMethod: PaymentMethod.CASH,
      subtotalCents: 2500,
      discountCents: 0,
      taxCents: 150,
      totalCents: 2650,
      receiptNo: 'BRHQ-20240423-0001',
      items: {
        create: {
          productId: product.id,
          quantity: 1,
          unitPrice: 2500,
          totalCents: 2500
        }
      }
    }
  });

  const ticket = await prisma.ticket.create({
    data: {
      customerId: customer.id,
      waSessionId: waSession.id,
      subject: 'Masalah Pesanan',
      description: 'Status pesanan belum diterima.',
      status: TicketStatus.OPEN,
      assigneeId: admin.id
    }
  });

  const interaction = await prisma.crmInteraction.create({
    data: {
      customerId: customer.id,
      ticketId: ticket.id,
      channel: 'WHATSAPP',
      summary: 'Pelanggan bertanya status penghantaran',
      payload: {
        message: 'Hai, bila order saya akan dihantar?',
        direction: 'INBOUND'
      }
    }
  });

  await prisma.aiSuggestion.create({
    data: {
      ticketId: ticket.id,
      interactionId: interaction.id,
      suggestion: 'Maklumkan pelanggan bahawa pesanan sedang dihantar hari ini.',
      confidence: 0.82
    }
  });

  const form = await prisma.form.upsert({
    where: { id: 'support-intake' },
    update: {},
    create: {
      id: 'support-intake',
      title: 'Borang Aduan',
      description: 'Kumpul maklumat asas pelanggan sebelum chat.'
    }
  });

  await prisma.formSubmission.create({
    data: {
      formId: form.id,
      customerId: customer.id,
      payload: {
        orderNumber: 'SO-1001',
        issueType: 'DELIVERY_DELAY',
        preferredLanguage: 'ms'
      }
    }
  });

  await prisma.auditLog.createMany({
    data: [
      {
        id: 'audit-sale-seed',
        actorId: admin.id,
        saleId: sale.id,
        action: 'SALE_CREATED',
        details: {
          receiptNo: sale.receiptNo,
          totalCents: sale.totalCents
        }
      },
      {
        id: 'audit-ticket-assign',
        actorId: admin.id,
        ticketId: ticket.id,
        action: 'TICKET_ASSIGNED',
        details: {
          assignee: admin.email,
          ticketId: ticket.id
        }
      }
    ]
  });

  console.log('Seed data created', {
    branch: branch.code,
    admin: admin.email,
    waSession: waSession.label,
    receipt: sale.receiptNo
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
