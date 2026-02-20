import React from 'react';
import { NavLink } from 'react-router-dom';

interface MenuItem {
  path: string;
  label: string;
  icon?: React.ReactNode;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  categories: Array<{
    title: string;
    items: MenuItem[];
  }>;
  locationPath: string;
  getPath: (path: string) => string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onLogout,
  categories,
  locationPath,
  getPath
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <aside className="fixed inset-y-0 right-0 w-full sm:w-80 bg-white shadow-2xl z-[100] animate-in slide-in-from-right duration-300 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg text-sm">I</div>
            <div>
              <h3 className="text-sm font-black text-slate-800 tracking-tight">Menu</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Navegação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all"
            aria-label="Fechar sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu Items List */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-4 scroll-container">
          {categories.map((category, catIdx) => (
            <div key={catIdx} className="mb-6">
              <h4 className="px-4 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{category.title}</h4>
              <div className="space-y-1">
                {category.items.map(item => {
                  const fullPath = getPath(item.path);
                  const isActive = locationPath === fullPath || (item.path !== '' && locationPath.startsWith(fullPath));

                  return (
                    <NavLink
                      key={item.path}
                      to={fullPath}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-4 py-3 transition-all rounded-xl ${isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                        : 'text-slate-600 hover:bg-slate-100 hover:translate-x-1'
                        }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-white/20' : 'bg-slate-100'
                        }`}>
                        {item.icon && React.cloneElement(item.icon as React.ReactElement, { className: "w-4 h-4" })}
                      </div>
                      <span className="font-bold text-[13px] truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer - Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="w-full flex items-center gap-4 px-4 py-4 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
          >
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <span className="font-bold text-sm">Sair da Conta</span>
          </button>
        </div>
      </aside>
    </>
  );
};
