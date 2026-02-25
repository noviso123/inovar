
import React, { useState, useEffect } from 'react';
import { User, Equipment, Priority, RequestStatus, ServiceRequest, UserRole } from '@/shared/types';
import { apiService } from '@/shared/services/apiService';
import { SLA_HOURS } from '@/shared/constants';
import {
  formatPhone, formatDocument, formatCEP,
  EQUIPMENT_BRANDS, EQUIPMENT_MODELS, BTU_OPTIONS, COMMON_LOCATIONS, COMMON_PROBLEMS,
  filterSuggestions, getModelsForBrand
} from '@/shared/utils/formUtils';

export const RequestFlow: React.FC<{ currentUser: User, onComplete: (r: ServiceRequest) => void, onCancel: () => void }> = ({ currentUser, onComplete, onCancel }) => {
  const isCliente = currentUser.role === UserRole.CLIENTE;
  const [step, setStep] = useState(isCliente ? 2 : 1);
  const [selectedClient, setSelectedClient] = useState<string>(currentUser.id);
  const [clientName, setClientName] = useState<string>(currentUser.name);
  const [selectedEquipments, setSelectedEquipments] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>(Priority.MEDIA);
  const [serviceType, setServiceType] = useState<string>('');
  const [description, setDescription] = useState('');

  // Data state
  const [clients, setClients] = useState<any[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);

  // New Equipment Modal State
  const [isAddingEquip, setIsAddingEquip] = useState(false);
  const [newEquip, setNewEquip] = useState<Partial<Equipment>>({ brand: '', model: '', btu: 9000, location: '', serialNumber: '' });
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  // Problem Suggestions State
  const [showProblemSuggestions, setShowProblemSuggestions] = useState(false);

  const handleSelectSuggestion = (e: React.MouseEvent, sug: string) => {
    e.preventDefault();
    setDescription(sug);

    // Auto-fill service type based on problem
    if (!serviceType) {
        const lower = sug.toLowerCase();
        if (lower.includes('instalação')) setServiceType('Instalação');
        else if (lower.includes('limpeza') || lower.includes('preventiva') || lower.includes('higienização')) setServiceType('Manutenção Preventiva');
        else setServiceType('Manutenção Corretiva');
    }

    setShowProblemSuggestions(false);
  };

  // New Client Modal State
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: ''
  });
  const [cnpjLoading, setCnpjLoading] = useState(false);

  // Load clients if not client role
  useEffect(() => {
    if (!isCliente) {
      setLoading(true);
      apiService.getClients().then(data => {
        setClients(data);
        setLoading(false);
      });
    }
  }, [isCliente]);

  // Handle quick client creation
  const handleCNPJSearchForQuickClient = async () => {
    const doc = (newClient.document || '').replace(/\D/g, '');
    if (doc.length !== 14) return;

    try {
        setCnpjLoading(true);
        const data = await apiService.lookupCNPJ(doc);

        setNewClient(prev => ({
            ...prev,
            name: data.razao_social || data.nome_fantasia || prev.name,
            email: (!prev.email && data.email) ? data.email : (prev.email || ''),
            phone: (!prev.phone && data.ddd_telefone_1) ? data.ddd_telefone_1 : (prev.phone || ''),
            zipCode: data.cep?.replace(/\D/g, '') || prev.zipCode,
            street: data.logradouro || prev.street,
            number: data.numero || prev.number,
            complement: data.complemento || prev.complement,
            district: data.bairro || prev.district,
            city: data.municipio || prev.city,
            state: data.uf || prev.state
        }));

        alert('Dados da empresa encontrados!');
    } catch (err: any) {
        console.error('CNPJ lookup failed:', err);
        alert('Erro ao buscar CNPJ: ' + (err.message || 'Empresa não encontrada'));
    } finally {
        setCnpjLoading(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name) return;

    try {
      const created = await apiService.createClient({
        name: newClient.name,
        email: newClient.email || `${Date.now()}@sistema.local`,
        phone: newClient.phone,
        document: newClient.document,
        endereco: {
          zipCode: newClient.zipCode,
          street: newClient.street,
          number: newClient.number,
          complement: newClient.complement,
          district: newClient.district,
          city: newClient.city,
          state: newClient.state
        }
      });
      setClients(prev => [...prev, created]);
      setSelectedClient(created.id);
      setClientName(created.name);
      setIsAddingClient(false);
      setNewClient({
        name: '', email: '', phone: '', document: '',
        zipCode: '', street: '', number: '', complement: '', district: '', city: '', state: ''
      });
      setStep(2); // Advance to equipment selection
    } catch (err: any) {
      console.error("Failed to create client", err);
      // Detailed error message from API
      const errorMsg = err.message || 'Erro inesperado ao criar cliente';
      alert(`⚠️ Falha no Cadastro:\n${errorMsg}`);
    }
  };

  // Load equipments when client changes
  useEffect(() => {
    if (selectedClient) {
      setLoading(true);
      apiService.getEquipments(selectedClient).then(data => {
        setEquipments(data);
        setLoading(false);
        // Clear selection if switching clients
        setSelectedEquipments([]);
      });
    }
  }, [selectedClient]);

  // AI Priority Detection
  useEffect(() => {
    const text = description.toUpperCase();
    if (text.includes('URGENTE') || text.includes('PAROU') || text.includes('VAZAMENTO') || text.includes('ESTOUROU')) {
      setPriority(Priority.EMERGENCIAL);
    } else if (text.includes('LIMPEZA') || text.includes('PREVENTIVA')) {
      setPriority(Priority.BAIXA);
    } else {
        setPriority(Priority.MEDIA);
    }
  }, [description]);

  const handleFinish = () => {
    const newRequest: ServiceRequest = {
        id: '', // Backend genereted
        clientId: selectedClient,
        clientName: clientName,
        equipmentIds: selectedEquipments,
        status: RequestStatus.ABERTA,
        priority: priority,
        serviceType: serviceType,
        description: description,
        createdAt: '', // Backend generated
        slaLimit: '', // Backend generated
    };
    onComplete(newRequest);
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
        const payload = {
            clientId: selectedClient,
            brand: newEquip.brand,
            model: newEquip.model,
            btu: newEquip.btu,
            location: newEquip.location,
            serialNumber: newEquip.serialNumber,
            active: true
        };
        const created = await apiService.createEquipment(payload);
        setEquipments(prev => [...prev, created]);
        setSelectedEquipments(prev => [...prev, created.id]); // Auto-select
        setIsAddingEquip(false);
        setNewEquip({ brand: '', model: '', btu: 9000, location: '', serialNumber: '' });
    } catch (err) {
        console.error("Failed to create equipment", err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-[3.5rem] p-8 shadow-2xl border border-slate-50 animate-in zoom-in duration-500 text-left relative">
        {/* Back Button Header */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
          <button
            onClick={onCancel}
            className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-black text-slate-800">Criar Chamado</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nova Solicitação de Serviço</p>
          </div>
        </div>

        {/* Modal Novo Equipamento */}
        {isAddingEquip && (
            <div className="absolute inset-0 bg-white/95 z-50 rounded-[3.5rem] p-8 flex flex-col animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-800">Novo Equipamento Rápido</h3>
                    <button onClick={() => setIsAddingEquip(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">✕</button>
                </div>
                <form onSubmit={handleAddEquipment} className="space-y-4 flex-1 overflow-y-auto">
                    {/* Brand with Suggestions */}
                    <div className="relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marca</label>
                        <input
                            required
                            className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold"
                            value={newEquip.brand}
                            onChange={e => setNewEquip({...newEquip, brand: e.target.value, model: ''})}
                            onFocus={() => setShowBrandSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowBrandSuggestions(false), 200)}
                            placeholder="Digite ou selecione..."
                        />
                        {showBrandSuggestions && (
                            <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-lg border border-slate-100 max-h-48 overflow-y-auto">
                                {filterSuggestions(newEquip.brand || '', EQUIPMENT_BRANDS).map(brand => (
                                    <button
                                        key={brand}
                                        type="button"
                                        className="w-full p-3 text-left hover:bg-blue-50 font-bold text-sm first:rounded-t-xl last:rounded-b-xl"
                                        onClick={() => { setNewEquip({...newEquip, brand, model: ''}); setShowBrandSuggestions(false); }}
                                    >
                                        {brand}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Model with Suggestions */}
                    <div className="relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo</label>
                        <input
                            required
                            className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold"
                            value={newEquip.model}
                            onChange={e => setNewEquip({...newEquip, model: e.target.value})}
                            onFocus={() => setShowModelSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowModelSuggestions(false), 200)}
                            placeholder="Digite ou selecione..."
                        />
                        {showModelSuggestions && getModelsForBrand(newEquip.brand || '').length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-lg border border-slate-100 max-h-48 overflow-y-auto">
                                {getModelsForBrand(newEquip.brand || '').map(model => (
                                    <button
                                        key={model}
                                        type="button"
                                        className="w-full p-3 text-left hover:bg-blue-50 font-bold text-sm first:rounded-t-xl last:rounded-b-xl"
                                        onClick={() => { setNewEquip({...newEquip, model}); setShowModelSuggestions(false); }}
                                    >
                                        {model}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BTU</label>
                            <select className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold" value={newEquip.btu} onChange={e => setNewEquip({...newEquip, btu: Number(e.target.value)})}>
                                {BTU_OPTIONS.map(v => <option key={v} value={v}>{v.toLocaleString()}</option>)}
                            </select>
                        </div>
                        {/* Location with Quick-Pick */}
                        <div className="relative">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Local</label>
                            <input
                                required
                                className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold"
                                value={newEquip.location}
                                onChange={e => setNewEquip({...newEquip, location: e.target.value})}
                                onFocus={() => setShowLocationSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                                placeholder="Sala, Quarto..."
                            />
                            {showLocationSuggestions && (
                                <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-lg border border-slate-100 max-h-48 overflow-y-auto">
                                    {filterSuggestions(newEquip.location || '', COMMON_LOCATIONS).map(loc => (
                                        <button
                                            key={loc}
                                            type="button"
                                            className="w-full p-3 text-left hover:bg-blue-50 font-bold text-sm first:rounded-t-xl last:rounded-b-xl"
                                            onClick={() => { setNewEquip({...newEquip, location: loc}); setShowLocationSuggestions(false); }}
                                        >
                                            {loc}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Número de Série (Opcional)</label>
                        <input className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold" value={newEquip.serialNumber} onChange={e => setNewEquip({...newEquip, serialNumber: e.target.value})} placeholder="SN123456789" />
                    </div>
                    <button className="w-full py-4 bg-emerald-500 text-white font-black rounded-xl uppercase tracking-widest text-xs mt-4">Salvar e Selecionar</button>
                </form>
            </div>
        )}

      <div className="flex items-center justify-between mb-8">
        <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Nova OS</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isCliente ? currentUser.name : clientName}</p>
        </div>
        <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-1 rounded-full uppercase tracking-widest">Passo {step} de 3</div>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Selecione o Cliente Final</p>
            <button onClick={() => setIsAddingClient(true)} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:bg-emerald-50 px-3 py-1 rounded-lg transition-colors">+ Novo Cliente</button>
          </div>
          <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2 scrollbar-hide">
            {loading ? <p className="text-center text-slate-400 py-10">Carregando...</p> :
             clients.length === 0 ? (
               <div className="text-center py-10 bg-slate-50 rounded-3xl cursor-pointer hover:bg-slate-100" onClick={() => setIsAddingClient(true)}>
                 <p className="text-slate-400 font-bold">Nenhum cliente cadastrado.</p>
                 <p className="text-emerald-500 font-black text-xs uppercase tracking-widest mt-2 underline">Cadastrar Agora</p>
               </div>
             ) : clients.map(c => (
              <button key={c.id} onClick={() => { setSelectedClient(c.id); setClientName(c.name); setStep(2); }}
                className="p-6 bg-slate-50 border-2 border-transparent hover:border-blue-600 rounded-3xl text-left transition-all">
                <p className="font-black text-slate-800 text-lg">{c.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{c.phone || c.email}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Client Registration Modal */}
      {isAddingClient && (
        <div className="absolute inset-0 bg-white/95 z-50 rounded-[3.5rem] p-8 flex flex-col animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-800">Cadastro Rápido de Cliente</h3>
            <button onClick={() => setIsAddingClient(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">✕</button>
          </div>
          <form onSubmit={handleAddClient} className="space-y-4 flex-1 overflow-y-auto">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome Completo *</label>
              <input required className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} placeholder="João da Silva" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone / WhatsApp</label>
              <input
                className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold"
                value={formatPhone(newClient.phone)}
                onChange={e => setNewClient({...newClient, phone: e.target.value.replace(/\D/g, '').slice(0, 11)})}
                placeholder="(11) 99999-9999"
                maxLength={16}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</label>
              <input type="email" className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPF/CNPJ</label>
              <input
                className="w-full p-4 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold font-mono"
                value={formatDocument(newClient.document)}
                onChange={e => setNewClient({...newClient, document: e.target.value.replace(/\D/g, '').slice(0, 14)})}
                placeholder="000.000.000-00"
                maxLength={18}
              />
               {newClient.document && newClient.document.replace(/\D/g, '').length === 14 && (
                  <button
                      type="button"
                      onClick={handleCNPJSearchForQuickClient}
                      disabled={cnpjLoading}
                      className="mt-2 w-full py-2 bg-cyan-100 text-cyan-700 font-black rounded-xl uppercase tracking-widest text-[10px] hover:bg-cyan-200 transition-colors"
                  >
                      {cnpjLoading ? 'Buscando...' : 'Buscar Dados do CNPJ'}
                  </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pb-2 border-t border-slate-100 pt-4">
              <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço Completo</div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CEP</label>
                <input
                  className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold text-xs font-mono"
                  value={formatCEP(newClient.zipCode)}
                  onChange={async (e) => {
                    const cep = e.target.value.replace(/\D/g, '').slice(0, 8);
                    setNewClient(prev => ({ ...prev, zipCode: cep }));

                    if (cep.length === 8) {
                      try {
                        const addr = await apiService.searchCEP(cep);
                        setNewClient(prev => ({
                          ...prev,
                          street: addr.logradouro,
                          district: addr.bairro,
                          city: addr.localidade,
                          state: addr.uf,
                          zipCode: cep
                        }));
                      } catch(err) { console.error(err); }
                    }
                  }}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Número</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold text-xs" value={newClient.number} onChange={e => setNewClient({...newClient, number: e.target.value})} placeholder="123" />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rua</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold text-xs" value={newClient.street} onChange={e => setNewClient({...newClient, street: e.target.value})} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bairro</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold text-xs" value={newClient.district} onChange={e => setNewClient({...newClient, district: e.target.value})} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Complemento</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold text-xs" value={newClient.complement} onChange={e => setNewClient({...newClient, complement: e.target.value})} placeholder="Apto 101, Bloco A" />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cidade/UF</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-100 font-bold text-xs" value={`${newClient.city}${newClient.city && '/ '}${newClient.state}`} readOnly disabled />
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-emerald-500 text-white font-black rounded-xl uppercase tracking-widest text-xs mt-4">Cadastrar e Continuar</button>
          </form>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ativos ({equipments.length})</p>
                <button onClick={() => setIsAddingEquip(true)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors">+ Novo Ativo</button>
            </div>

          <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2 scrollbar-hide">
             {loading ? <p className="text-center text-slate-400 py-10">Carregando ativos...</p> :
              equipments.length === 0 ?
              <div className="text-center py-10 bg-slate-50 rounded-3xl cursor-pointer hover:bg-slate-100" onClick={() => setIsAddingEquip(true)}>
                  <p className="text-slate-400 font-bold">Nenhum equipamento.</p>
                  <p className="text-blue-500 font-black text-xs uppercase tracking-widest mt-2 underline">Cadastrar Agora</p>
              </div> :
              equipments.map(e => (
              <label key={e.id} className={`p-6 rounded-3xl border-2 flex items-center gap-4 cursor-pointer transition-all ${selectedEquipments.includes(e.id) ? 'border-blue-600 bg-blue-50/50' : 'border-slate-50 hover:border-slate-200'}`}>
                <input type="checkbox" checked={selectedEquipments.includes(e.id)} onChange={() => {
                  setSelectedEquipments(prev => prev.includes(e.id) ? prev.filter(i => i !== e.id) : [...prev, e.id])
                }} className="w-6 h-6 rounded-lg appearance-none border-2 border-slate-200 checked:bg-blue-600" />
                <div className="text-left">
                  <p className="font-black text-slate-800 uppercase tracking-tighter">{e.brand} - {e.btu} BTU</p>
                  <p className="text-[10px] text-slate-400 font-bold">{e.location}</p>
                </div>
              </label>
            ))}
          </div>
          <button onClick={() => setStep(3)} disabled={selectedEquipments.length === 0} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest disabled:opacity-20 shadow-xl">Avançar Diagnóstico</button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Diagnóstico Inicial</p>
          <div className="relative">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              onFocus={() => setShowProblemSuggestions(true)}
              onBlur={() => setTimeout(() => setShowProblemSuggestions(false), 200)}
              placeholder="Descreva o problema... (Comece a digitar para ver sugestões)"
              className="w-full h-40 p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] outline-none focus:border-blue-600 font-bold text-slate-700 shadow-inner resize-none"
            />

            {showProblemSuggestions && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 max-h-60 overflow-y-auto">
                {filterSuggestions(description, COMMON_PROBLEMS).length > 0 ? (
                  filterSuggestions(description, COMMON_PROBLEMS).map(sug => (
                    <div
                      key={sug}
                      onMouseDown={(e) => handleSelectSuggestion(e, sug)}
                      className="p-4 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-600 border-b border-slate-50 last:border-0"
                    >
                      {sug}
                    </div>
                  ))
                ) : (
                   description.length === 0 && COMMON_PROBLEMS.slice(0, 5).map(sug => (
                    <div
                      key={sug}
                      onMouseDown={(e) => handleSelectSuggestion(e, sug)}
                      className="p-4 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-600 border-b border-slate-50 last:border-0"
                    >
                      {sug}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Urgência Autodetectada</p>
               <select value={priority} onChange={e => setPriority(e.target.value as Priority)}
                className="w-full p-4 bg-white border-2 border-slate-100 rounded-xl font-black text-xs uppercase tracking-widest outline-none focus:border-blue-600">
                {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
               </select>
            </div>
            <div className="flex-1">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Tipo de Serviço</p>
               <select value={serviceType} onChange={e => setServiceType(e.target.value)}
                className="w-full p-4 bg-white border-2 border-slate-100 rounded-xl font-black text-xs uppercase tracking-widest outline-none focus:border-blue-600">
                <option value="">Selecione...</option>
                <option value="Manutenção Preventiva">Manutenção Preventiva</option>
                <option value="Manutenção Corretiva">Manutenção Corretiva</option>
                <option value="Instalação">Instalação</option>
                <option value="Visita Técnica">Visita Técnica</option>
               </select>
            </div>
          </div>

          <button onClick={handleFinish} disabled={!serviceType} className="w-full py-6 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-slate-900/30 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Gerar OS</button>
        </div>
      )}

      <button onClick={onCancel} className="mt-8 w-full text-slate-300 font-black uppercase text-[10px] tracking-widest hover:text-rose-500 transition-colors">Cancelar Operação</button>
    </div>
  );
};
