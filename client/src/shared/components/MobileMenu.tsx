import React from 'react';
import { NavLink } from 'react-router-dom';

interface MenuItem {
  path: string;
  label: string;
  icon?: React.ReactNode;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  menuItems: MenuItem[];
  locationPath: string;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  onLogout,
  menuItems,
  locationPath
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
      <div className="p-8 flex justify-between items-center border-b border-white/10">
        <h3 className="text-xl font-black text-white uppercase tracking-widest">Menu Principal</h3>
        <button
          onClick={onClose}
          className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-white/20 transition-all"
          aria-label="Fechar menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <nav className="grid grid-cols-2 gap-4">
          {menuItems.map(item => {
            const isActive = locationPath === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`p-6 rounded-[2rem] text-left transition-all group flex flex-col gap-4 ${isActive
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-white/5'}`}>
                   {item.icon && React.cloneElement(item.icon as React.ReactElement, { className: "w-5 h-5" })}
                </div>
                <span className="font-black text-[10px] uppercase tracking-widest leading-tight block">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <button
          onClick={onLogout}
          className="w-full mt-8 py-6 bg-rose-500/10 text-rose-500 rounded-[2rem] font-black uppercase tracking-widest text-xs border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"
        >
          Sair da Conta
        </button>
      </div>
    </div>
  );
};
