import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Camera, X, UploadCloud, CheckCircle2, Phone, User as UserIcon, Clock, Edit2, FileText, Search } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure PDF.js worker using Vite's ?url import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import { User } from '../types';
import { cn } from '../lib/utils';
import RichTextEditor from './RichTextEditor';

interface NewTicketProps {
  onSuccess: () => void;
}

export default function NewTicket({ onSuccess }: NewTicketProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [serviceTypes, setServiceTypes] = useState<{id: number, name: string, sector_name?: string}[]>([]);
  const [sectors, setSectors] = useState<{id: number, name: string}[]>([]);
  const [companies, setCompanies] = useState<{id: number, name: string}[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [providers, setProviders] = useState<User[]>([]);
  const [filteredServiceTypes, setFilteredServiceTypes] = useState<{id: number, name: string}[]>([]);

  const [localPredio, setLocalPredio] = useState('Torre A');
  const [andar, setAndar] = useState('');
  const [complemento, setComplemento] = useState('');
  const [flow, setFlow] = useState<'general' | 'seedf'>('general');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Média',
    type: '',
    sector: '',
    company: '',
    client_id: user?.id || '',
    provider_id: '',
    requestor_name: user?.name || '',
    phone: '',
    sub_type: '',
    preferred_time: 'Qualquer Horário',
    external_id: '',
    id: undefined as string | undefined,
  });

  const [customSector, setCustomSector] = useState('');
  const [customType, setCustomType] = useState('');
  const [customCompany, setCustomCompany] = useState('');

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState({ protocol: '', sla: '' });
  const [photos, setPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/service-types').then(res => res.json()),
      fetch('/api/sectors').then(res => res.json()),
      fetch('/api/companies').then(res => res.json()),
      (user?.role === 'admin' || user?.role === 'provider') ? fetch('/api/users').then(res => res.json()) : Promise.resolve([])
    ]).then(([stRes, secRes, compRes, uRes]) => {
      setSectors(secRes);
      setCompanies(compRes);
      
      if (user?.role === 'admin' || user?.role === 'provider') {
        const clientsList = uRes.filter((u: User) => u.role === 'client');
        setClients(clientsList);
        const providersList = uRes.filter((u: User) => u.role === 'provider' || u.role === 'admin');
        setProviders(providersList);
      }
      
      // Map sector names to service types for filtering
      const mappedServiceTypes = stRes.map((stRes: any) => ({
        id: stRes.id,
        name: stRes.name,
        sector_id: stRes.sector_id,
        sector_name: secRes.find((s: any) => s.id === stRes.sector_id)?.name || 'Desconhecido'
      }));
      setServiceTypes(mappedServiceTypes);

      setFormData(prev => ({
        ...prev,
        type: '',
        sector: '',
        company: user?.company || '',
        requestor_name: user?.name || '',
        client_id: user?.id || ''
      }));
      setFetching(false);
    });
  }, [user]);

  // Filtra tipos de serviço baseado no setor selecionado
  useEffect(() => {
    if (formData.sector) {
      if (formData.sector === 'Outros') {
        setFilteredServiceTypes([]);
      } else {
        const filtered = serviceTypes.filter(st => st.sector_name === formData.sector);
        setFilteredServiceTypes(filtered);
      }
    } else {
      setFilteredServiceTypes([]);
    }
  }, [formData.sector, serviceTypes]);

  useEffect(() => {
    if (localPredio.startsWith('Garagem') || localPredio === 'Praça de Alimentação') {
      setAndar('Não aplicável');
    }
  }, [localPredio]);

  // Limpa campos específicos ao trocar de fluxo para evitar duplicidade ou dados residuais
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      external_id: '',
      id: undefined
    }));
  }, [flow]);

  const handleSeedfPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + ' ';
      }

      if (!fullText.trim()) {
        throw new Error("Não foi possível extrair texto deste PDF. O arquivo pode ser uma imagem digitalizada.");
      }

      console.log("Extracted Text:", fullText);

      // SEEDF Specific Parsing Logic (More Robust)
      const extracted: any = {};
      
      // OS Number (More robust, looking for 10 digits as seen in screenshot)
      const osMatch = fullText.match(/OS\s*N[º|o\.\s]*(\d{8,12})/i) || fullText.match(/(\d{10})/);
      if (osMatch) extracted.external_id = osMatch[1];
      
      // Requester (Header)
      const reqMatch = fullText.match(/Requerente\s*([A-ZÀ-Ú\s]+?)(?=Telefone|Endereço|E-mail|$)/i);
      if (reqMatch) extracted.requestor_name = reqMatch[1].trim();
      
      // Phone (Header)
      const phoneMatch = fullText.match(/Telefone\s*([\(\)\d\s\-\/]+)/i);
      if (phoneMatch) extracted.phone = phoneMatch[1].trim();

      // Title
      const titleMatch = fullText.match(/Título\s*([^\n|]+?)(?=Técnico|Data|Item relacionado|$)/i);
      if (titleMatch) extracted.title = titleMatch[1].trim();

      // Description (From Item relacionado section)
      // Look for "Descrição" or "Dados do formulário" and capture until "Solução", "Assinaturas" or "Anexo"
      let descMatch = fullText.match(/(?:Descrição|Dados do formulário)\s*([\s\S]+?)(?=Solução|Assinaturas|Anexo|$)/i);
      
      // Broad fallback for description if specific anchors fail
      if (!descMatch) {
        descMatch = fullText.match(/Item relacionado\s+Nome\s+Descrição\s+([\s\S]+?)(?=Solução|Assinaturas|Anexo|$)/i);
      }
      
      if (descMatch) {
        let descText = descMatch[1].trim();
        // If we matched "Dados do formulário" via the first group, prepend it if it was part of the match
        if (fullText.includes("Dados do formulário") && !descText.includes("Dados do formulário")) {
          descText = "Dados do formulário " + descText;
        }
        
        // Clean up common PDF formatting artifacts
        descText = descText.replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#62;/g, '>');
        extracted.description = descText;

        // Fallback: Extract requester and phone from description if not found in header
        if (!extracted.requestor_name) {
          const reqFromDesc = descText.match(/Nome Completo\s*:\s*([A-ZÀ-Ú\s]+?)(?=\d\)|$)/i);
          if (reqFromDesc) extracted.requestor_name = reqFromDesc[1].trim();
        }
        if (!extracted.phone) {
          const phoneFromDesc = descText.match(/Telefone Para Contato\s*:\s*([\d\s\-\(\)]+)(?=\d\)|$)/i);
          if (phoneFromDesc) extracted.phone = phoneFromDesc[1].trim();
        }
      }

      // Company/Client
      if (fullText.includes('SECRETARIA DE ESTADO DE EDUCAÇÃO') || fullText.includes('SEEDF') || fullText.includes('EDUCA df') || fullText.includes('Brasília - DF')) {
        extracted.company = 'SECRETARIA DE EDUCAÇÃO DO DISTRITO FEDERAL';
      }

      const hasExtractedData = Object.keys(extracted).length > 0;
      if (!hasExtractedData) {
        throw new Error("Não foi possível encontrar os dados padrão da SEEDF neste PDF.");
      }

      setFormData(prev => ({
        ...prev,
        ...extracted,
        external_id: extracted.external_id || prev.external_id,
        id: extracted.external_id || prev.id,
        company: 'SECRETARIA DE EDUCAÇÃO DO DISTRITO FEDERAL',
        sector: (extracted.title?.toUpperCase().includes('AR-CONDICIONADO') || (extracted.description && extracted.description.toUpperCase().includes('AR CONDICIONADO'))) ? 'Manutenção' : prev.sector,
        type: (extracted.title?.toUpperCase().includes('AR-CONDICIONADO') || (extracted.description && extracted.description.toUpperCase().includes('AR CONDICIONADO'))) ? 'Ar Condicionado' : prev.type,
      }));

      // Location logic from title
      if (extracted.title) {
        if (extracted.title.toUpperCase().includes('SHOPPING ID')) setLocalPredio('Torre A');
        const andarMatch = extracted.title.match(/(\d+)º\s*andar/i);
        if (andarMatch) setAndar(`${andarMatch[1]}º Andar`);
        const salaMatch = extracted.title.match(/SALA\s+([A-Z0-9\/]+)/i);
        if (salaMatch) setComplemento(`Sala ${salaMatch[1]}`);
      }

      alert("Dados da SEEDF importados com sucesso!");

    } catch (error: any) {
      console.error("PDF Parsing error:", error);
      alert(`Erro ao ler o PDF: ${error.message || 'Erro desconhecido'}. Certifique-se de que é um arquivo original da SEEDF.`);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const getSLA = (prio: string) => {
      switch (prio) {
        case 'Crítica': return '4 horas úteis';
        case 'Alta': return '8 horas úteis';
        case 'Média': return '24 horas úteis';
        case 'Baixa': return '48 horas úteis';
        default: return 'A definir';
      }
    };

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          type: formData.type === 'Outros' ? customType : formData.type,
          sector: formData.sector === 'Outros' ? customSector : formData.sector,
          company: formData.company === 'Outros' ? customCompany : formData.company,
          location: [localPredio, andar, complemento].filter(val => val && val !== 'Não aplicável').join(' - '),
          client_id: (user?.role === 'admin' || user?.role === 'provider') ? Number(formData.client_id) : user?.id,
          provider_id: formData.provider_id ? Number(formData.provider_id) : null,
          requestor_name: formData.requestor_name,
          phone: formData.phone,
          sub_type: formData.sub_type || '',
          preferred_time: formData.preferred_time,
          photos: photos,
          // Only send ID and External ID if we are in the SEEDF flow and have a value
          ...(flow === 'seedf' && formData.external_id ? {
            id: formData.external_id,
            external_id: formData.external_id
          } : {})
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          const formattedProtocol = flow === 'seedf' 
            ? data.id.toString() 
            : `OP-${data.id.toString().padStart(6, '0')}`;
            
          setSuccessData({
            protocol: formattedProtocol,
            sla: getSLA(formData.priority)
          });
          setShowSuccessModal(true);
        } else {
          throw new Error('O servidor não retornou o protocolo do chamado.');
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao registrar chamado. Por favor, tente novamente.');
      }
    } catch (error: any) {
      console.error('Failed to create ticket', error);
      alert(error.message || 'Ocorreu um erro ao registrar o chamado. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'client_id' && (user?.role === 'admin' || user?.role === 'provider')) {
      const selectedClient = clients.find(c => c.id === Number(value));
      if (selectedClient && selectedClient.company) {
        setFormData({ ...formData, client_id: value, company: selectedClient.company });
        return;
      }
    }
    
    if (name === 'sector') {
      setFormData({ ...formData, sector: value, type: '' });
      return;
    }
    
    setFormData({ ...formData, [name]: value });
  };

  const handleDescriptionChange = (content: string) => {
    setFormData(prev => ({ ...prev, description: content }));
  };

  if (fetching) {
    return <div className="p-8 text-center text-slate-500">Carregando formulário...</div>;
  }

  return (
    <>
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col space-y-4 mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-operarum uppercase tracking-[0.1em]">Abertura de Chamado</h1>
          </div>
          
          {user?.role !== 'client' && (
            <div className="flex p-1 bg-slate-100 rounded-sm w-full md:w-fit">
              <button
                onClick={() => setFlow('general')}
                className={cn(
                  "flex-1 md:flex-none px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all rounded-sm",
                  flow === 'general' 
                    ? "bg-white text-operarum shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Chamado Geral
              </button>
              <button
                onClick={() => setFlow('seedf')}
                className={cn(
                  "flex-1 md:flex-none px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all rounded-sm",
                  flow === 'seedf' 
                    ? "bg-operarum text-white shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Chamado SEEDF (PDF)
              </button>
            </div>
          )}

          {flow === 'seedf' && (user?.role === 'provider' || user?.role === 'admin') && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="flex items-center justify-center w-full px-4 py-8 bg-operarum/5 border-2 border-dashed border-operarum/20 rounded-sm text-[12px] font-bold uppercase tracking-[0.2em] cursor-pointer hover:bg-operarum/10 transition-all group">
                <FileText className="h-6 w-6 mr-3 text-operarum group-hover:scale-110 transition-transform" />
                <span className="text-operarum">Importar PDF da SEEDF para Preenchimento Automático</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="application/pdf"
                  onChange={handleSeedfPdfUpload}
                  disabled={loading}
                />
              </label>
            </div>
          )}
        </div>
        
        <div className="bg-white shadow-sm rounded-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {flow === 'seedf' && (
                <div>
                  <label htmlFor="external_id" className="block text-sm font-semibold text-slate-700 mb-1">OS Nº (SEEDF/Externo)</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      name="external_id"
                      id="external_id"
                      value={formData.external_id}
                      onChange={handleChange}
                      className="block w-full pl-10 rounded-sm border-slate-300 focus:border-operarum focus:ring-operarum sm:text-sm p-3 border transition-all font-mono text-operarum uppercase font-bold"
                      placeholder="Ex: 2512300036"
                    />
                  </div>
                </div>
              )}
              <div className="lg:col-span-1">
                <label htmlFor="requestor_name" className="block text-sm font-medium text-slate-700">Nome do Solicitante</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    name="requestor_name"
                    id="requestor_name"
                    required
                    value={formData.requestor_name}
                    onChange={handleChange}
                    className="block w-full pl-10 rounded-sm border-slate-300 focus:border-operarum focus:ring-operarum sm:text-sm p-3 border transition-all"
                    placeholder="Nome completo"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-1">Telefone / Ramal</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    name="phone"
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="block w-full pl-10 rounded-sm border-slate-300 focus:border-operarum focus:ring-operarum sm:text-sm p-3 border transition-all"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-1">Título do Problema</label>
              <input
                type="text"
                name="title"
                id="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="mt-1 block w-full rounded-sm border-slate-300 shadow-sm focus:border-operarum focus:ring-operarum sm:text-sm p-3 border transition-all"
                placeholder="Ex: Vazamento no teto"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="localPredio" className="block text-sm font-semibold text-slate-700 mb-1">Torre / Local</label>
                <select
                  id="localPredio"
                  value={localPredio}
                  onChange={(e) => setLocalPredio(e.target.value)}
                  className="mt-1 block w-full rounded-sm border-slate-300 shadow-sm focus:border-operarum focus:ring-operarum sm:text-sm p-3 border bg-white transition-all"
                >
                  <option value="Torre A">Torre A</option>
                  <option value="Torre B">Torre B</option>
                  <option value="Torre C">Torre C</option>
                  <option value="Garagem G1">Garagem G1</option>
                  <option value="Garagem G2">Garagem G2</option>
                  <option value="Garagem G3">Garagem G3</option>
                  <option value="Garagem G4">Garagem G4</option>
                  <option value="Praça de Alimentação">Praça de Alimentação</option>
                </select>
              </div>

              <div>
                <label htmlFor="andar" className="block text-sm font-semibold text-slate-700 mb-1">Andar / Nível</label>
                <select
                  id="andar"
                  value={andar}
                  onChange={(e) => setAndar(e.target.value)}
                  className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm p-3 border bg-white transition-all"
                >
                  <option value="">Não aplicável</option>
                  <option value="Térreo">Térreo</option>
                  <option value="Sobreloja">Sobreloja</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={`${i+1}º Andar`}>{i+1}º Andar</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="complemento" className="block text-sm font-semibold text-slate-700 mb-1">Sala/Loja (Opcional)</label>
                <input
                  type="text"
                  id="complemento"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm p-3 border transition-all"
                  placeholder="Ex: Sala 42"
                />
                <p className="mt-1 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ex: Próximo à copa ou ao lado do elevador</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label htmlFor="sector" className="block text-sm font-semibold text-slate-700 mb-1">Setor</label>
                <select
                  name="sector"
                  id="sector"
                  required
                  value={formData.sector}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm p-3 border bg-white transition-all"
                >
                  <option value="">Selecione um setor...</option>
                  {sectors.map(sec => (
                    <option key={sec.id} value={sec.name}>{sec.name}</option>
                  ))}
                  <option value="Outros">Outros (Especificar...)</option>
                </select>
                {formData.sector === 'Outros' && (
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Edit2 className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Qual o setor?"
                      value={customSector}
                      onChange={(e) => setCustomSector(e.target.value)}
                      className="block w-full pl-10 rounded-xl border-slate-300 focus:border-blue-600 focus:ring-blue-600 sm:text-sm p-3 border transition-all"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Serviço</label>
                <select
                  name="type"
                  id="type"
                  required
                  disabled={!formData.sector}
                  value={formData.type}
                  onChange={handleChange}
                  className={cn(
                    "mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm p-3 border bg-white transition-all",
                    !formData.sector && "bg-slate-50 cursor-not-allowed text-slate-400"
                  )}
                >
                  {!formData.sector ? (
                    <option value="">Aguardando Setor...</option>
                  ) : (
                    <>
                      <option value="">Escolha o serviço...</option>
                      {filteredServiceTypes.map(st => (
                        <option key={st.id} value={st.name}>{st.name}</option>
                      ))}
                      <option value="Outros">Outros (Especificar...)</option>
                    </>
                  )}
                </select>
                {formData.type === 'Outros' && (
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Edit2 className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Qual o serviço?"
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      className="block w-full pl-10 rounded-xl border-slate-300 focus:border-blue-600 focus:ring-blue-600 sm:text-sm p-3 border transition-all"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-semibold text-slate-700 mb-1">Empresa / Órgão</label>
                <select
                  name="company"
                  id="company"
                  required
                  value={formData.company}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm p-3 border bg-white transition-all"
                >
                  <option value="">Selecione a empresa...</option>
                  {companies.map(comp => (
                    <option key={comp.id} value={comp.name}>{comp.name}</option>
                  ))}
                  <option value="Outros">Outros (Especificar...)</option>
                </select>
                {formData.company === 'Outros' && (
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Edit2 className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Qual a empresa?"
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                      className="block w-full pl-10 rounded-xl border-slate-300 focus:border-blue-600 focus:ring-blue-600 sm:text-sm p-3 border transition-all"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-semibold text-slate-700 mb-1">Prioridade</label>
                <select
                  name="priority"
                  id="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className={cn(
                    "mt-1 block w-full rounded-xl shadow-sm focus:ring-blue-500/20 sm:text-sm p-3 border bg-white font-bold transition-all",
                    formData.priority === 'Crítica' ? 'border-red-200 text-red-600 bg-red-50' :
                    formData.priority === 'Alta' ? 'border-orange-200 text-orange-600 bg-orange-50' :
                    'border-slate-300 text-slate-700'
                  )}
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                  <option value="Crítica">Crítica</option>
                </select>
              </div>

              {formData.type === 'Elétrica' && (
                <div>
                  <label htmlFor="sub_type" className="block text-sm font-semibold text-slate-700 mb-1">O que aconteceu?</label>
                  <select
                    name="sub_type"
                    id="sub_type"
                    required
                    value={formData.sub_type}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm p-3 border bg-white transition-all"
                  >
                    <option value="">Selecione...</option>
                    <option value="Lâmpada Queimada">Lâmpada Queimada</option>
                    <option value="Tomada sem Energia">Tomada sem Energia</option>
                    <option value="Curto-circuito">Curto-circuito</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="preferred_time" className="block text-sm font-semibold text-slate-700 mb-1">Melhor Horário</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="h-4 w-4 text-slate-400" />
                  </div>
                  <select
                    name="preferred_time"
                    id="preferred_time"
                    value={formData.preferred_time}
                    onChange={handleChange}
                    className="block w-full pl-10 rounded-xl border-slate-300 focus:border-blue-600 focus:ring-blue-600 sm:text-sm p-3 border bg-white transition-all"
                  >
                    <option value="Qualquer Horário">Qualquer Horário</option>
                    <option value="Manhã (08h - 12h)">Manhã (08h - 12h)</option>
                    <option value="Tarde (13h - 18h)">Tarde (13h - 18h)</option>
                  </select>
                </div>
              </div>
              
              {(user?.role === 'admin' || user?.role === 'provider') && (
                <>
                  <div className="md:col-span-2 lg:col-span-1">
                    <label htmlFor="client_id" className="block text-sm font-semibold text-slate-700 mb-1">Abrir em nome do Cliente</label>
                    <select
                      name="client_id"
                      id="client_id"
                      value={formData.client_id}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm p-3 border bg-white transition-all"
                    >
                      <option value={user?.id}>Mim mesmo</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2 lg:col-span-2">
                    <label htmlFor="provider_id" className="block text-sm font-semibold text-slate-700 mb-1">Atribuir para (Opcional)</label>
                    <select
                      name="provider_id"
                      id="provider_id"
                      value={formData.provider_id}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm p-3 border bg-white transition-all font-semibold text-blue-600"
                    >
                      <option value="">Aguardando Atribuição</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.role === 'admin' ? 'Admin' : 'Técnico'})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição Detalhada</label>
                <RichTextEditor 
                  value={formData.description}
                  onChange={handleDescriptionChange}
                  placeholder="Descreva o problema com o máximo de detalhes possível..."
                />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Fotos do Problema (Opcional)</label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200">
                    <img src={photo} alt={`Anexo ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-600 hover:bg-blue-50 transition-all text-slate-500 hover:text-blue-600 group"
                >
                  <Camera className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Adicionar Foto</span>
                </button>
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                multiple
                className="hidden"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="btn-operarum w-full md:w-auto"
              >
                {loading ? 'Processando...' : 'Registrar Chamado'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-operarum/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-sm shadow-2xl p-6 sm:p-10 max-w-sm w-full text-center transform animate-in zoom-in slide-in-from-bottom duration-500">
            <div className="w-24 h-24 bg-operarum/5 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <CheckCircle2 className="h-12 w-12 text-operarum" />
            </div>
            <h2 className="text-3xl font-bold text-operarum mb-3 tracking-tight uppercase">Sucesso!</h2>
            <p className="text-slate-500 mb-8 leading-relaxed font-medium">Seu chamado foi registrado com sucesso em nossa central.</p>
            
            <div className="bg-slate-50 rounded-sm p-8 mb-10 space-y-6 text-center shadow-inner border border-slate-100">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-operarum font-bold mb-2">Número do Protocolo</p>
                <p className="text-3xl font-mono font-bold text-operarum tracking-wider">#{successData.protocol}</p>
              </div>
              <div className="h-px bg-slate-200 w-1/2 mx-auto"></div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-2">Prazo Estimado (SLA)</p>
                <p className="text-xl font-bold text-slate-700">{successData.sla}</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setShowSuccessModal(false);
                onSuccess();
              }}
              className="btn-operarum w-full"
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </>
  );
}
