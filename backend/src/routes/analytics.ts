import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.get('/summary', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tenantId;
  const totalAppointments = await prisma.appointment.count({ where: { tenantId } });
  const rawFinancials = await prisma.appointment.aggregate({
    where: { tenantId, status: { not: 'CANCELLED' } },
    _sum: { totalAmount: true, depositPaid: true }
  });
  const totalPatients = await prisma.patient.count({ where: { tenantId } });
  const totalConversations = await prisma.conversation.count({ where: { tenantId } });
  const bookedConversations = await prisma.conversation.count({ where: { tenantId, status: 'BOOKED' } });
  const conversionRate = totalConversations > 0 ? Math.round((bookedConversations / totalConversations) * 100) : 0;

  res.json({
    grossIncome: rawFinancials._sum.totalAmount || 0,
    deposits: rawFinancials._sum.depositPaid || 0,
    appointmentsCount: totalAppointments,
    patientsCount: totalPatients,
    conversionRate: `${conversionRate}%`,
    leadFunnel: {
      totalInquiries: totalConversations,
      booked: bookedConversations,
      inProgress: await prisma.conversation.count({ where: { tenantId, status: 'IN_PROGRESS' } })
    }
  });
});

export default router;