export interface User {
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
}