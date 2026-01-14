
import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { UserRole, User } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  notifications?: Array<{ id: string, title: string, message: string, severity: 'info' | 'warning' | 'success' }>;
  rolePrefix?: string;
}

export const Layout: React.FC<LayoutProps> = ({ user, onLogout, notifications = [], rolePrefix = '' }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('read_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('read_notifications', JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);

  // Combine WebSocket notifications with default notifications
  const defaultNotifications = [
    { id: 'welcome', title: 'Bem-vindo ao Sistema', message: 'Acesse seu perfil para completar seus dados.', severity: 'info' as const },
    { id: 'security', title: 'Dica de Segurança', message: 'Troque sua senha periodicamente.', severity: 'info' as const },
  ];

  const activeNotifications = [...notifications, ...defaultNotifications].filter(n => !readNotificationIds.includes(n.id));

  const markAsRead = (id: string) => {
    setReadNotificationIds(prev => [...prev, id]);
  };

  const markAllAsRead = () => {
    const allIds = [...notifications, ...defaultNotifications].map(n => n.id);
    setReadNotificationIds(allIds);
  };

  // Helper to get full path with role prefix
  const getPath = (path: string) => `/${rolePrefix}${path === '/' ? '' : path}`;

  // Navigation items for bottom bar
  const navItems = [
    {
      path: '', label: 'Início', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE], icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
      )
    },
    {
      path: '/chamados', label: 'Chamados', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE], icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
        </svg>
      )
    },
    {
      path: '/maquinas', label: 'Máquinas', roles: [UserRole.CLIENTE, UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO], icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="2" y="4" width="20" height="14" rx="2" strokeWidth="2" />
          <circle cx="9" cy="11" r="4" strokeWidth="2" />
          <circle cx="9" cy="11" r="1.5" strokeWidth="1" />
          <path strokeLinecap="round" strokeWidth="1.5" d="M9 7v8M5 11h8M6.2 8.2l5.6 5.6M11.8 8.2l-5.6 5.6" />
          <path strokeLinecap="round" strokeWidth="2" d="M16 8h3M16 11h3M16 14h3" />
          <path strokeWidth="2" d="M5 18v2M19 18v2" />
        </svg>
      )
    },
    {
      path: '/agenda', label: 'Agenda', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO], icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      )
    },
    {
      path: '/perfil', label: 'Perfil', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE], icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
      )
    },
  ];

  // Menu items for full screen menu
  const menuItems = [
    { path: '', label: 'Dashboard', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE] },
    { path: '/chamados', label: 'Chamados', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE] },
    { path: '/maquinas', label: 'Máquinas', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE] },
    { path: '/agenda', label: 'Agenda', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO] },
    { path: '/perfil', label: 'Meu Perfil', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE] },
    { path: '/empresa', label: 'Minha Empresa', roles: [UserRole.ADMIN, UserRole.PRESTADOR] },
    { path: '/clientes', label: 'Clientes', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO] },
    { path: '/tecnicos', label: 'Técnicos', roles: [UserRole.ADMIN, UserRole.PRESTADOR] },
    { path: '/financeiro', label: 'Financeiro', roles: [UserRole.ADMIN, UserRole.PRESTADOR] },
    { path: '/usuarios', label: 'Usuários', roles: [UserRole.ADMIN, UserRole.PRESTADOR] },
    { path: '/marketing', label: 'Marketing', roles: [UserRole.ADMIN, UserRole.PRESTADOR] },
    { path: '/auditoria', label: 'Auditoria', roles: [UserRole.ADMIN] },
    { path: '/configuracoes', label: 'Configurações', roles: [UserRole.ADMIN] },
  ];

  const visibleNavItems = navItems.filter(item => item.roles.includes(user.role));
  const visibleMenuItems = menuItems.filter(item => item.roles.includes(user.role));


  const getPageTitle = () => {
    const item = menuItems.find(i => i.path === location.pathname);
    return item?.label || 'Inovar';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex justify-center">
      {/* APP CONTAINER */}
      <div className="w-full max-w-5xl bg-slate-50 min-h-screen flex flex-col relative shadow-2xl shadow-slate-200/50">

        {/* HEADER */}
        <header className="h-20 bg-white/90 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-[60]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/30 text-lg">I</div>
            <div className="flex flex-col">
              <h2 className="text-sm font-black text-slate-800 tracking-tighter uppercase truncate leading-none">
                {getPageTitle()}
              </h2>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Field Intelligence</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 active:scale-95 shadow-sm relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {activeNotifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>}
              </button>
              {isNotifOpen && (
                <div className="absolute top-12 right-0 w-80 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-6 z-[100] animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Notificações</h4>
                    {activeNotifications.length > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wide"
                      >
                        Ler todas
                      </button>
                    )}
                  </div>
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {activeNotifications.length === 0 ? (
                      <p className="text-[10px] text-center text-slate-300 font-bold uppercase tracking-widest py-4">Sem novas notificações</p>
                    ) : (
                      activeNotifications.map((n) => (
                        <div key={n.id} className="flex gap-4 p-4 rounded-2xl border bg-slate-50 border-slate-100 group relative">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.severity === 'warning' ? 'bg-amber-500' :
                              n.severity === 'success' ? 'bg-emerald-500' :
                                'bg-blue-500'
                            }`}></div>
                          <div className="text-left flex-1">
                            <p className="text-xs font-bold text-slate-800 mb-1">{n.title}</p>
                            <p className="text-[10px] text-slate-500 font-medium leading-tight">{n.message}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                            className="absolute top-2 right-2 p-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Marcar como lida"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="w-10 h-10 bg-rose-50 border border-slate-100 text-rose-500 rounded-xl flex items-center justify-center active:scale-95 shadow-sm"
              title="Sair"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>

            {/* Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center active:scale-95 shadow-lg shadow-slate-900/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
          </div>
        </header>

        {/* MAIN CONTENT - Outlet for nested routes */}
        <div className="flex-1 p-6 pb-32">
          <Outlet />
        </div>

        {/* BOTTOM NAVIGATION (PILL) with integrated menu button */}
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-slate-900/40 rounded-full px-6 py-3 flex items-center gap-4 z-[70]">
          {visibleNavItems.map(item => {
            const fullPath = getPath(item.path);
            const isActive = location.pathname === fullPath || (item.path !== '' && location.pathname.startsWith(fullPath));
            return (
              <NavLink
                key={item.path}
                to={fullPath}
                className={`flex flex-col items-center gap-1 transition-all duration-300 relative ${isActive ? 'text-cyan-400 -translate-y-1' : 'text-slate-500 hover:text-white'
                  }`}
              >
                <div className={`p-2 rounded-2xl ${isActive ? 'bg-cyan-600/20' : ''}`}>
                  {item.icon}
                </div>
                {isActive && <div className="w-1 h-1 rounded-full bg-cyan-500 absolute -bottom-2"></div>}
              </NavLink>
            );
          })}

          {/* Menu Button - integrated into navbar */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-all duration-300 ml-2"
            title="Menu"
          >
            <div className="p-2 rounded-2xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
          </button>
        </nav>

        {/* FULL SCREEN MENU OVERLAY */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
            <div className="p-8 flex justify-between items-center border-b border-white/10">
              <h3 className="text-xl font-black text-white uppercase tracking-widest">Menu Principal</h3>
              <button onClick={() => setIsMobileMenuOpen(false)} className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-white/20 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4">
                {visibleMenuItems.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`p-6 rounded-[2rem] text-left transition-all group flex flex-col gap-4 ${isActive
                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-white/5'}`}>
                        <div className="w-4 h-4 bg-current rounded-full"></div>
                      </div>
                      <span className="font-black text-[10px] uppercase tracking-widest leading-tight block">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>

              <button onClick={onLogout} className="w-full mt-8 py-6 bg-rose-500/10 text-rose-500 rounded-[2rem] font-black uppercase tracking-widest text-xs border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all">Sair da Conta</button>
            </div>
          </div>
        )}

        {/* SLIDING SIDEBAR FROM RIGHT */}
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] animate-in fade-in duration-200"
              onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar Panel */}
            <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-[100] animate-in slide-in-from-right duration-300 flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg text-sm">I</div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 tracking-tight">Menu</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Navegação</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Menu Items List */}
              <div className="flex-1 overflow-y-auto py-4">
                {visibleMenuItems.map(item => {
                  const fullPath = getPath(item.path);
                  const isActive = location.pathname === fullPath || (item.path !== '' && location.pathname.startsWith(fullPath));
                  return (
                    <NavLink
                      key={item.path}
                      to={fullPath}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-4 px-6 py-4 transition-all ${isActive
                        ? 'bg-cyan-50 text-cyan-600 border-r-4 border-cyan-600'
                        : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-cyan-100' : 'bg-slate-100'
                        }`}>
                        {item.path === '' && (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        )}
                        {item.path === '/chamados' && (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                          </svg>
                        )}
                        {item.path === '/maquinas' && (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="2" y="4" width="20" height="14" rx="2" strokeWidth="2" />
                            <circle cx="9" cy="11" r="4" strokeWidth="2" />
                            <circle cx="9" cy="11" r="1.5" strokeWidth="1" />
                            <path strokeLinecap="round" strokeWidth="1.5" d="M9 7v8M5 11h8M6.2 8.2l5.6 5.6M11.8 8.2l-5.6 5.6" />
                            <path strokeLinecap="round" strokeWidth="2" d="M16 8h3M16 11h3M16 14h3" />
                            <path strokeWidth="2" d="M5 18v2M19 18v2" />
                          </svg>
                        )}
                        {item.path === '/agenda' && (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        )}
                        {item.path === '/perfil' && (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        )}
                        {item.path === '/empresa' && (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        )}
                        {item.path === '/clientes' && (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        )}
                        {item.path === '/tecnicos' && (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        )}
                        {item.path === '/financeiro' && (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                        {item.path === '/usuarios' && (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        )}
                        {item.path === '/marketing' && (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                        )}
                        {item.path === '/auditoria' && (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        )}
                        {item.path === '/configuracoes' && (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        )}
                      </div>
                      <span className="font-bold text-sm">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>

              {/* Footer - Logout */}
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={() => { setIsSidebarOpen(false); onLogout(); }}
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
            </div>
          </>
        )}

      </div>
    </div>
  );
};
