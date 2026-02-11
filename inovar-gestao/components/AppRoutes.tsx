
import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { User, UserRole, ServiceRequest, TimelineEvent } from '../types';

// Components
import { Layout } from './Layout';
import { Dashboard } from './Dashboard';
import { RequestFlow } from './RequestFlow';
import { RequestDetail } from './RequestDetail';
import { EquipmentManager } from './EquipmentManager';
import { ClientManager } from './ClientManager';
import { UserManager } from './UserManager';
import { TechnicianManager } from './TechnicianManager';
import { SystemSettings } from './SystemSettings';
import { AuditPanel } from './AuditPanel';
import { Agenda } from './Agenda';
import { Finance } from './Finance';
import { Profile } from './Profile';
import { ProfileEdit } from './ProfileEdit';
import { CompanyProfile } from './CompanyProfile';
import { CompanyEdit } from './CompanyEdit';
import { ClientForm } from './ClientForm';
import { EquipmentForm } from './EquipmentForm';
import { TechnicianForm } from './TechnicianForm';
import { UserForm } from './UserForm';
import { QRCodeGenerator } from './QRCodeGenerator';
import { Login } from './Login';
import { NotificationsPage } from './NotificationsPage';
import { PrivacyPage } from './PrivacyPage';
import { HelpPage } from './HelpPage';
import { ForgotPassword } from './ForgotPassword';
import { ResetPassword } from './ResetPassword';
import { ForceChangePassword } from './ForceChangePassword';
import { ServiceOrderPrint } from './ServiceOrderPrint';
import { BudgetPrint } from './BudgetPrint';
import SystemStatus from './SystemStatus';
import { FiscalSettings } from './FiscalSettings';
import { GoogleAuthCallback } from './GoogleAuthCallback';

// ============================================
// ROLE PREFIX HELPER
// ============================================
export const getRolePrefix = (role: UserRole): string => {
  switch (role) {
    case UserRole.ADMIN: return 'admin';
    case UserRole.PRESTADOR: return 'prestador';
    case UserRole.TECNICO: return 'tecnico';
    case UserRole.CLIENTE: return 'cliente';
    default: return 'cliente';
  }
};

// ============================================
// ROLE ROUTE GUARD
// ============================================
const RoleRouteGuard: React.FC<{ children: React.ReactNode; user: User | null; expectedRole: UserRole }> =
  ({ children, user, expectedRole }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    if (user.role !== expectedRole) {
      return <Navigate to={`/${getRolePrefix(user.role)}`} replace />;
    }
    return <>{children}</>;
  };

