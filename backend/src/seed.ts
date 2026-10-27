import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`DELETE FROM Message;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Conversation;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Appointment;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Patient;`);
  await prisma.$executeRawUnsafe(`DELETE FROM User;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Tenant;`);

  const tenant = await prisma.tenant.create({
    data: { name: 'کلینیک تخصصی زیبایی آریا', slug: 'aria-clinic' }
  });

  const passwordHash = await bcrypt.hash('admin1234', 10);
  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: 'دکتر علیرضا مرادی',
      email: 'doctor@aria.com',
      passwordHash,
      role: 'ADMIN'
    }
  });

  const patient1 = await prisma.patient.create({
    data: {
      tenantId: tenant.id,
      fullName: 'نگار احمدی',
      phoneNumber: '09121112233',
      medicalNotes: 'حساسیت موضعی به لیدوکائین'
    }
  });

  const conv1 = await prisma.conversation.create({
    data: {
      tenantId: tenant.id,
      patientId: patient1.id,
      externalId: '@negar_ahmadi',
      channel: 'INSTAGRAM',
      status: 'IN_PROGRESS',
      lastMessage: 'سلام، وقت ویزیت برای پنج‌شنبه باز دارین؟'
    }
  });

  await prisma.message.createMany({
    data: [
      { conversationId: conv1.id, senderType: 'CLIENT', content: 'سلام وقتتون بخیر، هزینه تزریق مزوژل چقدره؟' },
      { conversationId: conv1.id, senderType: 'AGENT', content: 'درود، هزینه مزوژل از ۳.۵ میلیون تومان است.' },
      { conversationId: conv1.id, senderType: 'CLIENT', content: 'سلام، وقت ویزیت برای پنج‌شنبه باز دارین؟' }
    ]
  });

  const now = new Date();
  await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      patientId: patient1.id,
      doctorId: admin.id,
      startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0),
      endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0),
      serviceName: 'تزریق بوتاکس دیسپورت',
      depositPaid: 500000,
      totalAmount: 2400000,
      status: 'CONFIRMED'
    }
  });

  console.log('✅ دیتابیس لوکال آماده شد! ورود: doctor@aria.com / admin1234');
}

main().catch(console.error).finally(() => prisma.$disconnect());