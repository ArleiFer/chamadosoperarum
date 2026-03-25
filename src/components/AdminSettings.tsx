import { useAuth } from '../context/AuthContext';
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Settings, Users, Briefcase, Tags, Plus, Trash2, Edit2, X, Building2, User as UserIcon, UserCog, Mail, Building } from 'lucide-react';
import { cn } from '../lib/utils';

export default function AdminSettings({ isProfileOnly = false }: { isProfileOnly?: boolean }) {
  const { user: currentUser, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'sectors' | 'service-types' | 'companies'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [sectors, setSectors] = useState<{id: number, name: string}[]>([]);
  const [serviceTypes, setServiceTypes] = useState<{id: number, name: string, sector_id?: number, sector_name?: string}[]>([]);
  const [companies, setCompanies] = useState<{id: number, name: string}[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('client');
  const [newUserCompany, setNewUserCompany] = useState('');
  const [newSTSectorId, setNewSTSectorId] = useState<string | number>('');
  const [photoData, setPhotoData] = useState<string | null>(null);

  const resetForm = () => {
    setEditingItemId(null);
    setNewItemName('');
    setNewUserEmail('');
    setNewUserRole('client');
    setNewUserCompany('');
    setNewSTSectorId('');
    setPhotoData(null);
    setIsModalOpen(false);
  };

  const fetchData = async () => {
    const [uRes, secRes, stRes, compRes] = await Promise.all([
      fetch('/api/users'), fetch('/api/sectors'), fetch('/api/service-types'), fetch('/api/companies')
    ]);
    setUsers(await uRes.json());
    setSectors(await secRes.json());
    setServiceTypes(await stRes.json());
    setCompanies(await compRes.json());
  };

  useEffect(() => {
    if (isProfileOnly && currentUser) {
      setUsers([currentUser]);
      setActiveTab('users');
      // No need to fetch sectors/ST/companies if only profile
      return;
    }
    
    // If technician (provider), default to sectors since users is hidden
    if (currentUser?.role === 'provider' && activeTab === 'users' && !isProfileOnly) {
      setActiveTab('sectors');
    }

    fetchData();
  }, [isProfileOnly, currentUser]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingItemId ? 'PUT' : 'POST';
    
    try {
      if (activeTab === 'users') {
        if (!newItemName) return;
        const url = editingItemId ? `/api/users/${editingItemId}` : '/api/users';
        
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: newItemName, 
            email: newUserEmail, 
            role: newUserRole, 
            company: newUserCompany,
            photo_data: photoData
          })
        });

        if (res.ok && isProfileOnly) {
          await refreshUser();
        }

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Falha ao salvar usuário');
        }
      } else {
        if (!newItemName) return;
        const url = editingItemId ? `/api/${activeTab}/${editingItemId}` : `/api/${activeTab}`;
        
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: newItemName,
            ...(activeTab === 'service-types' ? { sector_id: Number(newSTSectorId) } : {})
          })
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Falha ao salvar item');
        }
      }
      
      resetForm();
      await fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      alert(error.message || 'Ocorreu um erro ao salvar as alterações. Por favor, tente novamente.');
    }
  };

  const handleEdit = (item: any) => {
    setEditingItemId(item.id);
    setNewItemName(item.name);
    if (activeTab === 'users') {
      setNewUserEmail(item.email || '');
      setNewUserRole(item.role || 'client');
      setNewUserCompany(item.company || '');
      setPhotoData(item.photo_data || null);
      setIsModalOpen(true);
    } else if (activeTab === 'service-types') {
      setNewSTSectorId(item.sector_id || '');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja remover este item?')) return;
    await fetch(`/api/${activeTab}/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'client': return 'Condômino / Cliente';
      case 'provider': return 'Prestador / Responsável';
      case 'admin': return 'Administrador';
      default: return role;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
    <div>
      <h1 className="text-3xl font-bold text-operarum tracking-[0.1em] flex items-center uppercase">
        {isProfileOnly ? (
          <><UserIcon className="mr-3 h-8 w-8 text-operarum" /> MEU PERFIL</>
        ) : (
          <><Settings className="mr-3 h-8 w-8 text-operarum" /> CADASTROS DO SISTEMA</>
        )}
      </h1>
      <p className="text-slate-500 font-medium mt-1">
        {isProfileOnly ? 'Gerencie suas informações de acesso' : 'Gerencie usuários, setores e parâmetros operacionais'}
      </p>
    </div>
  </div>

  <div className="bg-white shadow-sm rounded-sm border border-slate-200 overflow-hidden">
    {!isProfileOnly && (
      <div className="border-b border-slate-100 bg-slate-50/50 p-3 md:p-6">
        <div className="flex space-x-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          {[
            { id: 'users', label: 'Usuários', icon: Users, roles: ['admin'] },
            { id: 'sectors', label: 'Setores', icon: Briefcase, roles: ['admin', 'provider'] },
            { id: 'service-types', label: 'Serviços', icon: Tags, roles: ['admin', 'provider'] },
            { id: 'companies', label: 'Empresas', icon: Building2, roles: ['admin', 'provider'] }
          ].filter(tab => tab.roles.includes(currentUser?.role || '')).map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); resetForm(); }}
              className={cn(
                "px-6 py-3 rounded-sm font-bold text-xs flex items-center transition-all whitespace-nowrap uppercase tracking-widest",
                activeTab === tab.id 
                  ? 'bg-operarum text-white shadow-md -translate-y-0.5' 
                  : 'text-slate-500 hover:text-operarum hover:bg-slate-100'
              )}
            >
              <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
            </button>
          ))}
        </div>
      </div>
    )}

        <div className="p-8">
          {(!editingItemId || activeTab !== 'users') && !isProfileOnly && (
            <form onSubmit={handleAddItem} className="mb-12 bg-slate-50 p-8 rounded-sm border border-slate-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                 <Plus className="w-32 h-32 text-operarum rotate-12" />
              </div>

              <div className="mb-6 relative">
                <h3 className="text-xl font-bold text-operarum uppercase tracking-[0.1em] flex items-center">
                  Novo(a) {activeTab === 'users' ? 'Usuário' : (activeTab === 'sectors' ? 'Setor' : (activeTab === 'companies' ? 'Empresa' : 'Tipo de Serviço'))}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-end relative">
                <div className={activeTab === 'users' ? "lg:col-span-3" : (activeTab === 'service-types' ? "lg:col-span-5" : "lg:col-span-10")}>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Identificação</label>
                  <input 
                    type="text" 
                    value={newItemName} 
                    onChange={(e) => setNewItemName(e.target.value)} 
                    placeholder="Digite o nome..."
                    className="w-full rounded-sm border-slate-300 shadow-sm focus:border-operarum focus:ring-operarum sm:text-sm p-3.5 border bg-white font-bold transition-all"
                    required
                  />
                </div>
                
                {activeTab === 'users' && (
                  <>
                    <div className="lg:col-span-3">
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">E-mail</label>
                      <input 
                        type="email" 
                        value={newUserEmail} 
                        onChange={(e) => setNewUserEmail(e.target.value)} 
                        placeholder="email@exemplo.com"
                        className="w-full rounded-sm border-slate-300 shadow-sm focus:border-operarum focus:ring-operarum sm:text-sm p-3.5 border font-bold transition-all"
                        required
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Perfil</label>
                      <select 
                        value={newUserRole} 
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full rounded-sm border-slate-300 shadow-sm focus:border-operarum focus:ring-operarum sm:text-sm p-3.5 border bg-white font-bold transition-all uppercase tracking-widest text-[10px]"
                      >
                        <option value="client">Condômino</option>
                        <option value="provider">Prestador</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Empresa</label>
                      <select 
                        value={newUserCompany} 
                        onChange={(e) => setNewUserCompany(e.target.value)}
                        className="w-full rounded-sm border-slate-300 shadow-sm focus:border-operarum focus:ring-operarum sm:text-sm p-3.5 border bg-white font-bold transition-all uppercase tracking-widest text-[10px]"
                      >
                        <option value="">Nenhuma</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'service-types' && (
                  <div className="lg:col-span-5">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Setor Responsável</label>
                    <select 
                      value={newSTSectorId} 
                      onChange={(e) => setNewSTSectorId(e.target.value)}
                      className="w-full rounded-sm border-slate-300 shadow-sm focus:border-operarum focus:ring-operarum sm:text-sm p-3.5 border bg-white font-bold transition-all uppercase tracking-widest text-[10px]"
                      required
                    >
                      <option value="">Selecione um setor...</option>
                      {sectors.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="lg:col-span-2">
                  <button type="submit" className="w-full flex items-center justify-center px-6 py-4 bg-operarum text-white rounded-sm hover:bg-operarum-light transition-all text-xs font-bold shadow-md active:scale-95 uppercase tracking-[0.2em]">
                    <Plus className="mr-2 h-4 w-4" /> ADICIONAR
                  </button>
                </div>
              </div>
            </form>
          )}

          {(isProfileOnly && users.length > 0) ? (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-sm p-8 flex flex-col items-center border border-slate-200">
                <div className="h-20 w-20 bg-white rounded-sm overflow-hidden flex items-center justify-center shadow-md border border-slate-200 mb-4 group relative">
                  {users[0].photo_data ? (
                    <img src={users[0].photo_data} alt={users[0].name} className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-8 w-8 text-operarum" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 className="h-5 w-5 text-white" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-operarum uppercase tracking-[0.1em]">{users[0].name}</h2>
                <p className="text-slate-500 font-bold text-[10px] tracking-widest mt-1 uppercase underline decoration-operarum/20 underline-offset-4">{getRoleLabel(users[0].role)}</p>
                {users[0].company && <p className="text-operarum font-bold text-[10px] mt-2 uppercase tracking-[0.2em]">{users[0].company}</p>}
                
                <button 
                  onClick={() => handleEdit(users[0])}
                  className="mt-6 flex items-center px-6 py-3 bg-white border border-slate-200 text-operarum rounded-sm font-bold text-xs hover:bg-slate-50 transition-all shadow-sm active:scale-95 uppercase tracking-widest"
                >
                  <Edit2 className="mr-2 h-4 w-4" /> EDITAR MEUS DADOS
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide border border-slate-200 rounded-sm shadow-sm">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      {activeTab === 'users' ? 'Usuário' : (activeTab === 'service-types' ? 'Tipo de Serviço' : 'Descrição')}
                    </th>
                    {activeTab === 'service-types' && (
                      <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Setor
                      </th>
                    )}
                    {activeTab === 'users' && (
                      <>
                        <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          Perfil
                        </th>
                        <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          Empresa
                        </th>
                      </>
                    )}
                    <th scope="col" className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-50">
                  {(activeTab === 'users' ? users : (activeTab === 'sectors' ? sectors : (activeTab === 'companies' ? companies : serviceTypes))).map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="text-sm font-bold text-operarum uppercase tracking-tight group-hover:text-operarum-light transition-colors">{item.name}</div>
                        {activeTab === 'users' && <div className="text-xs font-medium text-slate-500">{item.email}</div>}
                      </td>
                      {activeTab === 'users' && (
                        <>
                          <td className="px-8 py-5">
                            <span className={cn("px-4 py-1 inline-flex text-[10px] font-bold uppercase tracking-widest rounded-sm border", 
                              item.role === 'admin' ? 'bg-operarum text-white border-operarum' : 
                              item.role === 'provider' ? 'bg-operarum/10 text-operarum border-operarum/20' : 
                              'bg-emerald-50 text-emerald-600 border-emerald-100'
                            )}>
                              {item.role === 'client' ? 'Condômino' : item.role === 'provider' ? 'Prestador' : 'Admin'}
                            </span>
                          </td>
                          <td className="px-8 py-5 min-w-[200px]">
                            <div className="text-sm font-bold text-slate-700">
                              {item.company || <span className="text-slate-300 font-normal italic">Interno</span>}
                            </div>
                          </td>
                        </>
                      )}
                      {activeTab === 'service-types' && (
                        <td className="px-8 py-5">
                          <span className="px-4 py-1 inline-flex text-[10px] font-bold uppercase tracking-widest rounded-sm bg-slate-100 text-slate-600 border border-slate-200">
                            {item.sector_name || 'Geral'}
                          </span>
                        </td>
                      )}
                      <td className="px-8 py-5 text-right text-sm font-medium">
                        <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => handleEdit(item)} 
                            className="p-2.5 text-operarum hover:text-white hover:bg-operarum rounded-sm transition-all shadow-sm hover:shadow-md"
                          >
                            {activeTab === 'users' ? <UserCog className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)} 
                            className="p-2.5 text-red-500 hover:text-white hover:bg-red-500 rounded-sm transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Profile Edit Modal */}
      {isModalOpen && activeTab === 'users' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-operarum/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-sm shadow-2xl w-full max-w-lg overflow-hidden transform animate-in zoom-in slide-in-from-bottom duration-500">
            <div className="bg-operarum p-8 text-white flex justify-between items-center relative">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <UserCog className="w-24 h-24 text-white" />
              </div>
              <div className="flex items-center relative">
                <div className="bg-white/20 p-3 rounded-sm mr-5 backdrop-blur-md">
                  <UserCog className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-[0.1em] uppercase">Editar Perfil</h2>
                  <p className="text-emerald-100/60 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">Gestão de usuário</p>
                </div>
              </div>
              <button onClick={resetForm} className="p-2 hover:bg-white/10 rounded-full transition-colors relative">
                <X className="h-7 w-7" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-10 space-y-8">
              <div className="flex flex-col items-center">
                <div className="group relative">
                  <div className="h-24 w-24 bg-slate-100 rounded-sm overflow-hidden flex items-center justify-center border-2 border-slate-200 shadow-sm bg-white">
                    {photoData ? (
                      <img src={photoData} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon className="h-10 w-10 text-slate-300" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 cursor-pointer">
                    <div className="bg-operarum p-2 rounded-sm text-white shadow-lg border border-white hover:bg-operarum-light transition-colors">
                      <Plus className="h-4 w-4" />
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setPhotoData(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {photoData && (
                    <button 
                      type="button"
                      onClick={() => setPhotoData(null)}
                      className="absolute top-0 right-0 bg-red-600 p-1.5 rounded-sm text-white shadow-md border border-white hover:bg-red-700 transition-all scale-75"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="mt-4 text-lg font-bold text-operarum uppercase tracking-[0.1em]">{newItemName}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{newUserEmail}</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome de Exibição</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <input 
                      type="text" 
                      value={newItemName} 
                      onChange={(e) => setNewItemName(e.target.value)} 
                      className="w-full pl-12 rounded-sm border-slate-300 focus:border-operarum focus:ring-operarum sm:text-sm p-4 border font-bold transition-all"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">E-mail para Notificações</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <input 
                      type="email" 
                      value={newUserEmail} 
                      onChange={(e) => setNewUserEmail(e.target.value)} 
                      className="w-full pl-12 rounded-sm border-slate-300 focus:border-operarum focus:ring-operarum sm:text-sm p-4 border font-bold transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Perfil de Acesso</label>
                    <select 
                      value={newUserRole} 
                      onChange={(e) => setNewUserRole(e.target.value)}
                      disabled={isProfileOnly && currentUser?.role !== 'admin'}
                      className={cn(
                        "w-full rounded-sm border-slate-300 focus:border-operarum focus:ring-operarum sm:text-sm p-4 border bg-white font-bold transition-all uppercase tracking-widest text-[10px]",
                        isProfileOnly && currentUser?.role !== 'admin' && "bg-slate-50 cursor-not-allowed opacity-60"
                      )}
                    >
                      <option value="client">Condômino</option>
                      <option value="provider">Prestador</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Empresa</label>
                    <select 
                      value={newUserCompany} 
                      onChange={(e) => setNewUserCompany(e.target.value)}
                      disabled={isProfileOnly && currentUser?.role !== 'admin'}
                      className={cn(
                        "w-full rounded-sm border-slate-300 focus:border-operarum focus:ring-operarum sm:text-sm p-4 border bg-white font-bold transition-all uppercase tracking-widest text-[10px]",
                        isProfileOnly && currentUser?.role !== 'admin' && "bg-slate-50 cursor-not-allowed opacity-60"
                      )}
                    >
                      <option value="">Interno</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button type="button" onClick={resetForm} className="flex-1 px-6 py-4 border border-slate-200 text-slate-400 rounded-sm hover:bg-slate-50 transition-all text-xs font-bold active:scale-95 uppercase tracking-widest">
                    DESCARTAR
                  </button>
                  <button type="submit" className="flex-[2] bg-operarum text-white px-6 py-4 rounded-sm hover:bg-operarum-light transition-all text-xs font-black shadow-xl shadow-operarum/20 active:scale-95 uppercase tracking-[0.2em]">
                    SALVAR ALTERAÇÕES
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
