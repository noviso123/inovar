
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { UserRole, User } from '../types';
import { Sidebar } from './Sidebar';
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
    <div className="min-h-screen bg-slate-50 font-sans flex justify-center">
      <Helmet>
        <title>Inovar - Manutenção Inteligente</title>
        <meta name="description" content="Sistema de gestão de manutenção de ar-condicionado em tempo real." />
        <meta property="og:title" content="Inovar - Gestão de Manutenção" />
        <meta property="og:description" content="Controle total sobre seus chamados e equipamentos." />
        <meta property="og:type" content="website" />
      </Helmet>
      {/* APP CONTAINER - Expanded for Desktop */}
      <div className="w-full max-w-[1600px] bg-slate-50 min-h-screen flex flex-col relative shadow-2xl shadow-slate-200/50 transition-all duration-300">

        {/* HEADER */}
        <header className="h-20 bg-white/90 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-[60]">
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
              <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 active:scale-95 shadow-sm relative" aria-label="Notificações">
                <Bell className="w-5 h-5" />
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
                            <Check className="w-4 h-4" />
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
            aria-label="Menu"
          >
            <div className="p-2 rounded-2xl">
              <Menu className="w-6 h-6" />
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