// ============================================
// REQUEST LIST PAGE COMPONENT
// ============================================
const RequestListPage: React.FC<{
  requests: ServiceRequest[];
  onSelectRequest: (r: ServiceRequest) => void;
  onCreateNew: () => void;
  rolePrefix: string;
}> = ({ requests, onSelectRequest, onCreateNew, rolePrefix }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate(`/${rolePrefix}`)}
          className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Chamados</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Painel de solicitações</p>
        </div>
        <button
          onClick={onCreateNew}
          className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-600 transition-all uppercase tracking-widest text-[10px]"
        >
          + Criar Chamado
        </button>
      </div>

      <div className="space-y-3">
        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
            <p className="text-slate-400 font-medium">Nenhum chamado encontrado</p>
          </div>
        ) : (
          requests.map(req => (
            <div
              key={req.id}
              onClick={() => onSelectRequest(req)}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-lg hover:border-cyan-200 transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">#{req.numero || req.id.slice(0, 6)}</span>
                  <h4 className="font-bold text-slate-800 text-sm mt-1">{req.clientName}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{req.description}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${req.status === 'ABERTA' ? 'bg-blue-100 text-blue-700' :
                  req.status === 'EM_ANDAMENTO' ? 'bg-amber-100 text-amber-700' :
                    req.status === 'CONCLUIDA' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-700'
                  }`}>{req.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

interface AppRoutesProps {
  currentUser: User | null;
  requests: ServiceRequest[];
  onLogin: (email: string, pass: string) => Promise<any>;
  onLogout: () => void;
  notifications: any[];
  onUpdateUser: (u: User) => void;
  handleCreateRequest: (r: ServiceRequest) => void;
  handleUpdateStatus: (id: string, s: any, rid?: string, rn?: string) => void;
  setSelectedRequest: (r: ServiceRequest | null) => void;
  selectedRequest: ServiceRequest | null;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({
  currentUser,
  requests,
  onLogin,
  onLogout,
  notifications,
  onUpdateUser,
  handleCreateRequest,
  handleUpdateStatus,
  setSelectedRequest,
  selectedRequest
}) => {
  const navigate = useNavigate();

  const filteredRequests = currentUser?.role === UserRole.CLIENTE
    ? requests.filter(r => r.clientId === currentUser.id)
    : requests;

  const renderCommonRoutes = (prefix: string) => [
    <React.Fragment key="dashboard">
      <Route index element={
        <Dashboard
          requests={filteredRequests}
          onSelectRequest={(r) => { setSelectedRequest(r); navigate(`/${prefix}/chamados/${r.id}`); }}
          currentUser={currentUser || {} as User}
          onNavigate={(tab) => navigate(`/${prefix}/${tab === 'dashboard' ? '' : tab}`)}
        />
      } />
    </React.Fragment>,
    <React.Fragment key="chamados">
      <Route path="chamados" element={
        <RequestListPage
          requests={filteredRequests}
          onSelectRequest={(r) => { setSelectedRequest(r); navigate(`/${prefix}/chamados/${r.id}`); }}
          onCreateNew={() => navigate(`/${prefix}/chamados/novo`)}
          rolePrefix={prefix}
        />
      } />
    </React.Fragment>,
    <React.Fragment key="chamados-novo">
      <Route path="chamados/novo" element={
        <RequestFlow
          currentUser={currentUser || {} as User}
          onCancel={() => navigate(`/${prefix}/chamados`)}
          onComplete={handleCreateRequest}
        />
      } />
    </React.Fragment>,
    <React.Fragment key="chamados-id">
      <Route path="chamados/:id" element={
        <RequestDetail
          request={selectedRequest || {} as ServiceRequest}
          currentUser={currentUser || {} as User}
          onUpdateStatus={(st) => selectedRequest && handleUpdateStatus(selectedRequest.id, st)}
          onClose={() => { setSelectedRequest(null); navigate(`/${prefix}/chamados`); }}
        />
      } />
    </React.Fragment>,
    <React.Fragment key="perfil">
      <Route path="perfil" element={
        <Profile user={currentUser!} onUpdateUser={onUpdateUser} rolePrefix={prefix} />
      } />
    </React.Fragment>,
    <React.Fragment key="maquinas">
      <Route path="maquinas" element={
        <EquipmentManager currentUser={currentUser!} />
      } />
    </React.Fragment>,
    <React.Fragment key="maquinas-nova">
      <Route path="maquinas/nova" element={
        <EquipmentForm currentUser={currentUser!} />
      } />
    </React.Fragment>,
    <React.Fragment key="maquinas-editar">
      <Route path="maquinas/:id/editar" element={
        <EquipmentForm currentUser={currentUser!} />
      } />
    </React.Fragment>,
    <React.Fragment key="notificacoes">
      <Route path="notificacoes" element={
        <NotificationsPage currentUser={currentUser!} />
      } />
    </React.Fragment>,
    <React.Fragment key="privacidade">
      <Route path="privacidade" element={
        <PrivacyPage />
      } />
    </React.Fragment>,
    <React.Fragment key="ajuda">
      <Route path="ajuda" element={
        <HelpPage />
      } />
    </React.Fragment>,
    <React.Fragment key="perfil-editar">
      <Route path="perfil/editar" element={
        <ProfileEdit currentUser={currentUser!} onUpdateUser={onUpdateUser} />
      } />
    </React.Fragment>
  ];

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        currentUser ? <Navigate to={`/${getRolePrefix(currentUser.role)}`} replace /> : <Login onLogin={onLogin} />
      } />
      <Route path="/forgot-password" element={
        currentUser ? <Navigate to={`/${getRolePrefix(currentUser.role)}`} replace /> : <ForgotPassword />
      } />
      <Route path="/reset-password" element={
        currentUser ? <Navigate to={`/${getRolePrefix(currentUser.role)}`} replace /> : <ResetPassword />
      } />

      <Route path="/force-change-password" element={
          currentUser ? <ForceChangePassword onLogout={onLogout} onUpdateUser={onUpdateUser} /> : <Navigate to="/login" replace />
      } />

      {/* Google OAuth Callback - receives token from backend redirect */}
      <Route path="/auth/callback" element={
        <GoogleAuthCallback />
      } />

      {/* Print Routes */}
      <Route path="/print/os/:id" element={<ServiceOrderPrint />} />
      <Route path="/print/budget/:id" element={<BudgetPrint />} />

      {/* Default redirect */}
      <Route path="/" element={
        currentUser ? <Navigate to={`/${getRolePrefix(currentUser.role)}`} replace /> : <Navigate to="/login" replace />
      } />

      {/* ============================================ */}
      {/* CLIENTE ROUTES */}
      {/* ============================================ */}
      <Route path="/cliente" element={
        <RoleRouteGuard user={currentUser} expectedRole={UserRole.CLIENTE}>
          <Layout user={currentUser!} onLogout={onLogout} notifications={notifications} rolePrefix="cliente" />
        </RoleRouteGuard>
      }>
        {renderCommonRoutes('cliente')}
      </Route>

      {/* ============================================ */}
      {/* TECNICO ROUTES */}
      {/* ============================================ */}
      <Route path="/tecnico" element={
        <RoleRouteGuard user={currentUser} expectedRole={UserRole.TECNICO}>
          <Layout user={currentUser!} onLogout={onLogout} notifications={notifications} rolePrefix="tecnico" />
        </RoleRouteGuard>
      }>
        {renderCommonRoutes('tecnico')}
        <Route path="agenda" element={<Agenda requests={requests} onSelectRequest={(r) => { setSelectedRequest(r); navigate(`/tecnico/chamados/${r.id}`); }} />} />
        <Route path="clientes" element={<ClientManager currentUser={currentUser!} />} />
      </Route>

      {/* ============================================ */}
      {/* PRESTADOR ROUTES */}
      {/* ============================================ */}
      <Route path="/prestador" element={
        <RoleRouteGuard user={currentUser} expectedRole={UserRole.PRESTADOR}>
          <Layout user={currentUser!} onLogout={onLogout} notifications={notifications} rolePrefix="prestador" />
        </RoleRouteGuard>
      }>
        {renderCommonRoutes('prestador')}
        <Route path="agenda" element={<Agenda requests={requests} onSelectRequest={(r) => { setSelectedRequest(r); navigate(`/prestador/chamados/${r.id}`); }} />} />
        <Route path="empresa" element={<CompanyProfile currentUser={currentUser!} />} />
        <Route path="empresa/editar" element={<CompanyEdit currentUser={currentUser!} />} />
        <Route path="clientes" element={<ClientManager currentUser={currentUser!} />} />
        <Route path="clientes/novo" element={<ClientForm currentUser={currentUser!} />} />
        <Route path="clientes/:id/editar" element={<ClientForm currentUser={currentUser!} />} />
        <Route path="tecnicos" element={<TechnicianManager currentUser={currentUser!} />} />
        <Route path="tecnicos/novo" element={<TechnicianForm currentUser={currentUser!} />} />
        <Route path="tecnicos/:id/editar" element={<TechnicianForm currentUser={currentUser!} />} />
        <Route path="usuarios" element={<UserManager currentUser={currentUser!} />} />
        <Route path="usuarios/novo" element={<UserForm currentUser={currentUser!} />} />
        <Route path="usuarios/:id/editar" element={<UserForm currentUser={currentUser!} />} />
        <Route path="financeiro" element={<Finance />} />
        <Route path="fiscal" element={<FiscalSettings currentUser={currentUser!} />} />

      </Route>

      {/* ============================================ */}
      {/* ADMIN ROUTES */}
      {/* ============================================ */}
      <Route path="/admin" element={
        <RoleRouteGuard user={currentUser} expectedRole={UserRole.ADMIN}>
          <Layout user={currentUser || {} as User} notifications={notifications} rolePrefix="admin" onLogout={onLogout} />
        </RoleRouteGuard>
      }>
        {renderCommonRoutes('admin')}
        <Route path="agenda" element={<Agenda requests={requests} onSelectRequest={(r) => { setSelectedRequest(r); navigate(`/admin/chamados/${r.id}`); }} />} />
        <Route path="empresa" element={<CompanyProfile currentUser={currentUser!} />} />
        <Route path="empresa/editar" element={<CompanyEdit currentUser={currentUser!} />} />
        <Route path="clientes" element={<ClientManager currentUser={currentUser!} />} />
        <Route path="clientes/novo" element={<ClientForm currentUser={currentUser!} />} />
        <Route path="clientes/:id/editar" element={<ClientForm currentUser={currentUser!} />} />
        <Route path="tecnicos" element={<TechnicianManager currentUser={currentUser!} />} />
        <Route path="tecnicos/novo" element={<TechnicianForm currentUser={currentUser!} />} />
        <Route path="tecnicos/:id/editar" element={<TechnicianForm currentUser={currentUser!} />} />
        <Route path="usuarios" element={<UserManager currentUser={currentUser!} />} />
        <Route path="usuarios/novo" element={<UserForm currentUser={currentUser!} />} />
        <Route path="usuarios/:id/editar" element={<UserForm currentUser={currentUser!} />} />
        <Route path="financeiro" element={<Finance />} />
        <Route path="fiscal" element={<FiscalSettings currentUser={currentUser!} />} />
        <Route path="auditoria" element={<AuditPanel />} />
        <Route path="configuracoes" element={<SystemSettings />} />
        <Route path="qrcode" element={<QRCodeGenerator />} />
        <Route path="system" element={<SystemStatus />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={
        currentUser ? <Navigate to={`/${getRolePrefix(currentUser.role)}`} replace /> : <Navigate to="/login" replace />
      } />
    </Routes>
  );
};
