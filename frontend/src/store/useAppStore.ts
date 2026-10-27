import { create } from 'zustand';
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
}));