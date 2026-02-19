
import React, { useState } from 'react';

interface Attachment {
  id: string;
  type: 'image' | 'pdf';
  url: string;
  name: string;
  date: string;
}

export const MediaGallery: React.FC = () => {
  const [items, setItems] = useState<Attachment[]>([
    { id: '1', type: 'image', name: 'Evidência Frontal.jpg', date: '2023-10-25', url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7bc3?auto=format&fit=crop&q=80&w=400' },
    { id: '2', type: 'pdf', name: 'Laudo Técnico PMOC.pdf', date: '2023-10-25', url: '#' },
    { id: '3', type: 'image', name: 'Placa Eletrônica.png', date: '2023-10-25', url: 'https://images.unsplash.com/photo-1621905252507-b354bcadcabc?auto=format&fit=crop&q=80&w=400' }
  ]);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      const newItem: Attachment = {
        id: Math.random().toString(),
        type: 'image',
        name: 'Nova_Captura.jpg',
        date: new Date().toISOString().split('T')[0],
        url: 'https://images.unsplash.com/photo-1599933333931-8979313b569b?auto=format&fit=crop&q=80&w=400'
      };
      setItems([newItem, ...items]);
      setIsUploading(false);
    }, 1500);
  };

  return (
    <div className="space-y-10 py-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Central de Arquivos</h4>
          <p className="text-xs font-bold text-slate-500">Imagens e laudos vinculados a esta OS.</p>
        </div>
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className={`px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-600 active:scale-95'}`}
        >
          {isUploading ? 'Processando...' : '+ Subir Arquivo'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {items.map((item) => (
          <div key={item.id} className="group relative bg-white rounded-[2.5rem] overflow-hidden border-2 border-slate-50 shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all">
            <div className="aspect-square relative bg-slate-50">
              {item.type === 'image' ? (
                <img src={item.url} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-rose-500">
                  <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  <span className="text-[10px] font-black uppercase">PDF</span>
                </div>
              )}
              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button className="p-3 bg-white rounded-xl text-slate-900 shadow-xl hover:bg-blue-600 hover:text-white transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
                <button className="p-3 bg-rose-500 rounded-xl text-white shadow-xl hover:bg-rose-600 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
            <div className="p-4 text-left">
              <p className="text-[11px] font-black text-slate-800 truncate mb-1">{item.name}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
