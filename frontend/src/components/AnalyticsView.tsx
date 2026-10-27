import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DollarSign, Users, Target, Award } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { token, analytics, setAnalytics } = useAppStore();

  useEffect(() => {
    fetch('http://localhost:5001/api/v1/analytics/summary', {
      headers: { Authorization: `Bearer ${token}` }
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
};