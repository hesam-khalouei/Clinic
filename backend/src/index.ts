import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import inboxRoutes from './routes/inbox.js';
import appointmentRoutes from './routes/appointments.js';
import analyticsRoutes from './routes/analytics.js';
import { authenticateToken } from './middleware/auth.js';

const app = express();
const server = http.createServer(app);

export const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/inbox', authenticateToken, inboxRoutes);
app.use('/api/v1/appointments', authenticateToken, appointmentRoutes);
app.use('/api/v1/analytics', authenticateToken, analyticsRoutes);

io.on('connection', (socket) => {
  socket.on('join_tenant', (tenantId: string) => {
    socket.join(`tenant_${tenantId}`);
  });
});

const PORT = 5001;
server.listen(PORT, () => console.log(`🚀 سرور بک‌اند روی پورت ${PORT} اجرا شد`));