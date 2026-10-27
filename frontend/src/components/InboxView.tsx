import React, { useState, useEffect } from 'react';
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
      headers: { Authorization: `Bearer ${token}` }
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
    fetch(`http://localhost:5001/api/v1/inbox/conversations/${activeConversationId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
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
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
              className={`p-3.5 cursor-pointer transition-colors flex items-start gap-3 ${activeConversationId === conv.id ? 'bg-teal-500/10' : 'hover:bg-white/5'}`}
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
                <div key={msg.id} className={`flex flex-col ${msg.senderType === 'AGENT' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${msg.senderType === 'AGENT' ? 'bg-teal-600 text-white rounded-br-none' : 'bg-slate-800 text-gray-200 rounded-bl-none'}`}>
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
};