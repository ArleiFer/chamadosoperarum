import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, 
  XAxis, YAxis, 
  CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer,
  AreaChart, Area,
  LineChart, Line
} from 'recharts';
import { Download, TrendingUp, Clock, AlertCircle, CheckCircle2, RotateCcw, Activity, Printer, Settings2, Eye, EyeOff, Layout, Settings, X, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

const COLORS = ['#00311c', '#004d2c', '#00663b', '#00804a', '#009959', '#00b368', '#1e293b', '#334155'];
const STATUS_COLORS: Record<string, string> = {
  'Em Aberto': '#ef4444',
  'Em Atendimento': '#f59e0b',
  'Aguardando Peças': '#3b82f6',
  'Aguardando Aprovação': '#00311c',
  'Finalizado': '#10b981',
  'Cancelado': '#94a3b8'
};

interface DashboardData {
  opinionDist: any[];
  resolutionStats: any[];
  backlogData: any[];
  deadlineStats: any[];
  initiationStats: any[];
  customFieldsDist: any[];
  timeDistribution: any[];
  timeStats: any;
  reopens: number;
  openTickets: number;
  slaData: any[];
  opinionTimeline: any[];
  byType: any[];
  byCompany: any[];
}

interface WidgetConfig {
  id: string;
  isVisible: boolean;
  chartType: 'bar' | 'pie' | 'line' | 'area';
  title: string;
  gridSpan: 'col-1' | 'col-2' | 'col-3';
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'summary', title: 'Resumo Geral', isVisible: true, chartType: 'bar', gridSpan: 'col-3' },
  { id: 'backlog', title: 'Histórico de Volume', isVisible: true, chartType: 'area', gridSpan: 'col-2' },
  { id: 'sla_targets', title: 'Metas SLA', isVisible: true, chartType: 'bar', gridSpan: 'col-1' },
  { id: 'resolution', title: 'Status dos Chamados', isVisible: true, chartType: 'pie', gridSpan: 'col-1' },
  { id: 'provider_sla', title: 'Performance por Atendente', isVisible: true, chartType: 'bar', gridSpan: 'col-1' },
  { id: 'nps', title: 'Satisfação do Cliente', isVisible: true, chartType: 'pie', gridSpan: 'col-1' },
  { id: 'weekly', title: 'Demanda por Dia', isVisible: true, chartType: 'line', gridSpan: 'col-1' },
  { id: 'by_type', title: 'Distribuição por Categoria', isVisible: true, chartType: 'bar', gridSpan: 'col-2' },
  { id: 'by_location', title: 'Volume por Localidade', isVisible: true, chartType: 'pie', gridSpan: 'col-1' },
  { id: 'by_company', title: 'Volume por Empresa', isVisible: true, chartType: 'bar', gridSpan: 'col-3' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem('operarum_dashboard_widgets');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });
  const [isCustomizing, setIsCustomizing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const url = user?.role === 'client' ? `/api/dashboard?clientId=${user.id}` : '/api/dashboard';
    fetch(url)
      .then(res => res.json())
      .then(data => setData(data));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('operarum_dashboard_widgets', JSON.stringify(widgets));
  }, [widgets]);

  const toggleWidget = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, isVisible: !w.isVisible } : w));
  };

  const changeChartType = (id: string, type: 'bar' | 'pie' | 'line' | 'area') => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, chartType: type } : w));
  };

  const handlePrint = () => {
    window.print();
  };

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <Activity className="h-12 w-12 text-slate-400 animate-pulse" />
      <span className="text-slate-500 font-medium font-outfit">Sincronizando dados analíticos...</span>
    </div>
  );

  const SummaryCard = ({ title, value, subtext, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-all">
      <div className={`absolute -right-4 -top-4 w-20 h-20 ${color} opacity-[0.03] rounded-full`} />
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
          <h3 className="text-3xl font-black text-slate-900">{value}</h3>
          {subtext && <p className="text-xs text-slate-400 font-medium">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`h-5 w-5 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </div>
  );

  const WidgetContainer = ({ widget, children, className }: any) => {
    if (!widget.isVisible && !isCustomizing) return null;

    return (
      <div className={cn(
        "bg-white p-6 rounded-sm shadow-sm border border-slate-200 relative group transition-all",
        !widget.isVisible && "opacity-40 grayscale",
        widget.gridSpan === 'col-1' ? "lg:col-span-1" : widget.gridSpan === 'col-2' ? "lg:col-span-2" : "lg:col-span-3",
        className
      )}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{widget.title}</h2>
          </div>
          {isCustomizing && (
            <div className="flex gap-2 print:hidden">
              <select 
                value={widget.chartType}
                onChange={(e) => changeChartType(widget.id, e.target.value as any)}
                className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-operarum"
              >
                <option value="bar">Barra</option>
                <option value="pie">Pizza</option>
                <option value="line">Linha</option>
                <option value="area">Área</option>
              </select>
              <button 
                onClick={() => toggleWidget(widget.id)}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  widget.isVisible ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                )}
              >
                {widget.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
        <div className="h-72">
          {children}
        </div>
      </div>
    );
  };

  const renderChart = (widget: WidgetConfig, chartData: any[], valueKey: string = 'value', nameKey: string = 'name') => {
    if (widget.chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={widget.id === 'nps' ? 60 : 70}
              outerRadius={widget.id === 'nps' ? 90 : 100}
              paddingAngle={5}
              dataKey={valueKey}
              nameKey={nameKey}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={widget.id === 'resolution' ? (STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]) : COLORS[index % COLORS.length]} 
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (widget.chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey={nameKey} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
            <Tooltip />
            <Area type="monotone" dataKey="created" stroke="#004d2c" fill="#004d2c" fillOpacity={0.1} />
            <Area type="monotone" dataKey="finished" stroke="#1e293b" fill="#1e293b" fillOpacity={0.1} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (widget.chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey={nameKey} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
            <Tooltip />
            <Line type="monotone" dataKey={valueKey} stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout={widget.gridSpan === 'col-1' ? 'vertical' : 'horizontal'}>
          <CartesianGrid strokeDasharray="3 3" vertical={widget.gridSpan === 'col-1'} horizontal={widget.gridSpan !== 'col-1'} stroke="#f1f5f9" />
          {widget.gridSpan === 'col-1' ? (
            <>
              <XAxis type="number" hide />
              <YAxis dataKey={nameKey} type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} width={100} />
            </>
          ) : (
            <>
              <XAxis dataKey={nameKey} axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
            </>
          )}
          <Tooltip cursor={{fill: '#f8fafc'}} />
          <Bar 
            dataKey={widget.id === 'backlog' ? 'created' : valueKey} 
            fill="#00311c" 
            radius={widget.gridSpan === 'col-1' ? [0, 4, 4, 0] : [4, 4, 0, 0]} 
          />
          {widget.id === 'backlog' && <Bar dataKey="finished" fill="#1e293b" radius={widget.gridSpan === 'col-1' ? [0, 4, 4, 0] : [4, 4, 0, 0]} />}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-operarum tracking-tighter uppercase">Painel de Analíticos</h1>
          <p className="text-slate-500 font-medium">Personalize sua visão e exporte relatórios operacionais.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={cn(
              "flex items-center px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-sm transition-all shadow-sm",
              isCustomizing ? "bg-amber-500 text-white" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            )}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            {isCustomizing ? 'Salvar Visão' : 'Personalizar'}
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-sm hover:bg-slate-50 transition-all shadow-sm text-[11px] font-bold uppercase tracking-widest"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-operarum text-white rounded-sm hover:bg-operarum-light transition-all shadow-md text-[11px] font-bold uppercase tracking-widest"
          >
            <Download className="h-4 w-4 mr-2" />
            Relatório PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Summary (Only if visible) */}
        {widgets.find(w => w.id === 'summary')?.isVisible || isCustomizing ? (
          <div className={cn(
            "lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
            !widgets.find(w => w.id === 'summary')?.isVisible && "opacity-40 grayscale"
          )}>
            {isCustomizing && (
              <div className="absolute top-0 right-0 p-2 z-20">
                <button onClick={() => toggleWidget('summary')} className="p-1 bg-white rounded shadow-md">
                  {widgets.find(w => w.id === 'summary')?.isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
            )}
            <SummaryCard title="Chamados em Aberto" value={data.openTickets} icon={AlertCircle} color="bg-rose-500" />
            <SummaryCard title="Solicitações de Reabertura" value={data.reopens} icon={RotateCcw} color="bg-amber-500" />
            <SummaryCard title="Satisfação Média" value={data.opinionTimeline?.[0]?.value || '0.0'} icon={CheckCircle2} color="bg-emerald-500" />
            <SummaryCard title="Total de Interações" value={data.backlogData.reduce((acc, curr) => acc + curr.created, 0)} icon={Activity} color="bg-blue-500" />
          </div>
        ) : null}

        {/* Charts Grid */}
        <WidgetContainer widget={widgets.find(w => w.id === 'backlog')}>
          {renderChart(widgets.find(w => w.id === 'backlog')!, data.backlogData)}
        </WidgetContainer>

        <WidgetContainer widget={widgets.find(w => w.id === 'sla_targets')}>
          <div className="space-y-8 pt-4">
            {[{ label: 'Deadline Geral', val: data.deadlineStats[0].value }, { label: 'Primeira Resposta', val: data.initiationStats[0].value }].map((s, i) => (
              <div key={i}>
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest mb-2">
                  <span className="text-slate-400">{s.label}</span>
                  <span className="text-slate-900">{s.val}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-operarum transition-all duration-1000" style={{ width: `${s.val}%` }} />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg mt-8">
              <TrendingUp className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Eficiência Operacional</p>
                <p className="text-lg font-bold text-slate-900">Estável</p>
              </div>
            </div>
          </div>
        </WidgetContainer>

        <WidgetContainer widget={widgets.find(w => w.id === 'resolution')}>
          {renderChart(widgets.find(w => w.id === 'resolution')!, data.resolutionStats)}
        </WidgetContainer>

        <WidgetContainer widget={widgets.find(w => w.id === 'provider_sla')}>
          {renderChart(widgets.find(w => w.id === 'provider_sla')!, data.slaData, 'avg_hours')}
        </WidgetContainer>

        <WidgetContainer widget={widgets.find(w => w.id === 'nps')}>
          {renderChart(widgets.find(w => w.id === 'nps')!, data.opinionDist)}
        </WidgetContainer>

        <WidgetContainer widget={widgets.find(w => w.id === 'weekly')}>
          {renderChart(widgets.find(w => w.id === 'weekly')!, data.timeDistribution, 'value')}
        </WidgetContainer>

        <WidgetContainer widget={widgets.find(w => w.id === 'by_type')}>
          {renderChart(widgets.find(w => w.id === 'by_type')!, data.byType)}
        </WidgetContainer>

        <WidgetContainer widget={widgets.find(w => w.id === 'by_location')}>
          {renderChart(widgets.find(w => w.id === 'by_location')!, data.customFieldsDist)}
        </WidgetContainer>

        <WidgetContainer widget={widgets.find(w => w.id === 'by_company')}>
          {renderChart(widgets.find(w => w.id === 'by_company')!, data.byCompany)}
        </WidgetContainer>
      </div>

      {isCustomizing && (
        <div className="fixed bottom-8 right-8 z-50 animate-in zoom-in duration-300 print:hidden">
          <button 
            onClick={() => setIsCustomizing(false)}
            className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-full shadow-2xl hover:bg-emerald-700 transition-all font-bold uppercase tracking-[0.2em] text-xs"
          >
            <Layout className="h-4 w-4" />
            Finalizar Personalização
          </button>
        </div>
      )}
    </div>
  );
}


