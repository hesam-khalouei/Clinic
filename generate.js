const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const files = {
  // ---------------- ROOT ----------------
  'package.json': JSON.stringify({
    name: "clinic-saas-platform",
    version: "1.0.0",
    private: true,
    workspaces: ["backend", "frontend"],
    scripts: {
      "dev:backend": "cd backend && npm run dev",
      "dev:frontend": "cd frontend && npm run dev",
      "setup:backend": "cd backend && npm install && npx prisma db push && npm run seed",
      "setup:frontend": "cd frontend && npm install",
      "setup": "npm run setup:backend && npm run setup:frontend"
    }
  }, null, 2),

  // ---------------- BACKEND ----------------
  'backend/package.json': JSON.stringify({
    name: "clinic-backend",
    version: "1.0.0",
    scripts: {
      "dev": "tsx watch src/index.ts",
      "build": "tsc",
      "start": "node dist/index.js",
      "seed": "tsx src/seed.ts"
    },
    dependencies: {
      "@prisma/client": "^5.10.2",
      "bcryptjs": "^2.4.3",
      "cors": "^2.8.5",
      "dotenv": "^16.4.5",
      "express": "^4.18.3",
      "jsonwebtoken": "^9.0.2",
      "socket.io": "^4.7.4",
      "zod": "^3.22.4"
    },
    devDependencies: {
      "@types/bcryptjs": "^2.4.6",
      "@types/cors": "^2.8.17",
      "@types/express": "^4.17.21",
      "@types/jsonwebtoken": "^9.0.6",
      "@types/node": "^20.11.24",
      "prisma": "^5.10.2",
      "tsx": "^4.7.1",
      "typescript": "^5.3.3"
    }
  }, null, 2),

  'backend/tsconfig.json': JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      esModuleInterop: true,
      strict: true,
      skipLibCheck: true,
      outDir: "./dist"
    },
    include: ["src/**/*", "prisma/**/*"]
  }, null, 2),

  'backend/prisma/schema.prisma': `datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model Tenant {
  id            String         @id @default(uuid())
  name          String
  slug          String         @unique
  createdAt     DateTime       @default(now())
  users         User[]
  patients      Patient[]
  conversations Conversation[]
  appointments  Appointment[]
}

model User {
  id           String        @id @default(uuid())
  tenantId     String
  tenant       Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  email        String        @unique
  passwordHash String
  name         String
  role         String        @default("RECEPTIONIST")
  createdAt    DateTime      @default(now())
  appointments Appointment[]
}

model Patient {
  id            String         @id @default(uuid())
  tenantId      String
  tenant        Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  fullName      String
  phoneNumber   String
  nationalId    String?
  medicalNotes  String?
  createdAt     DateTime       @default(now())
  appointments  Appointment[]
  conversations Conversation[]
}

model Conversation {
  id          String    @id @default(uuid())
  tenantId    String
  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  patientId   String?
  patient     Patient?  @relation(fields: [patientId], references: [id], onDelete: SetNull)
  externalId  String
  channel     String
  status      String    @default("UNANSWERED")
  lastMessage String?
  updatedAt   DateTime  @updatedAt
  messages    Message[]
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderType     String
  content        String
  createdAt      DateTime     @default(now())
}

model Appointment {
  id          String   @id @default(uuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  doctorId    String
  doctor      User     @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  startTime   DateTime
  endTime     DateTime
  status      String   @default("CONFIRMED")
  serviceName String
  depositPaid Float    @default(0.0)
  totalAmount Float    @default(0.0)
  createdAt   DateTime @default(now())
}`,

  'backend/src/utils/db.ts': `import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();`,

  'backend/src/middleware/auth.ts': `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'clinic_super_secret_jwt_key_2026';

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token missing' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};`,

  'backend/src/routes/auth.ts': `import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'clinic_super_secret_jwt_key_2026';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: true }
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
  }

  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenant: { id: user.tenant.id, name: user.tenant.name }
    }
  });
});

export default router;`,

  'backend/src/routes/inbox.ts': `import { Router } from 'express';
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

  io.to(\`tenant_\${tenantId}\`).emit('new_message', { conversationId, message });
  res.json(message);
});

export default router;`,

  'backend/src/routes/appointments.ts': `import { Router } from 'express';
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

  io.to(\`tenant_\${tenantId}\`).emit('appointment_created', appointment);
  res.json(appointment);
});

export default router;`,

  'backend/src/routes/analytics.ts': `import { Router } from 'express';
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
    conversionRate: \`\${conversionRate}%\`,
    leadFunnel: {
      totalInquiries: totalConversations,
      booked: bookedConversations,
      inProgress: await prisma.conversation.count({ where: { tenantId, status: 'IN_PROGRESS' } })
    }
  });
});

export default router;`,

  'backend/src/seed.ts': `import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(\`DELETE FROM Message;\`);
  await prisma.$executeRawUnsafe(\`DELETE FROM Conversation;\`);
  await prisma.$executeRawUnsafe(\`DELETE FROM Appointment;\`);
  await prisma.$executeRawUnsafe(\`DELETE FROM Patient;\`);
  await prisma.$executeRawUnsafe(\`DELETE FROM User;\`);
  await prisma.$executeRawUnsafe(\`DELETE FROM Tenant;\`);

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

main().catch(console.error).finally(() => prisma.$disconnect());`,

  'backend/src/index.ts': `import express from 'express';
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
    socket.join(\`tenant_\${tenantId}\`);
  });
});

const PORT = 5001;
server.listen(PORT, () => console.log(\`🚀 سرور بک‌اند روی پورت \${PORT} اجرا شد\`));`,

  // ---------------- FRONTEND ----------------
  'frontend/package.json': JSON.stringify({
    name: "clinic-frontend",
    version: "1.0.0",
    private: true,
    scripts: { "dev": "vite", "build": "tsc && vite build", "preview": "vite preview" },
    dependencies: {
      "clsx": "^2.1.0",
      "lucide-react": "^0.344.0",
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "socket.io-client": "^4.7.4",
      "tailwind-merge": "^2.2.1",
      "zustand": "^4.5.2"
    },
    devDependencies: {
      "@types/react": "^18.2.56",
      "@types/react-dom": "^18.2.19",
      "@vitejs/plugin-react": "^4.2.1",
      "autoprefixer": "^10.4.18",
      "postcss": "^8.4.35",
      "tailwindcss": "^3.4.1",
      "typescript": "^5.3.3",
      "vite": "^5.1.4"
    }
  }, null, 2),

  'frontend/vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 }
});`,

  'frontend/tailwind.config.js': `export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['Vazirmatn', 'sans-serif'] }
    }
  },
  plugins: []
};`,

  'frontend/postcss.config.js': `export default {
  plugins: { tailwindcss: {}, autoprefixer: {} }
};`,

  'frontend/index.html': `<!doctype html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>سامانه مدیریت کلینیک</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,

  'frontend/src/index.css': `@import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css');
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: 'Vazirmatn', sans-serif;
  background-color: #070a12;
  color: #f3f4f6;
  direction: rtl;
}

.glass-panel {
  background: rgba(18, 24, 38, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.glass-card {
  background: rgba(30, 41, 59, 0.45);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}`,

  'frontend/src/types/index.ts': `export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant: { id: string; name: string };
}

export interface Patient {
  id: string;
  fullName: string;
  phoneNumber: string;
  medicalNotes?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: 'CLIENT' | 'AGENT' | 'SYSTEM';
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  externalId: string;
  channel: string;
  status: string;
  lastMessage?: string;
  updatedAt: string;
  patient?: Patient;
}

export interface Appointment {
  id: string;
  patientId: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  depositPaid: number;
  totalAmount: number;
  status: string;
  patient: Patient;
  doctor: { id: string; name: string };
}

export interface AnalyticsSummary {
  grossIncome: number;
  deposits: number;
  appointmentsCount: number;
  patientsCount: number;
  conversionRate: string;
  leadFunnel: { totalInquiries: number; booked: number; inProgress: number };
}`,

  'frontend/src/store/useAppStore.ts': `import { create } from 'zustand';
import { User, Conversation, Appointment, AnalyticsSummary } from '../types';

interface AppState {
  token: string | null;
  user: User | null;
  activeTab: 'inbox' | 'calendar' | 'analytics';
  conversations: Conversation[];
  activeConversationId: string | null;
  appointments: Appointment[];
  analytics: AnalyticsSummary | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setActiveTab: (tab: 'inbox' | 'calendar' | 'analytics') => void;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: string | null) => void;
  setAppointments: (appointments: Appointment[]) => void;
  setAnalytics: (analytics: AnalyticsSummary) => void;
}

export const useAppStore = create<AppState>((set) => ({
  token: localStorage.getItem('token'),
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
  activeTab: 'inbox',
  conversations: [],
  activeConversationId: null,
  appointments: [],
  analytics: null,

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },
  setActiveTab: (activeTab) => set({ activeTab }),
  setConversations: (conversations) => set({ conversations }),
  setActiveConversationId: (activeConversationId) => set({ activeConversationId }),
  setAppointments: (appointments) => set({ appointments }),
  setAnalytics: (analytics) => set({ analytics }),
}));`,

  'frontend/src/components/Layout.tsx': `import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { MessageSquare, Calendar, BarChart3, LogOut, ShieldCheck, Stethoscope } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, activeTab, setActiveTab } = useAppStore();

  return (
    <div className="flex h-screen w-full bg-[#070a12] text-gray-100 overflow-hidden">
      <aside className="w-64 glass-panel border-e border-white/10 flex flex-col justify-between p-4 z-20">
        <div>
          <div className="flex items-center gap-3 px-2 py-4 border-b border-white/5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-black shadow-lg shadow-teal-500/20">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white">{user?.tenant.name || 'کلینیک'}</h1>
              <span className="text-xs text-teal-400 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" /> پنل مدیریت SaaS
              </span>
            </div>
          </div>

          <nav className="mt-6 flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab('inbox')}
              className={\`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all \${
                activeTab === 'inbox' ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }\`}
            >
              <MessageSquare className="w-4 h-4" /> صندوق ورودی یکپارچه
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={\`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all \${
                activeTab === 'calendar' ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }\`}
            >
              <Calendar className="w-4 h-4" /> تقویم و رزرو نوبت
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={\`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all \${
                activeTab === 'analytics' ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }\`}
            >
              <BarChart3 className="w-4 h-4" /> داشبورد مالی و آمار
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-teal-400 text-xs">
              {user?.name.slice(0, 2)}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-200">{user?.name}</span>
              <span className="text-[10px] text-gray-400">{user?.role}</span>
            </div>
          </div>
          <button onClick={logout} className="p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#0a0f1d] to-[#070a12]">
        {children}
      </main>
    </div>
  );
};`,

  'frontend/src/components/InboxView.tsx': `import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Message } from '../types';
import { Send, Instagram, CheckCircle2 } from 'lucide-react';
import { io } from 'socket.io-client';

export const InboxView: React.FC = () => {
  const { token, user, conversations, setConversations, activeConversationId, setActiveConversationId } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  useEffect(() => {
    fetch('http://localhost:5001/api/v1/inbox/conversations', {
      headers: { Authorization: \`Bearer \${token}\` }
    })
      .then(res => res.json())
      .then(data => {
        setConversations(data);
        if (data.length > 0 && !activeConversationId) setActiveConversationId(data[0].id);
      });

    const socket = io('http://localhost:5001');
    if (user?.tenant.id) socket.emit('join_tenant', user.tenant.id);

    socket.on('new_message', (payload: { conversationId: string; message: Message }) => {
      if (payload.conversationId === activeConversationId) {
        setMessages(prev => [...prev, payload.message]);
      }
    });

    return () => { socket.disconnect(); };
  }, [token, activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    fetch(\`http://localhost:5001/api/v1/inbox/conversations/\${activeConversationId}/messages\`, {
      headers: { Authorization: \`Bearer \${token}\` }
    })
      .then(res => res.json())
      .then(data => setMessages(data));
  }, [activeConversationId, token]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConversationId) return;

    const content = inputMessage;
    setInputMessage('');

    const res = await fetch('http://localhost:5001/api/v1/inbox/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
      body: JSON.stringify({ conversationId: activeConversationId, content })
    });

    if (res.ok) {
      const msg = await res.json();
      setMessages(prev => [...prev, msg]);
    }
  };

  const activeConv = conversations.find(c => c.id === activeConversationId);

  return (
    <div className="flex h-full w-full">
      <div className="w-80 border-e border-white/5 flex flex-col bg-slate-900/40">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="font-bold text-sm text-gray-200">پیام‌های ورودی</h2>
          <span className="text-[11px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-mono">{conversations.length} لید</span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => setActiveConversationId(conv.id)}
              className={\`p-3.5 cursor-pointer transition-colors flex items-start gap-3 \${activeConversationId === conv.id ? 'bg-teal-500/10' : 'hover:bg-white/5'}\`}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-teal-400 text-sm">
                  {conv.patient?.fullName ? conv.patient.fullName[0] : conv.externalId[1]}
                </div>
                <div className="absolute -bottom-1 -left-1 p-0.5 bg-[#090d16] rounded-full">
                  <Instagram className="w-3.5 h-3.5 text-pink-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-semibold text-gray-200 truncate">{conv.patient?.fullName || conv.externalId}</h4>
                  <span className="text-[10px] text-gray-400">امروز</span>
                </div>
                <p className="text-[11px] text-gray-400 truncate">{conv.lastMessage || 'بدون پیام'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between bg-[#070a12]">
        {activeConv ? (
          <>
            <div className="p-4 border-b border-white/10 flex items-center justify-between glass-card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs">
                  {activeConv.patient?.fullName ? activeConv.patient.fullName[0] : '@'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-100">{activeConv.patient?.fullName || activeConv.externalId}</h3>
                  <span className="text-[10px] text-teal-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> آنلاین در اینستاگرام دایرکت</span>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={\`flex flex-col \${msg.senderType === 'AGENT' ? 'items-end' : 'items-start'}\`}>
                  <div className={\`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed \${msg.senderType === 'AGENT' ? 'bg-teal-600 text-white rounded-br-none' : 'bg-slate-800 text-gray-200 rounded-bl-none'}\`}>
                    {msg.content}
                  </div>
                  <span className="text-[9px] text-gray-500 mt-1 px-1">{new Date(msg.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 glass-panel flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                placeholder="پاسخ را بنویسید..."
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-gray-100 focus:outline-none focus:border-teal-500"
              />
              <button type="submit" className="px-4 py-2.5 bg-teal-500 text-black font-semibold rounded-xl text-xs flex items-center gap-1.5">
                <span>ارسال</span>
                <Send className="w-3.5 h-3.5 rotate-180" />
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 text-xs">یک گفتگو را انتخاب کنید.</div>
        )}
      </div>
    </div>
  );
};`,

  'frontend/src/components/CalendarView.tsx': `import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Clock, Plus } from 'lucide-react';

export const CalendarView: React.FC = () => {
  const { token, appointments, setAppointments } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [deposit, setDeposit] = useState('500000');
  const [total, setTotal] = useState('2500000');

  const fetchAppointments = () => {
    fetch('http://localhost:5001/api/v1/appointments', {
      headers: { Authorization: \`Bearer \${token}\` }
    })
      .then(res => res.json())
      .then(data => setAppointments(data));
  };

  useEffect(() => { fetchAppointments(); }, [token]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0).toISOString();

    const res = await fetch('http://localhost:5001/api/v1/appointments/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
      body: JSON.stringify({
        patientId: appointments[0]?.patientId || 'temp',
        doctorId: appointments[0]?.doctorId || 'temp',
        startTime: start,
        endTime: end,
        serviceName,
        depositPaid: Number(deposit),
        totalAmount: Number(total)
      })
    });

    if (res.ok) {
      setShowModal(false);
      setServiceName('');
      fetchAppointments();
    }
  };

  return (
    <div className="p-6 h-full flex flex-col gap-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-100">تقویم نوبت‌ها و بیعانه</h2>
          <p className="text-xs text-gray-400 mt-1">مدیریت مراجعین با قفل ضدتداخل Anti-Overbooking</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 rounded-xl bg-teal-500 text-black text-xs font-bold flex items-center gap-2">
          <Plus className="w-4 h-4" /> ثبت نوبت جدید
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {appointments.map(app => (
          <div key={app.id} className="glass-card p-4 rounded-2xl flex flex-col justify-between border-t-2 border-t-teal-500">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded-md font-medium">{app.status}</span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(app.startTime).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h3 className="font-bold text-sm text-gray-100">{app.serviceName}</h3>
              <p className="text-xs text-gray-400 mt-1">بیمار: {app.patient.fullName}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-xs">
              <span className="text-gray-400 text-[11px]">بیعانه پرداخت‌شده:</span>
              <span className="font-mono text-teal-400 font-bold">{app.depositPaid.toLocaleString('fa-IR')} تومان</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-gray-100 mb-4">ثبت نوبت با بیعانه</h3>
            <form onSubmit={handleCreateBooking} className="space-y-4">
              <input
                type="text"
                required
                placeholder="نوع خدمت (مثال: تزریق فیلر)"
                value={serviceName}
                onChange={e => setServiceName(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2.5 bg-teal-500 text-black font-bold text-xs rounded-xl">ثبت نوبت</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 bg-slate-800 text-gray-300 text-xs rounded-xl">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};`,

  'frontend/src/components/AnalyticsView.tsx': `import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DollarSign, Users, Target, Award } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { token, analytics, setAnalytics } = useAppStore();

  useEffect(() => {
    fetch('http://localhost:5001/api/v1/analytics/summary', {
      headers: { Authorization: \`Bearer \${token}\` }
    })
      .then(res => res.json())
      .then(data => setAnalytics(data));
  }, [token]);

  if (!analytics) return <div className="p-6 text-xs text-gray-400">در حال دریافت داده‌های مالی...</div>;

  return (
    <div className="p-6 h-full flex flex-col gap-6 overflow-y-auto">
      <div>
        <h2 className="text-lg font-bold text-gray-100">داشبورد هوش تجاری و سودآوری</h2>
        <p className="text-xs text-gray-400 mt-1">جریان نقدینگی و نرخ تبدیل لیدهای شبکه‌های اجتماعی</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl">
          <span className="text-xs text-gray-400 block mb-2">درآمد ناخالص این ماه</span>
          <div className="text-xl font-bold font-mono text-gray-100">{analytics.grossIncome.toLocaleString('fa-IR')} <span className="text-xs font-sans text-gray-400">تومان</span></div>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <span className="text-xs text-gray-400 block mb-2">بیعانه‌های وصول‌شده</span>
          <div className="text-xl font-bold font-mono text-emerald-400">{analytics.deposits.toLocaleString('fa-IR')} <span className="text-xs font-sans text-gray-400">تومان</span></div>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <span className="text-xs text-gray-400 block mb-2">نرخ تبدیل لید</span>
          <div className="text-xl font-bold font-mono text-indigo-400">{analytics.conversionRate}</div>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <span className="text-xs text-gray-400 block mb-2">کل مراجعین ثبت‌شده</span>
          <div className="text-xl font-bold font-mono text-amber-400">{analytics.patientsCount} نفر</div>
        </div>
      </div>
    </div>
  );
};`,

  'frontend/src/App.tsx': `import React, { useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { Layout } from './components/Layout';
import { InboxView } from './components/InboxView';
import { CalendarView } from './components/CalendarView';
import { AnalyticsView } from './components/AnalyticsView';
import { Stethoscope, KeyRound, Mail } from 'lucide-react';

export const App: React.FC = () => {
  const { token, activeTab, setAuth } = useAppStore();
  const [email, setEmail] = useState('doctor@aria.com');
  const [password, setPassword] = useState('admin1234');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5001/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) setAuth(data.user, data.token);
      else setError(data.error || 'ورود ناموفق');
    } catch {
      setError('ارتباط با سرور برقرار نشد');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#070a12]">
        <div className="glass-panel w-full max-w-sm p-6 rounded-2xl border border-white/10">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="p-3 bg-teal-500/20 text-teal-400 rounded-2xl mb-3"><Stethoscope className="w-8 h-8" /></div>
            <h1 className="text-base font-bold text-gray-100">سامانه مدیریت کلینیک</h1>
            <p className="text-xs text-gray-400 mt-1">ورود به پنل هوشمند</p>
          </div>
          {error && <div className="p-3 mb-4 rounded-xl bg-rose-500/10 text-rose-300 text-xs">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200" required />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200" required />
            <button type="submit" className="w-full py-2.5 bg-teal-500 text-black font-bold text-xs rounded-xl">ورود به داشبورد</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      {activeTab === 'inbox' && <InboxView />}
      {activeTab === 'calendar' && <CalendarView />}
      {activeTab === 'analytics' && <AnalyticsView />}
    </Layout>
  );
};`,

  'frontend/src/main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
};

// تابع ایجاد فولدرها و نوشتن فایل‌ها
console.log('📦 در حال ساخت ساختار فولدرها و فایل‌های پروژه...');
for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(__dirname, 'clinic-saas', filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}
console.log('✅ تمامی فایل‌ها با موفقیت در پوشه clinic-saas ایجاد شدند.');

// فشرده‌سازی خودکار بر اساس سیستم‌عامل
console.log('🗜️ در حال فشرده‌سازی و ایجاد فایل clinic-saas.zip ...');
try {
  if (process.platform === 'win32') {
    execSync('powershell Compress-Archive -Path clinic-saas -DestinationPath clinic-saas.zip -Force');
  } else {
    execSync('zip -r clinic-saas.zip clinic-saas');
  }
  console.log('🎉 فایل زیپ با موفقیت ساخته شد: clinic-saas.zip');
} catch (err) {
  console.log('⚠️ زیپ خودکار انجام نشد، ولی پوشه کامل clinic-saas ایجاد شده و می‌توانید آن را مستقیماً زیپ کنید.');
}
