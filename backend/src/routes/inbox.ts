import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { io } from '../index.js';

const router = Router();

router.get('/conversations', async (req: AuthenticatedRequest, res) => {
  const tenantId = req.user!.tenantId;
  const conversations = await prisma.conversation.findMany({
    where: { tenantId },
    include: { patient: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { updatedAt: 'desc' }
  });
  res.json(conversations);
});

router.get('/conversations/:id/messages', async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const tenantId = req.user!.tenantId;
  const conversation = await prisma.conversation.findFirst({ where: { id, tenantId } });
  if (!conversation) return res.status(404).json({ error: 'گفتگو یافت نشد' });

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' }
  });
  res.json(messages);
});

router.post('/messages/send', async (req: AuthenticatedRequest, res) => {
  const { conversationId, content } = req.body;
  const tenantId = req.user!.tenantId;
  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, tenantId } });
  if (!conversation) return res.status(404).json({ error: 'گفتگو یافت نشد' });

  const message = await prisma.message.create({
    data: { conversationId, senderType: 'AGENT', content }
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessage: content, status: 'IN_PROGRESS' }
  });

  io.to(`tenant_${tenantId}`).emit('new_message', { conversationId, message });
  res.json(message);
});

export default router;