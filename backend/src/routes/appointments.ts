import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { io } from '../index.js';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tenantId;
  const appointments = await prisma.appointment.findMany({
    where: { tenantId },
    include: { patient: true, doctor: { select: { id: true, name: true } } },
    orderBy: { startTime: 'asc' }
  });
  res.json(appointments);
});

router.post('/book', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tenantId;
  const { patientId, doctorId, startTime, endTime, serviceName, depositPaid, totalAmount } = req.body;
  const start = new Date(startTime);
  const end = new Date(endTime);

  const conflict = await prisma.appointment.findFirst({
    where: {
      tenantId,
      doctorId,
      status: { not: 'CANCELLED' },
      OR: [
        { startTime: { lte: start }, endTime: { gt: start } },
        { startTime: { lt: end }, endTime: { gte: end } },
        { startTime: { gte: start }, endTime: { lte: end } }
      ]
    }
  });

  if (conflict) {
    return res.status(409).json({ error: 'این تایم‌اسلات با نوبت دیگری تداخل دارد' });
  }

  const appointment = await prisma.appointment.create({
    data: {
      tenantId,
      patientId,
      doctorId,
      startTime: start,
      endTime: end,
      serviceName,
      depositPaid: Number(depositPaid) || 0,
      totalAmount: Number(totalAmount) || 0,
      status: 'CONFIRMED'
    },
    include: { patient: true, doctor: { select: { id: true, name: true } } }
  });

  io.to(`tenant_${tenantId}`).emit('appointment_created', appointment);
  res.json(appointment);
});

export default router;