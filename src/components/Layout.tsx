import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, LayoutDashboard, Ticket as TicketIcon, 
  PlusCircle, Settings as SettingsIcon, 
  ChevronDown, ChevronRight, Search, Menu,
  Calendar, RotateCcw, Clock, AlertTriangle, 
  Info, CheckCircle, XCircle, Bell, Flame, Zap, Circle, ArrowDown, ShieldAlert,
  Activity, User as UserIcon, FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserButton } from '@clerk/clerk-react';
import NotificationHub from './NotificationHub';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
  onSelectTicket?: (id: number) => void;
}

export default function Layout({ children, currentView, onNavigate, onSelectTicket }: LayoutProps) {
  const { user } = useAuth();
  const [isChamadosOpen, setIsChamadosOpen] = useState(false);
  const [isOperationsOpen, setIsOperationsOpen] = useState(false);
  const [isPrioritiesOpen, setIsPrioritiesOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state

  const navGroups = [
    {
      id: 'chamados',
      label: 'Chamados',
      icon: TicketIcon,
      isOpen: isChamadosOpen,
      toggle: () => setIsChamadosOpen(!isChamadosOpen),
      items: [
        { id: 'tickets:all', label: 'Todos os Chamados', icon: TicketIcon },
        ...(user?.role !== 'client' ? [{ id: 'tickets:seedf', label: 'Chamados SEEDF', icon: FileText }] : []),
        { id: 'tickets:waiting_provider', label: 'Aguardando Atendente', icon: Clock },
        { id: 'tickets:Aguardando Peças', label: 'Aguardando Peças', icon: Clock },
        { id: 'tickets:waiting_approval', label: 'Aguardando Aprovação', icon: AlertTriangle },
        { id: 'tickets:Em Aberto', label: 'Chamados Abertos', icon: Info },
        { id: 'tickets:Finalizado', label: 'Finalizados', icon: CheckCircle },
        { id: 'tickets:Cancelado', label: 'Cancelados', icon: XCircle },
        { id: 'tickets:search', label: 'Busca Avançada', icon: Search },
      ]
    },
    {
      id: 'operations',
      label: 'Operações',
      icon: Activity,
      isOpen: isOperationsOpen,
      toggle: () => setIsOperationsOpen(!isOperationsOpen),
      items: [
        { id: 'tickets:calendar', label: 'Calendário', icon: Calendar },
        { id: 'tickets:recurrent', label: 'Recorrentes', icon: RotateCcw },
        { id: 'tickets:waiting_reopen', label: 'Aguardando Reabertura', icon: Clock },
      ]
    },
    {
      id: 'priorities',
      label: 'Prioridades',
      icon: ShieldAlert,
      isOpen: isPrioritiesOpen,
      toggle: () => setIsPrioritiesOpen(!isPrioritiesOpen),
      items: [
        { id: 'tickets:pending_approval', label: 'Pendentes de Aprovação', icon: Bell },
        { id: 'tickets:priority_Urgent', label: 'Prioridade Urgente', color: 'text-rose-500', icon: Flame, glowColor: 'rgba(244, 63, 94, 0.15)' },
        { id: 'tickets:priority_Alta', label: 'Prioridade Alta', color: 'text-orange-500', icon: Zap },
        { id: 'tickets:priority_Normal', label: 'Prioridade Normal', color: 'text-blue-500', icon: Circle },
        { id: 'tickets:priority_Baixa', label: 'Prioridade Baixa', color: 'text-slate-400', icon: ArrowDown },
      ]
    }
  ];

  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/notifications?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setNotificationCount(data.length);
        }
      } catch (err) {
        console.error("Error fetching notification counts:", err);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 10000);
    return () => clearInterval(interval);
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-outfit">
      {/* Top Navigation */}
      {/* Top Navigation - Operarum Brand Theme */}
      <nav className="bg-operarum text-white shadow-xl sticky top-0 print:hidden z-50">
        <div className="w-full px-6 sm:px-8 lg:px-10">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="mr-6 p-2 md:hidden text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Toggle Menu"
              >
                {isSidebarOpen ? <XCircle className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="flex items-center h-20">
                <img 
                  src="https://res.cloudinary.com/diaf6clsf/image/upload/v1771013135/logooperarum_qlxw5o.jpg" 
                  alt="Operarum Logo" 
                  className="h-full w-auto object-contain" 
                  referrerPolicy="no-referrer" 
                />
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <NotificationHub onSelectTicket={onSelectTicket} />
              </div>
              
              <div className="hidden md:flex flex-col items-end border-l border-slate-800 pl-6 py-1">
                <div className="text-[12px] font-bold text-white leading-tight tracking-[0.1em] uppercase">{user?.name}</div>
                <div className="text-[9px] uppercase font-bold tracking-[0.3em] text-white/50 mt-0.5">
                  {user?.role === 'client' ? 'Portal do Condômino' : user?.role === 'provider' ? 'Gestão Operarum' : 'Master Admin'}
                </div>
              </div>

              <div className="pl-2 border-l border-slate-800 flex items-center">
                {user?.photo_data ? (
                  <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-slate-700 shadow-xl hover:border-blue-500 transition-all cursor-pointer" onClick={() => onNavigate('profile')}>
                    <img src={user.photo_data} alt={user.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <UserButton 
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        userButtonAvatarBox: "w-10 h-10 border-2 border-slate-700 shadow-xl hover:border-blue-500 transition-all",
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col md:flex-row w-full relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <aside className={cn(
          "bg-operarum text-white/70 py-8 px-4 print:hidden shadow-3xl overflow-y-auto scrollbar-hide border-r border-white/5",
          "fixed inset-y-0 left-0 z-50 w-[280px] transition-transform duration-300 transform md:relative md:translate-x-0 md:top-20 md:max-h-[calc(100vh-80px)] md:sticky",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex flex-col h-full min-h-[calc(100vh-160px)] space-y-8">
            {/* Main Control */}
            <div className="px-1 space-y-2">
              <button 
                onClick={() => { onNavigate('dashboard'); setIsSidebarOpen(false); }}
                className={cn(
                  "w-full flex items-center px-4 py-3.5 rounded-sm transition-all duration-300 font-bold text-[11px] uppercase tracking-[0.2em] group relative overflow-hidden",
                  currentView === 'dashboard' 
                    ? "bg-white/10 text-white shadow-lg border border-white/10" 
                    : "hover:bg-white/5 hover:text-white"
                )}
              >
                <LayoutDashboard className={cn("mr-3 h-3.5 w-3.5 transition-transform group-hover:scale-110", currentView === 'dashboard' ? "text-white" : "text-white/40 group-hover:text-white")} />
                Dashboard
              </button>
              <button 
                onClick={() => { onNavigate('new-ticket'); setIsSidebarOpen(false); }}
                className={cn(
                  "w-full flex items-center px-4 py-3.5 rounded-sm transition-all duration-300 font-bold text-[11px] uppercase tracking-[0.2em] group relative overflow-hidden",
                  currentView === 'new-ticket' 
                    ? "bg-white/10 text-white shadow-lg border border-white/10" 
                    : "hover:bg-white/5 hover:text-white"
                )}
              >
                <PlusCircle className={cn("mr-3 h-3.5 w-3.5 transition-transform group-hover:scale-110", currentView === 'new-ticket' ? "text-white" : "text-white/40 group-hover:text-white")} />
                Novo Chamado
              </button>
            </div>

            <div className="h-px bg-slate-800 mx-4" />

            {/* Hierarchical Nav */}
            <nav className="space-y-6">
              {navGroups.map((group, idx) => (
                <div key={idx} className="space-y-2">
                  {group.label && (
                    <button 
                      onClick={group.toggle}
                      className="w-full flex items-center justify-between px-3 py-3 text-sm font-bold transition-all group uppercase tracking-[0.2em] text-[10px] rounded hover:bg-white/5 border-l-2 border-transparent"
                    >
                      <div className="flex items-center">
                        <div className={cn(
                          "p-1.5 rounded-sm mr-2.5 transition-colors",
                          group.isOpen ? "bg-white/10 text-white" : "bg-white/5 text-white/30"
                        )}>
                          {group.icon && <group.icon className="h-3.5 w-3.5" />}
                        </div>
                        <span className={cn(
                          "transition-colors",
                          group.isOpen ? "text-white" : "text-white/40 group-hover:text-white/70"
                        )}>
                          {group.label}
                        </span>
                        {group.id === 'priorities' && notificationCount > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-md animate-pulse">
                            {notificationCount}
                          </span>
                        )}
                      </div>
                      <div className="text-white/20 group-hover:text-white/50 transition-colors">
                        {group.isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </div>
                    </button>
                  )}
                  {(!group.label || group.isOpen) && (
                    <div className={cn("space-y-1", group.label && "mt-2")}>
                      {group.items.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => { onNavigate(item.id); setIsSidebarOpen(false); }}
                          style={item.glowColor && currentView === item.id ? { boxShadow: `0 0 20px ${item.glowColor}` } : {}}
                          className={cn(
                            "w-full flex items-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] rounded-sm transition-all group relative overflow-hidden",
                            currentView === item.id
                              ? "text-white bg-white/10 border border-white/10"
                              : "text-white/50 hover:text-white hover:bg-white/5"
                          )}
                        >
                          {item.icon && (
                            <item.icon 
                              className={cn(
                                "mr-3 h-4 w-4 transition-all",
                                currentView === item.id ? "text-white scale-110" : item.color || "text-white/20 group-hover:text-white/60"
                              )} 
                            />
                          )}
                          <span className={cn(
                            "text-left break-words flex-1",
                            currentView === item.id ? "text-white" : "group-hover:text-slate-100"
                          )}>
                            {item.label}
                          </span>
                          {item.id === 'tickets:pending_approval' && notificationCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-lg shadow-lg">
                              {notificationCount}
                            </span>
                          )}
                          {currentView === item.id && (
                            <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 rounded-full" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {idx < navGroups.length - 1 && <div className="h-px bg-slate-800/50 mx-4 mt-6" />}
                </div>
              ))}
            </nav>

            {/* Bottom Controls */}
            <div className="mt-auto pt-6 space-y-2 border-t border-slate-800">
              <button 
                onClick={() => { onNavigate('profile'); setIsSidebarOpen(false); }}
                className={cn(
                  "w-full flex items-center px-4 py-3.5 rounded-2xl transition-all duration-300 font-bold text-sm group",
                  currentView === 'profile' 
                    ? "bg-slate-700 text-white shadow-xl border border-slate-600" 
                    : "text-slate-500 hover:text-slate-100 hover:bg-slate-800"
                )}
              >
                <UserIcon className={cn("mr-3 h-4 w-4 transition-transform group-hover:scale-110", currentView === 'profile' ? "text-blue-400" : "text-slate-600")} />
                Meu Perfil
              </button>

              {user?.role === 'admin' && (
                <button 
                  onClick={() => { onNavigate('settings'); setIsSidebarOpen(false); }}
                  className={cn(
                    "w-full flex items-center px-4 py-3.5 rounded-2xl transition-all duration-300 font-bold text-sm group",
                    currentView === 'settings' 
                      ? "bg-slate-700 text-white shadow-xl border border-slate-600" 
                      : "text-slate-500 hover:text-slate-100 hover:bg-slate-800"
                  )}
                >
                  <SettingsIcon className={cn("mr-3 h-4 w-4 transition-transform group-hover:rotate-90", currentView === 'settings' ? "text-blue-400" : "text-slate-600")} />
                  Configurações
                </button>
              )}
            </div>
            <div className="mt-8 pt-6 border-t border-slate-800/50 flex flex-col items-center gap-1 opacity-30 hover:opacity-100 transition-opacity pb-4">
              <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                &copy; {new Date().getFullYear()} Operarum - v1.2.0
              </span>
              <a 
                href="https://aftecbsb.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[9px] font-black text-blue-500/80 hover:text-blue-400 tracking-widest uppercase transition-colors flex items-center gap-1"
              >
                Dev: Aftec Brasília <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1"></div>
              </a>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 py-10 overflow-y-auto bg-slate-50 min-h-[calc(100vh-80px)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
