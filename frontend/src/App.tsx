import React, { useState } from 'react';
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
};