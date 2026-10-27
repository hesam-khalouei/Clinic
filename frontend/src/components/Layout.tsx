import React from 'react';
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
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'inbox' ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> صندوق ورودی یکپارچه
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'calendar' ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Calendar className="w-4 h-4" /> تقویم و رزرو نوبت
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'analytics' ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
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
};