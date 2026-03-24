import React, { useState, useEffect } from 'react';
import { Bell, Check, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  is_read: number;
  ticket_id?: number | null;
  created_at: string;
}

interface NotificationHubProps {
  onSelectTicket?: (id: number) => void;
}

export default function NotificationHub({ onSelectTicket }: NotificationHubProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, [user?.id]);

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await fetch(`/api/notifications/read-all`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      setNotifications([]);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr.replace(' ', 'T') + 'Z');
      if (isNaN(date.getTime())) return '';
      
      const now = new Date();
      const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diff < 60) return 'Agora';
      if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
      return date.toLocaleDateString();
    } catch (e) {
      return '';
    }
  };
  const unreadCount = notifications.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-sm text-slate-500 hover:text-operarum hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-operarum text-[8px] text-white font-bold items-center justify-center">
              {unreadCount}
            </span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-80 bg-white rounded-sm shadow-2xl border border-slate-200 z-40 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-operarum uppercase tracking-[0.1em] text-xs">Notificações</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[9px] uppercase font-bold text-operarum hover:text-operarum-light tracking-widest"
                  >
                    Limpar Tudo
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        onClick={() => {
                          markAsRead(notification.id);
                          if (notification.ticket_id && onSelectTicket) {
                            onSelectTicket(notification.ticket_id);
                            setIsOpen(false);
                          }
                        }}
                        className={cn(
                          "p-4 hover:bg-slate-50 transition-colors cursor-pointer relative",
                          "bg-emerald-50/20"
                        )}
                      >
                        <div className="flex gap-3">
                          <div className={cn(
                            "mt-1 p-1.5 rounded-sm shrink-0",
                            notification.type === 'info' ? "bg-emerald-100 text-operarum" :
                            notification.type === 'success' ? "bg-green-100 text-green-700" :
                            "bg-orange-100 text-orange-700"
                          )}>
                            {notification.type === 'info' ? <Info size={14} /> :
                             notification.type === 'success' ? <Check size={14} /> :
                             <AlertTriangle size={14} />}
                          </div>
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-bold text-operarum uppercase tracking-tight">{notification.title}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase">{formatTime(notification.created_at)}</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{notification.message}</p>
                          </div>
                        </div>
                        <div className="absolute top-4 right-4 h-1.5 w-1.5 bg-operarum rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center">
                    <Bell className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 font-medium">Sem novas notificações</p>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-slate-100 text-center bg-slate-50/30">
                <button className="text-[10px] font-bold text-slate-400 hover:text-operarum transition-colors uppercase tracking-widest">
                  Ver todo o histórico
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
