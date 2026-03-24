import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Ticket } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AlertCircle, CheckCircle2, Clock, Wrench, Search, 
  Calendar, RotateCcw, XCircle, Info, Construction,
  Inbox, Filter, SearchX, FileText
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TicketListProps {
  onSelectTicket: (id: number) => void;
  filter?: string;
}

export default function TicketList({ onSelectTicket, filter = 'tickets:all' }: TicketListProps) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (!user) return;
    
    const url = user.role === 'client' ? `/api/tickets?clientId=${user.id}` : '/api/tickets';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          let filtered = data;
          if (user?.role === 'provider') {
            filtered = data.filter((t: Ticket) => t.status === 'Em Aberto' || t.provider_id === user.id);
          }
          setTickets(filtered);
        }
        setLoading(false);
      });
  }, [user]);

  const filteredTickets = useMemo(() => {
    const filtered = tickets.filter(t => {
      // Search Filter
      if (filter === 'tickets:search' && searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.id.toString().includes(query) ||
          t.location.toLowerCase().includes(query) ||
          (t.external_id && t.external_id.toLowerCase().includes(query))
        );
      }

      // SEEDF Filter (Any ticket for SEEDF company OR with external_id)
      if (filter === 'tickets:seedf') {
        return t.external_id || t.company === 'SECRETARIA DE EDUCAÇÃO DO DISTRITO FEDERAL';
      }

      // Basic View Filters
      if (filter === 'tickets:all' || filter === 'tickets:search') return true;
      if (filter === 'tickets:Em Aberto') return t.status === 'Em Aberto';
      if (filter === 'tickets:Finalizado') return t.status === 'Finalizado';
      if (filter === 'tickets:Cancelado') return t.status === 'Cancelado';
      
      // Status Filters
      if (filter === 'tickets:waiting_provider') return t.status === 'Em Aberto' && !t.provider_id;
      if (filter === 'tickets:waiting_approval') return t.status === 'Finalizado' && t.nps_score === null;
      if (filter === 'tickets:waiting_reopen') return false; // Mock
      
      // Priority Filters
      if (filter.startsWith('tickets:priority_')) {
        const priority = filter.replace('tickets:priority_', '');
        // Map Urgent to Crítica and Normal to Média for compatibility
        let targetPriority = priority;
        if (priority === 'Urgent' || priority === 'Critico') targetPriority = 'Crítica';
        if (priority === 'Normal' || priority === 'Media' || priority === 'Normal_') targetPriority = 'Média';
        return t.priority === targetPriority;
      }
      
      // Deadline Filters (Mock logic)
      if (filter === 'tickets:deadline_expired_all') return t.status !== 'Finalizado' && Math.random() > 0.8; 
      if (filter === 'tickets:deadline_expired_open') return t.status === 'Em Aberto' && Math.random() > 0.7;
      
      return true;
    });

    // Sort by external_id if SEEDF filter is active, otherwise by creation date (ID)
    if (filter === 'tickets:seedf') {
      return [...filtered].sort((a, b) => {
        const idA = a.external_id || '';
        const idB = b.external_id || '';
        return idB.localeCompare(idA, undefined, { numeric: true }); // Newest/Highest first
      });
    }

    return filtered;
  }, [tickets, filter, searchQuery]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Em Aberto': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'Em Atendimento': return <Wrench className="h-4 w-4 text-amber-500" />;
      case 'Aguardando Peças': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'Finalizado': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'Cancelado': return <XCircle className="h-4 w-4 text-slate-400" />;
      default: return <Info className="h-4 w-4 text-slate-400" />;
    }
  };

  const parseDate = (dateStr: any) => {
    if (!dateStr) return new Date();
    return new Date(dateStr);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-6 animate-pulse">
      <div className="relative">
        <div className="h-16 w-16 rounded-sm border-4 border-slate-100 border-t-operarum animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Clock className="h-6 w-6 text-operarum/50" />
        </div>
      </div>
      <div className="text-center">
        <span className="text-slate-900 font-black text-lg block">Carregando dados...</span>
        <span className="text-slate-500 text-sm font-medium">Sincronizando com a base Operarum</span>
      </div>
    </div>
  );

  const renderCalendarView = () => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay = monthStart.getDay();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
      <div className="p-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-10 bg-slate-50 p-6 rounded-sm border border-slate-200">
          <h2 className="text-2xl font-bold text-operarum tracking-[0.1em] uppercase flex items-center">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
              className="p-3 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all shadow-sm active:scale-95"
            >
              <Clock className="w-5 h-5 rotate-180" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="btn-operarum !py-2 !px-6 !text-[10px]"
            >
              HOJE
            </button>
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
              className="p-3 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all shadow-sm active:scale-95"
            >
              <Clock className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {weekDays.map(d => (
            <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pb-4">{d}</div>
          ))}
          {days.map((day, idx) => {
            const dateStr = day ? format(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), 'yyyy-MM-dd') : null;
            const dayTickets = tickets.filter(t => (t.created_at as string).startsWith(dateStr || 'none'));
            
            return (
              <div 
                key={idx} 
                className={cn(
                  "min-h-[120px] rounded-sm p-3 border transition-all flex flex-col justify-between group",
                  day ? "bg-white border-slate-200 hover:border-operarum hover:shadow-xl cursor-pointer" : "bg-slate-50/50 border-transparent"
                )}
              >
                {day && (
                  <>
                    <span className={cn("text-lg font-black", day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() ? "text-blue-600" : "text-slate-400")}>{day}</span>
                    <div className="space-y-1.5 overflow-hidden">
                      {dayTickets.slice(0, 3).map(t => (
                        <div 
                          key={t.id}
                          onClick={(e) => { e.stopPropagation(); onSelectTicket(t.id); }} 
                          className="px-2 py-1 rounded-md bg-blue-50 border border-blue-100/50 text-[9px] font-bold text-blue-700 truncate hover:bg-blue-100 transition-colors"
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayTickets.length > 3 && (
                        <div className="text-[9px] font-black text-slate-400 pl-1">+{dayTickets.length - 3} itens</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRecurrenceView = () => {
    // Mock recurrent tasks based on types
    const types = [...new Set(tickets.map(t => t.type))];
    return (
      <div className="p-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {types.map((type, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-sm p-8 hover:shadow-xl transition-all group border-b-4 border-b-operarum">
               <div className="bg-operarum/5 w-14 h-14 rounded-sm flex items-center justify-center shadow-sm mb-6 text-operarum">
                 <RotateCcw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-700" />
               </div>
               <h3 className="text-xl font-bold text-operarum tracking-[0.1em] uppercase mb-2">{type}</h3>
               <p className="text-slate-500 text-sm font-medium mb-6">Manutenção preventiva programada periodicamente para este setor.</p>
               <div className="flex items-center justify-between pt-4 border-t border-slate-200/50">
                 <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Próxima: 15 Out</span>
                 <button className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest">VER PLANO</button>
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEmptyState = () => {
    let icon = <Inbox className="h-12 w-12" />;
    let title = "Nenhum chamado aqui";
    let description = "Não encontramos registros para este filtro no momento.";
    let showAction = true;

    if (filter.includes('calendar')) {
      return renderCalendarView();
    } else if (filter.includes('search')) {
      if (!searchQuery) {
        icon = <Search className="h-12 w-12" />;
        title = "Inicie sua Busca";
        description = "Digite o ID, título ou local para localizar o chamado.";
        showAction = false;
      } else {
        icon = <SearchX className="h-12 w-12" />;
        title = "Nada Encontrado";
        description = `Não localizamos registros para "${searchQuery}".`;
      }
    } else if (filter.includes('recurrent')) {
      return renderRecurrenceView();
    } else if (filter.includes('expired')) {
      icon = <AlertCircle className="h-12 w-12 text-red-400" />;
      title = "Sem Atrasos Detectados";
      description = "Excelente! Não há chamados com deadline vencido nesta categoria.";
      showAction = false;
    } else if (filter.includes('waiting') || filter.includes('pending')) {
      icon = <Clock className="h-12 w-12 text-blue-400" />;
      title = "Fila em Dia";
      description = "Não há solicitações aguardando ação neste momento.";
      showAction = false;
    } else if (filter.includes('initiation')) {
      icon = <Construction className="h-12 w-12 text-slate-400" />;
      title = "Fluxo de Inicialização";
      description = "Os chamados que requerem inicialização técnica aparecerão aqui.";
      showAction = false;
    }

    return (
      <div className="p-24 text-center animate-in fade-in zoom-in duration-700">
        <div className="bg-operarum/5 w-28 h-28 rounded-sm flex items-center justify-center mx-auto mb-10 text-operarum/20 shadow-inner relative group-hover:scale-105 transition-transform">
          <div className="absolute inset-0 bg-operarum/5 rounded-sm animate-pulse"></div>
          <div className="relative">
            {icon}
          </div>
        </div>
        <h3 className="text-operarum text-3xl font-bold mb-4 tracking-[0.1em] uppercase">{title}</h3>
        <p className="text-slate-500 text-lg font-medium max-w-md mx-auto leading-relaxed">{description}</p>
        
        {showAction && (
          <button className="mt-10 btn-operarum flex items-center gap-3 mx-auto">
            <RotateCcw className="h-4 w-4" /> RECARREGAR DASHBOARD
          </button>
        )}
      </div>
    );
  };

  const getHeaderInfo = () => {
    const parts = filter.split(':');
    let label = parts.pop()?.replace(/_/g, ' ') || 'Chamados';
    
    let icon = <Filter className="mr-3 h-8 w-8 text-operarum" />;
    let sub = "Gestão de ordens de serviço e solicitações";

    if (filter.includes('priority_Urgent')) icon = <AlertCircle className="mr-3 h-8 w-8 text-red-600" />;
    if (filter.includes('priority_Alta')) icon = <AlertCircle className="mr-3 h-8 w-8 text-orange-600" />;
    if (filter.includes('calendar')) icon = <Calendar className="mr-3 h-8 w-8 text-operarum" />;
    if (filter.includes('search')) icon = <Search className="mr-3 h-8 w-8 text-operarum" />;
    if (filter === 'tickets:Finalizado') icon = <CheckCircle2 className="mr-3 h-8 w-8 text-emerald-600" />;
    
    if (filter === 'tickets:seedf') {
      icon = <FileText className="mr-3 h-8 w-8 text-operarum" />;
      label = "Chamados SEEDF";
      sub = "Ordens de serviço exclusivas do sistema SEEDF";
    }

    return { label, sub, icon };
  };

  const header = getHeaderInfo();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <div className="bg-white p-4 rounded-sm shadow-xl border border-slate-200 mr-5">
            {header.icon}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-operarum tracking-[0.1em] uppercase">
              {header.label}
            </h1>
            <p className="text-slate-500 font-medium mt-0.5">{header.sub}</p>
          </div>
        </div>
        
        {filter === 'tickets:search' ? (
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-operarum" />
            <input 
              type="text"
              placeholder="Pesquisar por ID, título, local..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-sm border-slate-200 focus:border-operarum focus:ring-operarum font-bold transition-all shadow-sm border"
            />
          </div>
        ) : (
          <div className="bg-operarum/5 px-6 py-3 rounded-sm border border-operarum/10 hidden md:block">
            <span className="text-operarum font-bold text-sm uppercase tracking-widest">{filteredTickets.length} Registros</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-sm border border-slate-200 shadow-sm overflow-hidden">
        {filteredTickets.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-24">ID</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Solicitação</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status Operacional</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Última Atualização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTickets.map((ticket) => (
                  <tr 
                    key={ticket.id}
                    onClick={() => onSelectTicket(ticket.id)}
                    className="group hover:bg-operarum/[0.02] cursor-pointer transition-all border-l-4 border-l-transparent hover:border-l-operarum"
                  >
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-sm font-mono text-xs font-bold w-fit">
                          #{ticket.external_id ? ticket.id : `OP-${ticket.id.toString().padStart(6, '0')}`}
                        </span>
                        {ticket.external_id && (
                          <span className="text-[10px] font-bold text-operarum uppercase tracking-widest shrink-0">OS SEEDF: {ticket.external_id}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-bold text-base group-hover:text-operarum transition-colors leading-tight uppercase tracking-tight">{ticket.title}</span>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-operarum font-bold text-[10px] uppercase tracking-wider bg-operarum/5 px-2 py-0.5 rounded-sm">{ticket.type}</span>
                          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">•</span>
                          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{ticket.location}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center">
                        <div className={cn(
                          "px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-[0.1em] flex items-center gap-2.5 border shadow-sm",
                          ticket.status === 'Em Aberto' ? "bg-red-50 text-red-600 border-red-100 shadow-red-100/50" :
                          ticket.status === 'Em Atendimento' ? "bg-amber-50 text-amber-600 border-amber-100 shadow-amber-100/50" :
                          ticket.status === 'Aguardando Peças' ? "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-100/50" :
                          ticket.status === 'Finalizado' ? "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100/50" :
                          "bg-slate-50 text-slate-600 border-slate-100 shadow-slate-100/50"
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full animate-pulse",
                            ticket.status === 'Em Aberto' ? "bg-red-600" :
                            ticket.status === 'Em Atendimento' ? "bg-amber-600" :
                            ticket.status === 'Aguardando Peças' ? "bg-blue-600" :
                            ticket.status === 'Finalizado' ? "bg-emerald-600" :
                            "bg-slate-600"
                          )} />
                          {ticket.status}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center text-slate-500 font-bold text-xs">
                        <Clock className="h-3.5 w-3.5 mr-2 opacity-40" />
                        {format(parseDate(ticket.created_at), "dd MMM yyyy", { locale: ptBR })}
                        <span className="mx-2 opacity-20">|</span>
                        {format(parseDate(ticket.created_at), "HH:mm", { locale: ptBR })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
