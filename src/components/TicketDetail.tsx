import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TicketDetail as ITicketDetail, User } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Send, ArrowLeft, Star, X, Camera, Printer, Trash2, CheckCircle, Wrench } from 'lucide-react';
import { cn } from '../lib/utils';

interface TicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

export default function TicketDetail({ ticketId, onBack }: TicketDetailProps) {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<ITicketDetail | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [npsScore, setNpsScore] = useState<number>(0);
  const [providers, setProviders] = useState<User[]>([]);
  const [sectors, setSectors] = useState<{id: number, name: string}[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isReopening, setIsReopening] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNpsModal, setShowNpsModal] = useState(false);
  const [finalReport, setFinalReport] = useState('');
  const [finalPhotos, setFinalPhotos] = useState<string[]>([]);
  const [materials, setMaterials] = useState('');
  const [printMode, setPrintMode] = useState<'os' | 'history'>('os');
  const finalFileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchTicket = () => {
    setLoading(true);
    fetch(`/api/tickets/${ticketId}`)
      .then(res => {
        if (!res.ok) throw new Error('Não foi possível carregar o chamado');
        return res.json();
      })
      .then(data => {
        if (data.error) throw new Error(data.error);
        setTicket(data);
        setMaterials(data.materials || '');
      })
      .catch(err => {
        console.error("Fetch ticket error:", err);
        alert(err.message || "Erro ao carregar chamado.");
        onBack(); // Return to list if error
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTicket();
    if (user?.role === 'admin' || user?.role === 'provider') {
      fetch('/api/users')
        .then(res => res.json())
        .then(data => setProviders(data.filter((u: User) => u.role === 'provider')));
      
      fetch('/api/sectors')
        .then(res => res.json())
        .then(data => setSectors(data));
    }
  }, [ticketId, user]);

  const handleAssign = async (providerId: string) => {
    if (!ticket) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId ? parseInt(providerId) : null }),
      });
      if (!res.ok) throw new Error('Falha ao atribuir técnico');
      await fetchTicket();
    } catch (error: any) {
      alert(error.message || "Erro ao atribuir chamado.");
    }
  };

  const handleSectorChange = async (newSector: string) => {
    if (!ticket) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}/sector`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector: newSector }),
      });
      if (!res.ok) throw new Error('Falha ao alterar setor');
      await fetchTicket();
    } catch (error: any) {
      alert(error.message || "Erro ao alterar setor.");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    
    if (newStatus === 'Finalizado') {
      setIsFinalizing(true);
      return;
    }

    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          provider_id: user?.role === 'provider' ? user.id : undefined
        }),
      });
      if (!res.ok) throw new Error('Falha ao alterar status');
      await fetchTicket();
    } catch (error: any) {
      alert(error.message || "Erro ao atualizar status.");
    }
  };
  
  const handleSaveMaterials = async () => {
    if (!ticket) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}/materials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materials }),
      });
      if (!res.ok) throw new Error('Falha ao salvar lista de materiais');
      alert("Lista de materiais salva com sucesso!");
    } catch (error: any) {
      alert(error.message || "Erro ao salvar materiais.");
    }
  };

  const handleFinalPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFinalPhotos(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleFinalize = async () => {
    if (!ticket || !finalReport.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Aguardando Aprovação',
          provider_id: user?.role === 'provider' ? user.id : undefined,
          final_report: finalReport,
          final_photos: finalPhotos
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao atualizar status');
      }

      setIsFinalizing(false);
      setFinalReport('');
      setFinalPhotos([]);
      await fetchTicket();
    } catch (error: any) {
      console.error("Finalize error:", error);
      alert(error.message || "Erro ao finalizar chamado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (!ticket || !reopenReason.trim()) return;

    await fetch(`/api/tickets/${ticketId}/reopen`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reopen_reason: reopenReason }),
    });
    setIsReopening(false);
    setReopenReason('');
    fetchTicket();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !ticket) return;

    await fetch(`/api/tickets/${ticketId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user?.id,
        message: newMessage,
      }),
    });
    
    setNewMessage('');
    fetchTicket();
  };

  const handleNpsSubmit = async () => {
    if (npsScore === 0) return;
    
    // 1. Submit NPS
    await fetch(`/api/tickets/${ticketId}/nps`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nps_score: npsScore }),
    });

    // 2. Finalize
    await fetch(`/api/tickets/${ticketId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Finalizado' }),
    });

    setShowNpsModal(false);
    fetchTicket();
  };

  const handlePrint = (mode: 'os' | 'history') => {
    setPrintMode(mode);
    // Give react a moment to render the correct printable area before calling window.print()
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDelete = async () => {
    if (!ticket) return;
    if (!window.confirm("Você tem certeza que deseja excluir esta Ordem de Serviço permanentemente? Esta ação não pode ser desfeita.")) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}?userId=${user?.id}&userRole=${user?.role}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao excluir o chamado');
      }

      alert("Chamado excluído com sucesso.");
      onBack(); // Return to list
    } catch (error: any) {
      console.error("Delete error:", error);
      alert(error.message || "Erro ao excluir chamado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseDate = (dateStr: any) => {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'string' && dateStr.includes(' ')) {
      return new Date(dateStr.replace(' ', 'T') + 'Z');
    }
    return new Date(dateStr);
  };

  if (loading || !ticket) return <div className="flex justify-center p-8"><div className="animate-spin rounded-sm h-8 w-8 border-b-2 border-operarum"></div></div>;

  const isClient = user?.role === 'client';
  const isProvider = user?.role === 'provider';
  const isAdmin = user?.role === 'admin';
  const needsNps = isClient && ticket.status === 'Finalizado' && !ticket.nps_score;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <button 
          onClick={onBack}
          className="flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para lista
        </button>
        

        <div className="flex items-center space-x-2">
          {(isAdmin || isProvider) && ticket.status !== 'Finalizado' && (
            <button 
              onClick={() => setIsFinalizing(true)}
              className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all shadow-md active:scale-95 shadow-emerald-200"
            >
              <CheckCircle className="h-4 w-4 mr-2" /> Finalizar Chamado
            </button>
          )}

          {(isAdmin || user?.id === ticket.client_id) && (
            <button 
              onClick={handleDelete}
              disabled={isSubmitting}
              className="flex items-center px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-sm text-sm font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 uppercase tracking-widest"
              title="Excluir OS permanentemente"
            >
              <Trash2 className="h-4 w-4 mr-2" /> 
              {isSubmitting ? 'Excluindo...' : 'Excluir OS'}
            </button>
          )}
          
          <button 
            onClick={() => handlePrint('os')}
            className="flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm text-[10px] font-bold transition-all shadow-sm active:scale-95 uppercase tracking-[0.2em]"
            title="Imprimir Resumo Técnico (OS)"
          >
            <Printer className="h-4 w-4 mr-2" /> Imprimir OS
          </button>

          <button 
            onClick={() => handlePrint('history')}
            className="flex items-center px-4 py-2 bg-operarum/5 hover:bg-operarum/10 text-operarum rounded-sm text-[10px] font-bold transition-all shadow-sm active:scale-95 uppercase tracking-[0.2em]"
            title="Imprimir com Histórico Completo"
          >
            <Printer className="h-4 w-4 mr-2" /> Imprimir Chamado
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-sm border border-slate-200 overflow-hidden print:hidden">
        {/* Header */}
        <div className="border-b border-slate-200 p-6 bg-slate-50">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-operarum uppercase tracking-[0.1em]">
                #{ticket.external_id ? ticket.id : `OP-${ticket.id.toString().padStart(6, '0')}`} - {ticket.title}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Aberto por {ticket.client_name} em {format(parseDate(ticket.created_at), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                {ticket.external_id && (
                  <span className="block text-operarum font-bold text-xs mt-1 uppercase tracking-widest border-l-2 border-operarum pl-2">
                    OS SEEDF Nº {ticket.external_id}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <span className="px-3 py-1 inline-flex text-xs font-bold rounded-sm bg-operarum/10 text-operarum border border-operarum/20 uppercase tracking-widest">
                {ticket.status}
              </span>
              {ticket.status === 'Finalizado' && (
                <button
                  onClick={() => setIsReopening(true)}
                  className="text-[10px] font-bold text-operarum hover:text-operarum-light underline transition-colors uppercase tracking-widest"
                >
                  Reabrir Chamado
                </button>
              )}
              {(isProvider || isAdmin) && ticket.status !== 'Finalizado' && (
                <select 
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="text-xs border-slate-300 rounded-sm shadow-sm focus:ring-operarum focus:border-operarum py-1 uppercase font-bold tracking-wider"
                >
                  <option value="Em Aberto">Em Aberto</option>
                  <option value="Em Atendimento">Em Atendimento</option>
                  <option value="Impedimento">Impedimento</option>
                  <option value="Aguardando Peças">Aguardando Peças</option>
                  <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="block text-slate-500 font-medium">Localização</span>
              <span className="text-slate-900">{ticket.location}</span>
            </div>
            <div>
              <span className="block text-slate-500 font-medium">Empresa</span>
              <span className="text-slate-900">{ticket.company || 'Não informada'}</span>
            </div>
            <div>
              <span className="block text-slate-500 font-medium">Tipo / Setor Vinculado</span>
              <div className="flex flex-col space-y-1">
                <span className="text-slate-900 font-bold">{ticket.type}</span>
                {isAdmin ? (
                  <select
                    value={ticket.sector || ''}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    className="mt-1 block w-full text-xs border-slate-300 rounded-md shadow-sm focus:ring-[#00311c] focus:border-[#00311c] py-1 bg-white font-medium"
                  >
                    <option value="">Sem Setor</option>
                    {sectors.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-slate-500 text-xs italic">{ticket.sector || 'Geral'}</span>
                )}
              </div>
            </div>
            <div>
              <span className="block text-slate-500 font-medium">Prioridade</span>
              <span className="text-slate-900">{ticket.priority}</span>
            </div>
            <div>
              <span className="block text-slate-500 font-medium">Responsável / Setor</span>
              {(isProvider || isAdmin) && ticket.status !== 'Finalizado' ? (
                <select
                  value={ticket.provider_id || ''}
                  onChange={(e) => handleAssign(e.target.value)}
                  className="mt-1 block w-full text-xs border-slate-300 rounded-sm shadow-sm focus:ring-operarum focus:border-operarum py-1 font-bold uppercase tracking-wider"
                >
                  <option value="">Não atribuído</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              ) : (
                <span className="text-slate-900">{ticket.provider_name || 'Não atribuído'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Final Report and Reopen Reason */}
        {(ticket.final_report || ticket.reopen_reason) && (
          <div className="p-6 border-b border-slate-200 bg-emerald-50/30">
            <div className="space-y-4">
              {ticket.final_report && (
                <div>
                  <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Relatório de Encerramento</h3>
                  <p className="text-slate-700 text-sm italic mb-3">"{ticket.final_report}"</p>
                  
                  {ticket.final_photos && ticket.final_photos.length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                      {ticket.final_photos.map((photo, index) => (
                        <button 
                          key={index} 
                          onClick={() => setSelectedPhoto(photo)}
                          className="block aspect-square rounded-sm overflow-hidden border border-emerald-200 hover:opacity-90 transition-opacity"
                        >
                          <img src={photo} alt={`Relatório ${index + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {ticket.reopen_reason && (
                <div>
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Motivo da Reabertura</h3>
                  <p className="text-slate-700 text-sm italic">"{ticket.reopen_reason}"</p>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Materiais e Ferramentas */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center">
              <Wrench className="h-4 w-4 mr-2 text-operarum" />
              Materiais e Ferramentas
            </h3>
            {(isAdmin || isProvider) && (
              <button
                onClick={handleSaveMaterials}
                className="text-[10px] font-black text-white bg-operarum px-3 py-1.5 rounded-sm hover:bg-operarum-light transition-all shadow-sm active:scale-95 uppercase tracking-widest"
              >
                Salvar Lista
              </button>
            )}
          </div>
          
          {(isAdmin || isProvider) ? (
            <textarea
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              placeholder="Liste aqui os materiais, peças ou ferramentas necessárias..."
              rows={4}
              className="w-full rounded-sm border-slate-300 shadow-sm focus:border-operarum focus:ring-operarum text-sm p-4 border bg-white"
            />
          ) : (
            <div className="bg-white p-4 rounded-sm border border-slate-200 min-h-[60px]">
              <p className="text-slate-600 text-sm whitespace-pre-wrap">
                {materials || "Nenhum material ou ferramenta listado até o momento."}
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-sm font-medium text-slate-900 mb-2">Descrição do Problema</h3>
          <div 
            className="text-slate-700 rich-text-content"
            dangerouslySetInnerHTML={{ __html: ticket.description }}
          />
          <style>{`
            .rich-text-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
            .rich-text-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
            .rich-text-content a { color: #2563eb; text-decoration: underline; }
            .rich-text-content img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1rem 0; }
          `}</style>
        </div>

        {ticket.photos && ticket.photos.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-slate-900 mb-3">Fotos Anexadas</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {ticket.photos.map((photo, index) => (
                  <button 
                    key={index} 
                    onClick={() => setSelectedPhoto(photo)}
                    className="block aspect-square rounded-sm overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-operarum focus:ring-offset-2"
                  >
                    <img src={photo} alt={`Anexo ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        
        {/* NPS Section for Client */}
        {isClient && ticket.status === 'Aguardando Aprovação' && (
          <div className="p-8 bg-emerald-50 border-b border-emerald-100 flex flex-col items-center text-center">
            <h3 className="text-2xl font-bold text-operarum mb-2 uppercase tracking-[0.1em]">Validar Encerramento</h3>
            <p className="text-slate-600 font-medium mb-6">O técnico solicitou a finalização deste chamado. Por favor, avalie o atendimento para encerrar.</p>
            <button
              onClick={() => setShowNpsModal(true)}
              className="px-10 py-4 bg-operarum text-white rounded-sm font-bold text-sm shadow-xl shadow-operarum/20 hover:bg-operarum-light transition-all active:scale-95 uppercase tracking-[0.2em]"
            >
              AVALIAR E FINALIZAR
            </button>
          </div>
        )}

        {/* NPS Modal */}
        {showNpsModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-operarum/60 backdrop-blur-sm">
            <div className="bg-white rounded-sm w-full max-w-lg p-10 shadow-2xl animate-in zoom-in duration-300">
              <div className="text-center mb-8">
                <div className="bg-operarum/5 w-20 h-20 rounded-sm flex items-center justify-center mx-auto mb-6 text-operarum">
                  <Star className="h-10 w-10 fill-current" />
                </div>
                <h3 className="text-2xl font-bold text-operarum mb-2 uppercase tracking-[0.1em]">Sua Opinião é Importante</h3>
                <p className="text-slate-500 font-medium">De 0 a 10, qual a probabilidade de você recomendar nosso serviço?</p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mb-10">
                {[...Array(11)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setNpsScore(i)}
                    className={cn(
                      "w-10 h-10 rounded-xl font-bold transition-all border-2",
                      npsScore === i 
                        ? "bg-blue-600 border-blue-600 text-white scale-110 shadow-lg shadow-blue-600/20" 
                        : "bg-slate-50 border-transparent text-slate-400 hover:border-slate-200 hover:text-slate-600"
                    )}
                  >
                    {i}
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowNpsModal(false)}
                  className="flex-1 px-4 py-4 border border-slate-200 text-slate-400 rounded-sm font-bold text-xs hover:bg-slate-50 transition-all uppercase tracking-widest"
                >
                  Voltar
                </button>
                <button
                  onClick={handleNpsSubmit}
                  disabled={npsScore === 0}
                  className="flex-[2] px-4 py-4 bg-operarum text-white rounded-sm font-bold text-xs shadow-xl shadow-operarum/20 hover:bg-operarum-light transition-all disabled:opacity-50 uppercase tracking-[0.2em]"
                >
                  CONFIRMAR ENCERRAMENTO
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Display NPS if already rated */}
        {ticket.nps_score && (
          <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center">
            <span className="text-sm font-medium text-slate-700 mr-2">Avaliação do Cliente:</span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={cn("h-5 w-5", ticket.nps_score! >= star ? "text-amber-400 fill-current" : "text-slate-300")} />
              ))}
            </div>
          </div>
        )}

        {/* Timeline / Chat */}
        <div className="p-6 bg-slate-50">
          <h3 className="text-sm font-medium text-slate-900 mb-4">Interações</h3>
          
          <div className="space-y-4 mb-6">
            {ticket.comments.length === 0 ? (
              <p className="text-sm text-slate-500 italic text-center py-4">Nenhuma interação ainda.</p>
            ) : (
              ticket.comments.map((comment) => {
                const isMe = comment.user_id === user?.id;
                return (
                  <div key={comment.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                    <div className="flex items-baseline space-x-2 mb-1">
                      <span className="text-[10px] font-bold text-operarum uppercase tracking-widest">{comment.user_name}</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-tighter">{format(parseDate(comment.created_at), "HH:mm - dd/MM", { locale: ptBR })}</span>
                    </div>
                    <div className={cn(
                      "px-4 py-2 rounded-sm max-w-[80%] text-sm font-medium",
                      isMe ? "bg-operarum text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                    )}>
                      {comment.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Input */}
          {ticket.status !== 'Finalizado' && (
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite uma mensagem..."
                className="flex-1 rounded-sm border-slate-300 shadow-sm focus:border-operarum focus:ring-operarum sm:text-sm px-4 py-2 border"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="inline-flex items-center justify-center p-2 border border-transparent rounded-sm shadow-sm text-white bg-operarum hover:bg-operarum-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-operarum disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Image Modal (Lightbox) */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setSelectedPhoto(null)}
        >
          <button 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="h-8 w-8" />
          </button>
          
          <div 
            className="max-w-5xl w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={selectedPhoto} 
              alt="Visualização ampliada" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transform animate-in zoom-in duration-300"
            />
          </div>
        </div>
      )}

      {/* Finalize Modal (Report) */}
      {isFinalizing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-operarum/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-sm shadow-2xl p-8 max-w-lg w-full transform animate-in zoom-in duration-300">
            <h2 className="text-xl font-bold text-operarum mb-2 uppercase tracking-[0.1em]">Finalizar Chamado</h2>
            <p className="text-sm text-slate-500 mb-6 underline decoration-operarum/20 underline-offset-4 font-medium">Descreva as ações técnicas realizadas para conclusão.</p>
            
            <textarea
              value={finalReport}
              onChange={(e) => setFinalReport(e.target.value)}
              placeholder="Relatório detalhado das ações tomadas..."
              rows={4}
              className="w-full rounded-sm border-slate-300 shadow-sm focus:border-operarum focus:ring-operarum text-sm mb-6 p-4 border"
              required
            />

            <div className="mb-8">
              <label className="block text-[10px] font-bold text-operarum mb-3 uppercase tracking-widest flex items-center">
                <Camera className="h-4 w-4 mr-2" /> Fotos da Conclusão (Evidências)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {finalPhotos.map((photo, index) => (
                  <div key={index} className="relative w-20 h-20 group">
                    <img src={photo} className="w-20 h-20 object-cover rounded-sm border border-slate-200" alt="" />
                    <button 
                      onClick={() => setFinalPhotos(prev => prev.filter((_, i) => i !== index))}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => finalFileInputRef.current?.click()}
                  className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-sm text-slate-400 hover:border-operarum hover:text-operarum transition-all bg-slate-50"
                  type="button"
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-[9px] mt-1 font-bold uppercase tracking-widest">ADICIONAR</span>
                </button>
              </div>
              <input 
                type="file" 
                ref={finalFileInputRef}
                onChange={handleFinalPhotoUpload}
                accept="image/*"
                multiple
                className="hidden"
              />
            </div>
            
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setIsFinalizing(false)}
                className="px-6 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-sm transition-colors uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalize}
                disabled={!finalReport.trim() || isSubmitting}
                className="px-8 py-2 bg-operarum text-white text-xs font-black rounded-sm hover:bg-operarum-light disabled:opacity-50 transition-all shadow-md active:scale-95 uppercase tracking-[0.2em]"
              >
                {isSubmitting ? 'Enviando...' : 'Confirmar Encerramento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Modal */}
      {isReopening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full transform animate-in zoom-in duration-300">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Reabrir Chamado</h2>
            <p className="text-sm text-slate-500 mb-4">Informe o motivo pelo qual este chamado está sendo reaberto.</p>
            
            <textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Ex: O problema persiste mesmo após a finalização..."
              rows={4}
              className="w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm mb-4 p-3 border"
              required
            />
            
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setIsReopening(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReopen}
                disabled={!reopenReason.trim()}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
              >
                Confirmar Reabertura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Area */}
      <div className="hidden print:block p-8 bg-white text-slate-900 min-h-screen">
        {printMode === 'os' ? (
          /* SECTION: ORDEM DE SERVIÇO (Technical Summary) */
          <>
            <div className="border-b-4 border-slate-900 pb-4 mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter">Ordem de Serviço</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Comprovante de Execução Técnica</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-slate-900 leading-none">
                  OS #{ticket.external_id ? ticket.id : `OP-${ticket.id.toString().padStart(6, '0')}`}
                </p>
                <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-widest">{ticket.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-10">
              <div className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2">Dados do Chamado</h3>
                  <p className="text-xl font-bold leading-tight text-slate-900">{ticket.title}</p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">Aberto em: <span className="text-slate-900 font-bold">{format(parseDate(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></p>
                </div>
                
                <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-300 uppercase">Solicitante</span>
                    <span className="text-sm font-bold text-slate-900">{ticket.client_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-300 uppercase">Empresa</span>
                    <span className="text-sm font-bold text-slate-900">{ticket.company || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6 bg-slate-50 p-6 rounded-2xl">
                <div>
                  <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">Logística</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Local do Serviço</h4>
                      <p className="text-sm font-bold text-slate-900">{ticket.location}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Setor</h4>
                        <p className="text-sm font-bold text-slate-900">{ticket.sector || 'Geral'}</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Prioridade</h4>
                        <p className="text-sm font-bold text-slate-900">{ticket.priority}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Materiais e Ferramentas (Print) */}
            {ticket.materials && (
              <div className="mb-10 border-t-2 border-slate-900 pt-6">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">Materiais e Ferramentas Utilizados</h3>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <p className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">{ticket.materials}</p>
                </div>
              </div>
            )}

            <div className="border-2 border-slate-100 rounded-2xl p-8 mb-10">
              <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">Escopo da Solicitação</h3>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">{ticket.description}</p>
            </div>

            {ticket.final_report && (
              <div className="border-2 border-emerald-100 bg-emerald-50/10 rounded-2xl p-8 mb-10">
                <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.3em] mb-4">Relatório Técnico de Conclusão</h3>
                <p className="text-sm text-slate-800 leading-relaxed font-bold italic">"{ticket.final_report}"</p>
              </div>
            )}

            <div className="mt-32 grid grid-cols-2 gap-20 px-10">
              <div className="text-center">
                <div className="border-t-2 border-slate-900 pt-4">
                  <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest leading-none">Assinatura do Solicitante</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-2 font-mono uppercase">Data: ____/____/____ Hora: ____:____</p>
                </div>
              </div>
              
              <div className="text-center">
                <div className="border-t-2 border-slate-900 pt-4">
                  <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest leading-none">Assinatura do Técnico / Executor</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-2 font-mono uppercase italic">
                    {ticket.provider_name ? ticket.provider_name : '________________________'}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* SECTION: HISTÓRICO DO CHAMADO (Full Timeline) */
          <>
            <div className="border-b-4 border-blue-900 pb-4 mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter text-blue-900">Histórico do Chamado</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Relatório Completo de Interações</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-blue-900 leading-none">#{ticket.id}</p>
                <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-widest">{ticket.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8 mb-8 text-sm">
              <div className="border-l-2 border-blue-100 pl-4">
                <span className="block text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Título</span>
                <span className="font-bold text-slate-900">{ticket.title}</span>
              </div>
              <div className="border-l-2 border-blue-100 pl-4">
                <span className="block text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Solicitante</span>
                <span className="font-bold text-slate-900">{ticket.client_name}</span>
              </div>
              <div className="border-l-2 border-blue-100 pl-4">
                <span className="block text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Data de Abertura</span>
                <span className="font-bold text-slate-900">{format(parseDate(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl mb-8">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Descrição Original</h3>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-[0.3em] mb-2 border-b-2 border-blue-50 pb-2">Linha do Tempo de Interações</h3>
              
              {ticket.comments.map((comment, index) => (
                <div key={comment.id} className="relative pl-8 border-l-2 border-slate-100 pb-6 last:pb-0">
                  {/* Dot */}
                  <div className="absolute left-[-9px] top-1 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-600" />
                  
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-xs font-black text-slate-900 uppercase">{comment.user_name}</span>
                    <span className="text-[10px] font-bold text-slate-400">{format(parseDate(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 shadow-sm leading-relaxed">
                    {comment.message}
                  </div>
                </div>
              ))}

              {ticket.status === 'Finalizado' && ticket.final_report && (
                <div className="relative pl-8 border-l-2 border-emerald-100 pb-6">
                  <div className="absolute left-[-9px] top-1 w-4 h-4 rounded-full bg-emerald-100 border-2 border-emerald-600" />
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-xs font-black text-emerald-900 uppercase underline">ENCERRAMENTO TÉCNICO</span>
                    <span className="text-[10px] font-bold text-slate-400">{ticket.updated_at ? format(parseDate(ticket.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-900 font-bold italic shadow-sm leading-relaxed">
                    {ticket.final_report}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="fixed bottom-10 left-0 right-0 text-center opacity-20">
          <p className="text-[9px] font-black text-slate-900 uppercase tracking-[0.5em]">Operarum • Intelligent Ticketing System</p>
        </div>
      </div>
    </div>
  );
}
