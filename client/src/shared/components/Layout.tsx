
import React, { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Helmet } from 'react-helmet';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { UserRole, User } from '@/shared/types';
import { Sidebar } from '@/shared/components/Sidebar';
import { GlobalNotifications } from '@/shared/components/GlobalNotifications';
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
import { AirConditionerIcon } from '@/shared/components/icons/AirConditionerIcon';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  notifications?: Array<{ id: string, title: string, message: string, severity: 'info' | 'warning' | 'success' }>;
  rolePrefix?: string;
}

const defaultNotifications = [
    { id: '1', title: 'Bem-vindo', message: 'Sistema atualizado com sucesso.', severity: 'info' as const }
];

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

// Categorized menu items for the main menu
const menuCategories = [
  {
    title: 'Operacional',
    roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE],
    items: [
      { path: '', label: 'Dashboard', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE], icon: <Home className="w-5 h-5" /> },
      { path: '/chamados', label: 'Chamados', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE], icon: <FileText className="w-5 h-5" /> },
      { path: '/maquinas', label: 'Máquinas', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO, UserRole.CLIENTE], icon: <AirConditionerIcon className="w-5 h-5" /> },
      { path: '/agenda', label: 'Agenda', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO], icon: <Calendar className="w-5 h-5" /> },
    ]
  },
  {
    title: 'Gestão',
    roles: [UserRole.ADMIN, UserRole.PRESTADOR],
    items: [
      { path: '/clientes', label: 'Clientes', roles: [UserRole.ADMIN, UserRole.PRESTADOR, UserRole.TECNICO], icon: <Users className="w-5 h-5" /> },
      { path: '/tecnicos', label: 'Técnicos', roles: [UserRole.ADMIN, UserRole.PRESTADOR], icon: <Wrench className="w-5 h-5" /> },
      { path: '/financeiro', label: 'Financeiro', roles: [UserRole.ADMIN, UserRole.PRESTADOR], icon: <DollarSign className="w-5 h-5" /> },
      { path: '/fiscal', label: 'Fiscal', roles: [UserRole.ADMIN, UserRole.PRESTADOR], icon: <FileSpreadsheet className="w-5 h-5" /> },
    ]
  },
  {
    title: 'Sistema',
    roles: [UserRole.ADMIN],
    items: [
      { path: '/usuarios', label: 'Usuários', roles: [UserRole.ADMIN, UserRole.PRESTADOR], icon: <Users className="w-5 h-5" /> },
      { path: '/qrcode', label: 'QR Code', roles: [UserRole.ADMIN, UserRole.PRESTADOR], icon: <QrCode className="w-5 h-5" /> },
      { path: '/empresa', label: 'Minha Empresa', roles: [UserRole.ADMIN, UserRole.PRESTADOR], icon: <Building className="w-5 h-5" /> },
      { path: '/auditoria', label: 'Auditoria', roles: [UserRole.ADMIN], icon: <ShieldCheck className="w-5 h-5" /> },
      { path: '/configuracoes', label: 'Configurações', roles: [UserRole.ADMIN], icon: <Settings className="w-5 h-5" /> },
    ]
  }
];

const allMenuItems = menuCategories.flatMap(c => c.items);

export const Layout: React.FC<LayoutProps> = ({ user, onLogout, notifications = [], rolePrefix = '' }) => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

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

  const visibleNavItems = navItems.filter(item => item.roles.includes(user.role));
  const filteredCategories = menuCategories
    .filter(cat => cat.roles.includes(user.role))
    .map(cat => ({
      ...cat,
      items: cat.items.filter(item => item.roles.includes(user.role))
    }))
    .filter(cat => cat.items.length > 0);


  const getPageTitle = () => {
    const item = allMenuItems.find(i => getPath(i.path) === location.pathname);
    return item?.label || 'Inovar';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex justify-center">
      <GlobalNotifications />

      {/* PWA Update Toast */}
      {(offlineReady || needRefresh) && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-md">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
            <div className="flex-1">
              <p className="text-white text-xs font-bold">
                {offlineReady ? 'App pronto para uso offline!' : 'Nova versão disponível!'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {needRefresh && (
                <button
                  onClick={() => updateServiceWorker(true)}
                  className="px-4 py-2 bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-transform"
                >
                  Atualizar
                </button>
              )}
              <button
                onClick={close}
                className="px-4 py-2 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-transform"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      <Helmet>
        <title>Inovar Gestão - Manutenção Inteligente</title>
        <meta name="description" content="Sistema de gestão de manutenção em tempo real para climatização." />
        <meta property="og:title" content="Inovar Gestão - Gestão de Manutenção" />
        <meta property="og:description" content="Controle total sobre seus chamados e equipamentos." />
        <meta property="og:type" content="website" />
      </Helmet>
      {/* APP CONTAINER - Edge-to-Edge on Mobile, Constrained on Desktop */}
      <div className="w-full md:max-w-[1600px] bg-slate-50 min-h-screen flex flex-col relative md:shadow-2xl md:shadow-slate-200/50 transition-all duration-300">

        {/* HEADER */}
        <header className="h-16 md:h-20 bg-white/90 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-3 md:px-8 sticky top-0 z-[60]">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Inovar" className="w-10 h-10 rounded-full shadow-lg object-contain bg-[#3d6b8c]" />
            <div className="flex flex-col">
              <h2 className="text-[12px] md:text-sm font-black text-slate-800 tracking-tighter uppercase truncate leading-none">
                {getPageTitle()}
              </h2>
              <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestão</span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
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
                            className="absolute top-2 right-2 p-1 text-slate-300 pooler:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
        <div className="flex-1 px-2 py-4 md:p-6 lg:p-8 pb-28 min-w-0">
          <Outlet />
        </div>

        {/* BOTTOM NAVIGATION (PILL) with integrated menu button */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 glass shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2rem] px-3 sm:px-6 lg:px-8 py-3 flex items-center gap-2 sm:gap-4 lg:gap-6 z-[70] transition-all duration-500 hover:scale-[1.02] mb-[var(--safe-area-bottom)]">
          {visibleNavItems.map(item => {
            const fullPath = getPath(item.path);
            const isActive = location.pathname === fullPath || (item.path !== '' && location.pathname.startsWith(fullPath));
            return (
              <NavLink
                key={item.path}
                to={fullPath}
                className={`flex flex-col items-center gap-1 transition-all duration-500 relative ${isActive ? 'text-cyan-400 -translate-y-2' : 'text-slate-400 hover:text-white'
                  }`}
              >
                <div className={`p-2.5 sm:p-3 rounded-2xl transition-all duration-500 ${isActive ? 'bg-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'hover:bg-white/5'}`}>
                  {React.cloneElement(item.icon as React.ReactElement, { className: "w-6 h-6" })}
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 absolute -bottom-3 shadow-[0_0_10px_#22d3ee]"></div>}
              </NavLink>
            );
          })}

          {/* Vertical Divider */}
          <div className="w-px h-8 bg-white/10 mx-1"></div>

          {/* Menu Button - integrated into navbar */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="group flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-all duration-300"
            title="Menu"
            aria-label="Menu"
          >
            <div className="p-2.5 sm:p-3 rounded-2xl group-hover:bg-white/5 transition-all">
              <Menu className="w-6 h-6 transition-transform group-hover:rotate-180 duration-500" />
            </div>
          </button>
        </nav>

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onLogout={onLogout}
          categories={filteredCategories}
          locationPath={location.pathname}
          getPath={getPath}
        />

      </div>
    </div>
  );
};
