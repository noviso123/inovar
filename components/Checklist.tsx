
import React, { useState } from 'react';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  obs: string;
  norm?: string;
}

interface ChecklistProps {
  requestId: string;
  equipmentId: string;
  equipmentName: string;
  onComplete: (items: ChecklistItem[]) => void;
}

export const Checklist: React.FC<ChecklistProps> = ({ requestId, equipmentId, equipmentName, onComplete }) => {
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: '1', label: 'Limpeza de Filtros/Evaporadora', checked: false, obs: '', norm: 'RE 09/ANVISA' },
    { id: '2', label: 'Verificação de Dreno e Bandeja', checked: false, obs: '', norm: 'NBR 13971' },
    { id: '3', label: 'Medição de Corrente Nominal (A)', checked: false, obs: '', norm: 'NBR 5410' },
    { id: '4', label: 'Inspeção de Bornes e Fiação', checked: false, obs: '', norm: 'Segurança Elétrica' },
    { id: '5', label: 'Teste de Rendimento (Salto Térmico)', checked: false, obs: '', norm: 'Performance' },
    { id: '6', label: 'Estanqueidade de Fluído (Gás)', checked: false, obs: '', norm: 'Vazamentos' },
  ]);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const updateObs = (id: string, obs: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, obs } : item));
  };

  const progress = Math.round((items.filter(i => i.checked).length / items.length) * 100);

  return (
    <div className="bg-white rounded-[2.5rem] p-10 border-2 border-slate-50 shadow-sm animate-in fade-in slide-in-from-bottom-6 duration-500 text-left">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-1">Checklist de Conformidade PMOC</h5>
          <h4 className="text-2xl font-black text-slate-800 tracking-tighter truncate max-w-sm">{equipmentName}</h4>
        </div>
        <div className={`w-20 h-20 rounded-[1.5rem] flex flex-col items-center justify-center font-black border-4 transition-all ${progress === 100 ? 'bg-emerald-500 border-emerald-100 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
          <span className="text-lg">{progress}%</span>
          <span className="text-[8px] uppercase tracking-tighter">Status</span>
        </div>
      </div>

      <div className="space-y-4 max-h-[450px] overflow-y-auto pr-4 scrollbar-hide mb-10">
        {items.map(item => (
          <div key={item.id} className={`p-6 rounded-3xl border-2 transition-all ${item.checked ? 'bg-blue-50/20 border-blue-100 shadow-sm' : 'bg-slate-50/50 border-slate-50'}`}>
            <div className="flex items-start gap-5">
              <label className="relative flex items-center cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleItem(item.id)}
                  className="peer w-8 h-8 rounded-xl border-2 border-slate-200 text-blue-600 focus:ring-0 appearance-none bg-white checked:bg-blue-600 checked:border-blue-600 transition-all"
                />
                <svg className="absolute w-5 h-5 text-white left-1.5 opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
              </label>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                   <span className={`text-base font-black tracking-tight ${item.checked ? 'text-slate-800' : 'text-slate-400'}`}>{item.label}</span>
                   {item.norm && <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{item.norm}</span>}
                </div>
                {item.checked && (
                  <input
                    placeholder="Medição ou detalhe técnico (ex: 12.5A, 18ºC...)"
                    className="w-full mt-3 p-4 bg-white border-2 border-blue-50 rounded-2xl text-xs outline-none focus:border-blue-300 font-bold text-slate-600 transition-all"
                    value={item.obs}
                    onChange={(e) => updateObs(item.id, e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onComplete(items)}
        className="w-full py-6 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-[1.5rem] shadow-2xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
        Validar e Salvar Inspecção
      </button>
    </div>
  );
};
