
import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { User, UserRole, ServiceRequest, TimelineEvent } from '@/shared/types';

// Components
import { Layout } from '@/shared/components/Layout';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { RequestFlow } from '@/features/requests/RequestFlow';
import { RequestDetail } from '@/features/requests/RequestDetail';
import { RequestListPage } from '@/features/requests/RequestListPage';
import { EquipmentManager } from '@/features/resources/equipments/EquipmentManager';
import { ClientManager } from '@/features/resources/clients/ClientManager';
import { UserManager } from '@/features/resources/users/UserManager';
import { TechnicianManager } from '@/features/resources/technicians/TechnicianManager';
import { SystemSettings } from '@/shared/pages/SystemSettings';
import { AuditPanel } from '@/shared/pages/AuditPanel';
import { Agenda } from '@/features/agenda/Agenda';
import { Finance } from '@/features/finance/Finance';
import { Profile } from '@/features/auth/Profile';
import { ProfileEdit } from '@/features/auth/ProfileEdit';
import { CompanyProfile } from '@/features/resources/company/CompanyProfile';
import { CompanyEdit } from '@/features/resources/company/CompanyEdit';
import { ClientForm } from '@/features/resources/clients/ClientForm';
import { EquipmentForm } from '@/features/resources/equipments/EquipmentForm';
import { TechnicianForm } from '@/features/resources/technicians/TechnicianForm';
import { UserForm } from '@/features/resources/users/UserForm';
import { Login } from '@/features/auth/Login';
import { Register } from '@/features/auth/Register';
import { NotificationsPage } from '@/shared/pages/NotificationsPage';
import { PrivacyPage } from '@/shared/pages/PrivacyPage';
import { HelpPage } from '@/shared/pages/HelpPage';
import { ForgotPassword } from '@/features/auth/ForgotPassword';
import { ResetPassword } from '@/features/auth/ResetPassword';
import { ForceChangePassword } from '@/features/auth/ForceChangePassword';
import { ServiceOrderPrint } from '@/features/requests/ServiceOrderPrint';
import { BudgetPrint } from '@/features/requests/BudgetPrint';
import SystemStatus from '@/features/dashboard/SystemStatus';
import { FiscalSettings } from '@/features/finance/FiscalSettings';
import { QRCodeManager } from '@/features/resources/equipments/QRCodeManager';

// ============================================
// ROLE PREFIX HELPER
// ============================================
export const getRolePrefix = (role: UserRole): string => {
  switch (role) {
    case UserRole.ADMIN: return 'admin';
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
// RequestListPage is now in its own file

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
  onRefreshRequests: (filters?: { onlyMine?: boolean }) => Promise<void>;
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
  selectedRequest,
  onRefreshRequests
}) => {
  const navigate = useNavigate();

  const filteredRequests = (currentUser?.role === UserRole.CLIENTE && currentUser?.id)
    ? (requests || []).filter(r => r.clientId === currentUser.id)
    : (requests || []);

  const renderCommonRoutes = (prefix: string) => [
    <React.Fragment key="dashboard">
      <Route index element={
        <Dashboard
          requests={filteredRequests}
          onSelectRequest={(r) => { setSelectedRequest(r); navigate(`/${prefix}/chamados/${r.id}`); }}
          currentUser={currentUser!}
          onNavigate={(path, state) => navigate(`/${prefix}/${path === 'dashboard' ? '' : path}`, { state })}
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
          currentUser={currentUser!}
          onRefreshRequests={onRefreshRequests}
        />
      } />
    </React.Fragment>,
    <React.Fragment key="chamados-novo">
      <Route path="chamados/novo" element={
        <RequestFlow
          currentUser={currentUser!}
          onCancel={() => navigate(`/${prefix}/chamados`)}
          onComplete={handleCreateRequest}
        />
      } />
    </React.Fragment>,
    <React.Fragment key="chamados-id">
      <Route path="chamados/:id" element={
        <RequestDetail
          request={selectedRequest!}
          currentUser={currentUser!}
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
      <Route path="/register" element={
        currentUser ? <Navigate to={`/${getRolePrefix(currentUser.role)}`} replace /> : <Register />
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
        <Route path="qrcode" element={<QRCodeManager />} />

      </Route>

      {/* ============================================ */}
      {/* ADMIN ROUTES */}
      {/* ============================================ */}
      <Route path="/admin" element={
        <RoleRouteGuard user={currentUser} expectedRole={UserRole.ADMIN}>
          <Layout user={currentUser!} onLogout={onLogout} notifications={notifications} rolePrefix="admin" />
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
        <Route path="qrcode" element={<QRCodeManager />} />
        <Route path="auditoria" element={<AuditPanel />} />
        <Route path="configuracoes" element={<SystemSettings />} />
        <Route path="system" element={<SystemStatus />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={
        currentUser ? <Navigate to={`/${getRolePrefix(currentUser.role)}`} replace /> : <Navigate to="/login" replace />
      } />
    </Routes>
  );
};
