import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Wrench, ShieldCheck, ArrowRight, Activity, Globe, Scale } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-outfit relative overflow-hidden bg-slate-950">
      {/* Background with Image and Immersive Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="file:///C:/Users/Usuário/.gemini/antigravity/brain/2613fa25-5471-4f8b-9a51-07f2fb9ec7ab/background_engineering_maintenance_1773972311062.png" 
          alt="Operarum Engineering" 
          className="w-full h-full object-cover opacity-60 grayscale-[0.2]"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-operarum/95 via-operarum/80 to-slate-950/90 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/4" />

      <div className="w-full max-w-[480px] bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] p-8 sm:p-12 z-10 animate-in fade-in zoom-in slide-in-from-bottom-8 duration-1000">
        <div className="flex flex-col items-center mb-12 text-center">
          <div className="relative group">
            <div className="absolute -inset-4 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all duration-700 opacity-50" />
            <img 
              src="https://res.cloudinary.com/diaf6clsf/image/upload/v1771013135/logooperarum_qlxw5o.jpg" 
              alt="Operarum Logo" 
              className="h-24 w-auto object-contain relative rounded-xl" 
              referrerPolicy="no-referrer" 
            />
          </div>
          <div className="mt-8 space-y-2">
            <h1 className="text-white text-2xl font-black uppercase tracking-[0.3em] leading-tight">Painel de Acesso</h1>
            <p className="text-emerald-500/60 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2">
              <Activity className="h-3 w-3" />
              Gestão Predial & Engenharia
            </p>
          </div>
        </div>

        {/* Action Grid */}
        <div className="space-y-4">
          <button 
            onClick={() => navigate('/cliente')}
            className="w-full group relative flex items-center p-1 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-blue-500/20 hover:from-emerald-500/40 hover:to-blue-500/40 transition-all duration-500 active:scale-[0.98]"
          >
            <div className="flex-1 bg-slate-900/40 hover:bg-slate-900/20 backdrop-blur-xs rounded-[14px] p-5 flex items-center justify-between transition-colors border border-white/5">
              <div className="flex items-center gap-5">
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                  <Building2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-left">
                  <span className="block text-white font-black uppercase tracking-[0.2em] text-[11px]">Canal do Cliente</span>
                  <span className="block text-white/40 text-[9px] font-bold uppercase tracking-widest mt-0.5">Gestão de Chamados</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          <button 
            onClick={() => navigate('/prestador')}
            className="w-full group relative flex items-center p-1 rounded-2xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 hover:from-blue-500/40 hover:to-indigo-500/40 transition-all duration-500 active:scale-[0.98]"
          >
            <div className="flex-1 bg-slate-900/40 hover:bg-slate-900/20 backdrop-blur-xs rounded-[14px] p-5 flex items-center justify-between transition-colors border border-white/5">
              <div className="flex items-center gap-5">
                <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                  <Wrench className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-left">
                  <span className="block text-white font-black uppercase tracking-[0.2em] text-[11px]">Portal Técnico</span>
                  <span className="block text-white/40 text-[9px] font-bold uppercase tracking-widest mt-0.5">Execução & Relatórios</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          <button 
            onClick={() => navigate('/admin')}
            className="w-full group relative flex items-center p-1 rounded-2xl bg-gradient-to-r from-slate-500/20 to-slate-400/20 hover:from-slate-500/30 hover:to-slate-400/30 transition-all duration-500 active:scale-[0.98]"
          >
            <div className="flex-1 bg-slate-900/40 hover:bg-slate-900/20 backdrop-blur-xs rounded-[14px] p-5 flex items-center justify-between transition-colors border border-white/5">
              <div className="flex items-center gap-5">
                <div className="bg-slate-500/10 p-3 rounded-xl border border-slate-500/20 group-hover:scale-110 transition-transform duration-500">
                  <ShieldCheck className="w-6 h-6 text-slate-300" />
                </div>
                <div className="text-left">
                  <span className="block text-white font-black uppercase tracking-[0.2em] text-[11px]">Supervisor Admin</span>
                  <span className="block text-white/40 text-[9px] font-bold uppercase tracking-widest mt-0.5">Governança & Controle</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>

        {/* Footer Area */}
        <div className="mt-12 flex flex-col gap-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full" />
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] text-white/30 font-black uppercase tracking-[0.3em]">
            <div className="flex gap-4">
              <a href="#" className="hover:text-emerald-500 transition-colors flex items-center gap-1.5"><Globe className="h-3 w-3" /> Compliance</a>
              <a href="#" className="hover:text-emerald-500 transition-colors flex items-center gap-1.5"><Scale className="h-3 w-3" /> Termos</a>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SISTEMA OPERACIONAL ATIVO
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-12 left-0 right-0 flex flex-col items-center gap-3 z-10 pointer-events-none">
        <div className="text-white/20 text-[10px] font-black tracking-[0.5em] uppercase">
          &copy; {new Date().getFullYear()} Operarum Engenharia
        </div>
        <div className="text-white/10 text-[8px] font-bold tracking-[0.4em] uppercase">
          Engenharia de Performance & Facilities
        </div>
      </div>
    </div>
  );
}
