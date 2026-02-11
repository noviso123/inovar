
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { UserRole, User } from '../types';
import { Sidebar } from './Sidebar';
import { GlobalNotifications } from './GlobalNotifications';
import {
  Home,
  FileText,
  Cpu,
  Calendar,
  User as UserIcon,
  Bell,
  LogOut,
  Menu,
  X,
  Check,
  Building,
  Users,
  Wrench,
  DollarSign,
  FileSpreadsheet,
  Megaphone,
  ShieldCheck,
  Settings,
  Activity,
  Fan,
  QrCode
} from 'lucide-react';
import { AirConditionerIcon } from './icons/AirConditionerIcon';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  notifications?: Array<{ id: string, title: string, message: string, severity: 'info' | 'warning' | 'success' }>;
  rolePrefix?: string;
}

const defaultNotifications = [
    { id: '1', title: 'Bem-vindo', message: 'Sistema atualizado com sucesso.', severity: 'info' as const }
];

export const Layout: React.FC<LayoutProps> = ({ user, onLogout, notifications = [], rolePrefix = '' }) => {
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

  // No default notifications to avoid annoyance on reload
  const activeNotifications = notifications.filter(n => !readNotificationIds.includes(n.id));

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
      path: '', label: 'Início', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE], icon: <Home className="w-6 h-6" />
    },
    {
      path: '/chamados', label: 'Chamados', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE], icon: <FileText className="w-6 h-6" />
    },
    {
      path: '/maquinas', label: 'Máquinas', roles: [UserRole.CLIENTE, UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO], icon: <AirConditionerIcon className="w-6 h-6" />
    },
    {
      path: '/agenda', label: 'Agenda', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO], icon: <Calendar className="w-6 h-6" />
    },
    {
      path: '/perfil', label: 'Perfil', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE], icon: <UserIcon className="w-6 h-6" />
    },
  ];

  // Menu items for full screen menu
  const menuItems = [
    { path: '', label: 'Dashboard', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE], icon: <Home className="w-5 h-5" /> },
    { path: '/chamados', label: 'Chamados', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE], icon: <FileText className="w-5 h-5" /> },
    { path: '/maquinas', label: 'Máquinas', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE], icon: <AirConditionerIcon className="w-5 h-5" /> },
    { path: '/agenda', label: 'Agenda', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO], icon: <Calendar className="w-5 h-5" /> },
    { path: '/perfil', label: 'Meu Perfil', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE], icon: <UserIcon className="w-5 h-5" /> },
    { path: '/empresa', label: 'Minha Empresa', roles: [UserRole.ADMIN, UserRole.PRESTADOR], icon: <Building className="w-5 h-5" /> },
    { path: '/clientes', label: 'Clientes', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO], icon: <Users className="w-5 h-5" /> },
    { path: '/tecnicos', label: 'Técnicos', roles: [UserRole.ADMIN, UserRole.PRESTADOR], icon: <Wrench className="w-5 h-5" /> },
    { path: '/financeiro', label: 'Financeiro', roles: [UserRole.ADMIN, UserRole.PRESTADOR], icon: <DollarSign className="w-5 h-5" /> },
    { path: '/usuarios', label: 'Usuários', roles: [UserRole.ADMIN, UserRole.PRESTADOR], icon: <Users className="w-5 h-5" /> },
    { path: '/fiscal', label: 'Fiscal', roles: [UserRole.ADMIN, UserRole.PRESTADOR], icon: <FileSpreadsheet className="w-5 h-5" /> },
    { path: '/qrcode', label: 'QR Code', roles: [UserRole.ADMIN, UserRole.PRESTADOR], icon: <QrCode className="w-5 h-5" /> },
    { path: '/auditoria', label: 'Auditoria', roles: [UserRole.ADMIN], icon: <ShieldCheck className="w-5 h-5" /> },
    { path: '/configuracoes', label: 'Configurações', roles: [UserRole.ADMIN], icon: <Settings className="w-5 h-5" /> },
    { path: '/system', label: 'Auditoria Sistema', roles: [UserRole.ADMIN], icon: <Activity className="w-5 h-5" /> },
  ];

  const visibleNavItems = navItems.filter(item => item.roles.includes(user.role));
  const visibleMenuItems = menuItems.filter(item => item.roles.includes(user.role));


  const getPageTitle = () => {
    const item = menuItems.find(i => i.path === location.pathname);
    return item?.label || 'Inovar';
  };

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-fixed bg-center font-sans flex justify-center selection:bg-cyan-500/30">
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-0"></div>

      <GlobalNotifications />
      <Helmet>
        <title>Inovar Gestão - Manutenção Inteligente</title>
        <meta name="description" content="Sistema de gestão de manutenção em tempo real para climatização." />
        <meta name="theme-color" content="#0f172a" />

        {/* Open Graph / Social Media */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Inovar Gestão - Manutenção Inteligente" />
        <meta property="og:description" content="Sistema de gestão de manutenção em tempo real para climatização." />
        <meta property="og:image" content="/logo.png" />
        <meta property="og:url" content="https://inovar-gestao.vercel.app/" />
      </Helmet>

      {/* APP CONTAINER */}
      <div className="w-full max-w-[1600px] min-h-screen flex flex-col relative z-10 transition-all duration-300">

        {/* HEADER */}
        <header className="h-20 glass-panel border-b-0 flex items-center justify-between px-8 sticky top-4 mx-4 mt-4 rounded-2xl z-[60]">
          <div className="flex items-center gap-4">
            <div className="relative group">
               <div className="absolute inset-0 bg-cyan-500 rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
               <img src="/logo.png" alt="Inovar" className="w-10 h-10 rounded-full object-contain bg-slate-900 relative z-10 border border-slate-700" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-black text-white tracking-widest uppercase truncate leading-none">
                {getPageTitle()}
              </h2>
              <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-[0.3em] mt-0.5">Gestão de Ativos</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="w-10 h-10 bg-slate-800/50 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl flex items-center justify-center active:scale-95 transition-all" aria-label="Notificações">
                <Bell className="w-5 h-5" />
                {activeNotifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_10px_#f43f5e]"></span>}
              </button>
              {isNotifOpen && (
                <div className="absolute top-12 right-0 w-80 glass-panel rounded-2xl p-0 z-[100] animate-in fade-in zoom-in duration-200 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-900/50">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">Notificações</h4>
                    {activeNotifications.length > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wide"
                      >
                        Ler todas
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2 space-y-2">
                    {activeNotifications.length === 0 ? (
                      <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest py-8">Sem novas notificações</p>
                    ) : (
                      activeNotifications.map((n) => (
                        <div key={n.id} className="flex gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 group relative transition-colors">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.severity === 'warning' ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' :
                            n.severity === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' :
                              'bg-cyan-500 shadow-[0_0_8px_#06b6d4]'
                            }`}></div>
                          <div className="text-left flex-1">
                            <p className="text-xs font-bold text-slate-200 mb-1">{n.title}</p>
                            <p className="text-[10px] text-slate-400 font-medium leading-tight">{n.message}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                            className="absolute top-2 right-2 p-1 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-100"
                            title="Marcar como lida"
                          >
                            <Check className="w-3 h-3" />
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
              className="w-10 h-10 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl flex items-center justify-center active:scale-95 transition-all"
              title="Sair"
              aria-label="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* MAIN CONTENT - Outlet for nested routes */}
        <div className="flex-1 p-6 pb-32">
          <Outlet />
        </div>

        {/* BOTTOM NAVIGATION (PILL) with integrated menu button */}
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 glass-panel !bg-slate-900/80 px-8 py-3 flex items-center gap-6 z-[70] rounded-full shadow-2xl shadow-black/50 border-t border-white/10">
          {visibleNavItems.map(item => {
            const fullPath = getPath(item.path);
            const isActive = location.pathname === fullPath || (item.path !== '' && location.pathname.startsWith(fullPath));
            return (
              <NavLink
                key={item.path}
                to={fullPath}
                className={`flex flex-col items-center gap-1 transition-all duration-300 relative group ${isActive ? 'text-cyan-400 -translate-y-1' : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                <div className={`p-2.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'group-hover:bg-white/5'}`}>
                  {React.cloneElement(item.icon as React.ReactElement, { className: "w-5 h-5" })}
                </div>
                {isActive && <div className="w-1 h-1 rounded-full bg-cyan-400 absolute -bottom-2 shadow-[0_0_8px_#22d3ee]"></div>}
              </NavLink>
            );
          })}

          {/* Vertical Divider */}
          <div className="w-px h-8 bg-white/10 mx-2"></div>

          {/* Menu Button - integrated into navbar */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="group flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-all duration-300"
            title="Menu"
            aria-label="Menu"
          >
            <div className="p-2.5 rounded-2xl group-hover:bg-white/10 transition-all border border-transparent group-hover:border-white/5">
              <Menu className="w-5 h-5 transition-transform group-hover:rotate-180 duration-500" />
            </div>
          </button>
        </nav>

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onLogout={onLogout}
          menuItems={visibleMenuItems}
          locationPath={location.pathname}
          getPath={getPath}
        />

      </div>
    </div>
  );
};
