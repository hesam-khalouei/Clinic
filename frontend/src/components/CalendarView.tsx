import React, { useState, useEffect } from 'react';
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
      headers: { Authorization: `Bearer ${token}` }
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
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
};