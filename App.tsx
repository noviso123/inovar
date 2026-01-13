
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole, ServiceRequest, RequestStatus, TimelineEvent } from './types';
import { apiService } from './services/apiService';
import { wsService } from './services/websocketService';

// Components
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { RequestFlow } from './components/RequestFlow';
import { RequestDetail } from './components/RequestDetail';
import { EquipmentManager } from './components/EquipmentManager';
import { ClientManager } from './components/ClientManager';
import { UserManager } from './components/UserManager';
import { TechnicianManager } from './components/TechnicianManager';
import { SystemSettings } from './components/SystemSettings';
import { AuditPanel } from './components/AuditPanel';
import { Agenda } from './components/Agenda';
import { Finance } from './components/Finance';
import { Profile } from './components/Profile';
import { CompanyProfile } from './components/CompanyProfile';
import { MarketingQR } from './components/MarketingQR';
import { NotificationToast } from './components/NotificationToast';
import { Login } from './components/Login';

// ============================================
// ROLE PREFIX HELPER
// ============================================
const getRolePrefix = (role: UserRole): string => {
  switch (role) {
    case UserRole.ADMIN: return 'admin';
    case UserRole.PRESTADOR: return 'prestador';
    case UserRole.TECNICO: return 'tecnico';
    case UserRole.CLIENTE: return 'cliente';
    default: return 'cliente';
  }
};

// ============================================
// PROTECTED ROUTE WRAPPER
// ============================================
const ProtectedRoute: React.FC<{ children: React.ReactNode; user: User | null; allowedRoles?: UserRole[] }> =
  ({ children, user, allowedRoles }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${getRolePrefix(user.role)}`} replace />;
  }
  return <>{children}</>;
};

// ============================================
// ROLE ROUTE GUARD - Ensures user is on correct role prefix
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
                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                  req.status === RequestStatus.ABERTA ? 'bg-blue-100 text-blue-700' :
                  req.status === RequestStatus.EM_ANDAMENTO ? 'bg-amber-100 text-amber-700' :
                  req.status === RequestStatus.CONCLUIDA ? 'bg-emerald-100 text-emerald-700' :
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

// ============================================
// MAIN APP COMPONENT
// ============================================
const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [logs, setLogs] = useState<TimelineEvent[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Array<{id: string, title: string, message: string, severity: 'info' | 'warning' | 'success'}>>([]);

  // Check auth on mount
  useEffect(() => {
    const storedUser = apiService.getStoredUser();
    if (storedUser && apiService.isAuthenticated()) {
      setCurrentUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  // Load requests when authenticated
  const loadRequests = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await apiService.getRequests();
      setRequests(data);
    } catch (err) {
      console.error('Failed to load requests:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadRequests();
    }
  }, [currentUser, loadRequests]);

  // WebSocket connection
  useEffect(() => {
    if (currentUser) {
      wsService.connect(currentUser.id, currentUser.role, currentUser.companyId);

      const unsubCreate = wsService.on('request:created', (data) => {
        setRequests(prev => [data, ...prev]);
        setNotifications(prev => [{id: Math.random().toString(), title: 'Nova Solicitação', message: `Cliente ${data.clientName} abriu um novo chamado.`, severity: 'warning'}, ...prev]);
      });

      const unsubUpdate = wsService.on('request:updated', (data) => {
        setRequests(prev => prev.map(r => r.id === data.id ? data : r));
      });

      const unsubStatus = wsService.on('request:status_changed', (data) => {
        setRequests(prev => prev.map(r =>
          r.id === data.id ? { ...r, status: data.newStatus } : r
        ));
      });

      const unsubAssign = wsService.on('request:assigned', (data) => {
        setRequests(prev => prev.map(r =>
          r.id === data.id ? { ...r, responsibleId: data.responsibleId, responsibleName: data.responsibleName } : r
        ));
      });

      return () => {
        unsubCreate();
        unsubUpdate();
        unsubStatus();
        unsubAssign();
        wsService.disconnect();
      };
    }
  }, [currentUser]);

  // Auth handlers
  const handleLogin = async (email: string, password: string) => {
    const response = await apiService.login(email, password);
    if (response.success) {
      setCurrentUser(response.data.user);
      // Redirect to role-specific dashboard
      const prefix = getRolePrefix(response.data.user.role);
      navigate(`/${prefix}`);
    }
    return response;
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setCurrentUser(null);
      setRequests([]);
      setLogs([]);
      navigate('/login');
    }
  };

  // Request handlers
  const handleUpdateStatus = async (requestId: string, newStatus: RequestStatus, responsibleId?: string, responsibleName?: string) => {
    if (!currentUser) return;
    try {
      if (responsibleId && responsibleName) {
        await apiService.assignRequest(requestId, responsibleId, responsibleName);
      }
      await apiService.updateRequestStatus(requestId, newStatus);
      setRequests(prev => prev.map(r => {
        if (r.id === requestId) {
          const updated = { ...r, status: newStatus };
          if (responsibleId) updated.responsibleId = responsibleId;
          if (responsibleName) updated.responsibleName = responsibleName;
          return updated;
        }
        return r;
      }));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleCreateRequest = async (newReq: ServiceRequest) => {
    if (!currentUser) return;
    try {
      const created = await apiService.createRequest({
        clientId: newReq.clientId,
        equipmentIds: newReq.equipmentIds,
        priority: newReq.priority,
        description: newReq.description,
      });
      setRequests([created, ...requests]);
      const prefix = getRolePrefix(currentUser.role);
      navigate(`/${prefix}/chamados`);
    } catch (err) {
      console.error('Failed to create request:', err);
    }
  };

  const filteredRequests = currentUser?.role === UserRole.CLIENTE
    ? requests.filter(r => r.clientId === currentUser.id)
    : requests;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cyan-400 font-bold uppercase tracking-widest text-xs">Carregando...</p>
        </div>
      </div>
    );
  }

  // Get current role prefix for navigation
  const rolePrefix = currentUser ? getRolePrefix(currentUser.role) : '';

  // ============================================
  // COMMON ROUTES FOR ALL ROLES
  // ============================================
  const CommonRoutes: React.FC<{ prefix: string; expectedRole: UserRole }> = ({ prefix, expectedRole }) => (
    <>
      {/* Dashboard */}
      <Route index element={
        <Dashboard
          requests={filteredRequests}
          onSelectRequest={(r) => { setSelectedRequest(r); navigate(`/${prefix}/chamados/${r.id}`); }}
          currentUser={currentUser!}
          onNavigate={(tab) => navigate(`/${prefix}/${tab === 'dashboard' ? '' : tab}`)}
        />
      } />

      {/* Chamados */}
      <Route path="chamados" element={
        <RequestListPage
          requests={filteredRequests}
          onSelectRequest={(r) => { setSelectedRequest(r); navigate(`/${prefix}/chamados/${r.id}`); }}
          onCreateNew={() => navigate(`/${prefix}/chamados/novo`)}
          rolePrefix={prefix}
        />
      } />
      <Route path="chamados/novo" element={
        <RequestFlow
          currentUser={currentUser!}
          onCancel={() => navigate(`/${prefix}/chamados`)}
          onComplete={handleCreateRequest}
        />
      } />
      <Route path="chamados/:id" element={
        <RequestDetail
          request={selectedRequest!}
          currentUser={currentUser!}
          onUpdateStatus={(st) => selectedRequest && handleUpdateStatus(selectedRequest.id, st)}
          onClose={() => { setSelectedRequest(null); navigate(`/${prefix}/chamados`); }}
        />
      } />

      {/* Perfil */}
      <Route path="perfil" element={
        <Profile user={currentUser!} onUpdateUser={setCurrentUser} />
      } />

      {/* Máquinas/Equipamentos */}
      <Route path="maquinas" element={
        <EquipmentManager currentUser={currentUser!} />
      } />
    </>
  );

  // ============================================
  // ROUTES
  // ============================================
  return (
    <>
      <NotificationToast onSelect={(id) => {
        const req = requests.find(r => r.id === id);
        if (req && currentUser) {
          setSelectedRequest(req);
          navigate(`/${getRolePrefix(currentUser.role)}/chamados/${req.id}`);
        }
      }} />

      <Routes>
        {/* Public Route */}
        <Route path="/login" element={
          currentUser ? <Navigate to={`/${getRolePrefix(currentUser.role)}`} replace /> : <Login onLogin={handleLogin} />
        } />

        {/* Default redirect */}
        <Route path="/" element={
          currentUser ? <Navigate to={`/${getRolePrefix(currentUser.role)}`} replace /> : <Navigate to="/login" replace />
        } />

        {/* ============================================ */}
        {/* CLIENTE ROUTES */}
        {/* ============================================ */}
        <Route path="/cliente" element={
          <RoleRouteGuard user={currentUser} expectedRole={UserRole.CLIENTE}>
            <Layout user={currentUser!} onLogout={handleLogout} notifications={notifications} rolePrefix="cliente" />
          </RoleRouteGuard>
        }>
          <CommonRoutes prefix="cliente" expectedRole={UserRole.CLIENTE} />
        </Route>

        {/* ============================================ */}
        {/* TECNICO ROUTES */}
        {/* ============================================ */}
        <Route path="/tecnico" element={
          <RoleRouteGuard user={currentUser} expectedRole={UserRole.TECNICO}>
            <Layout user={currentUser!} onLogout={handleLogout} notifications={notifications} rolePrefix="tecnico" />
          </RoleRouteGuard>
        }>
          <CommonRoutes prefix="tecnico" expectedRole={UserRole.TECNICO} />
          <Route path="agenda" element={<Agenda requests={requests} onSelectRequest={(r) => { setSelectedRequest(r); navigate(`/tecnico/chamados/${r.id}`); }} />} />
          <Route path="clientes" element={<ClientManager currentUser={currentUser!} />} />
        </Route>

        {/* ============================================ */}
        {/* PRESTADOR ROUTES */}
        {/* ============================================ */}
        <Route path="/prestador" element={
          <RoleRouteGuard user={currentUser} expectedRole={UserRole.PRESTADOR}>
            <Layout user={currentUser!} onLogout={handleLogout} notifications={notifications} rolePrefix="prestador" />
          </RoleRouteGuard>
        }>
          <CommonRoutes prefix="prestador" expectedRole={UserRole.PRESTADOR} />
          <Route path="agenda" element={<Agenda requests={requests} onSelectRequest={(r) => { setSelectedRequest(r); navigate(`/prestador/chamados/${r.id}`); }} />} />
          <Route path="empresa" element={<CompanyProfile currentUser={currentUser!} />} />
          <Route path="clientes" element={<ClientManager currentUser={currentUser!} />} />
          <Route path="tecnicos" element={<TechnicianManager currentUser={currentUser!} />} />
          <Route path="usuarios" element={<UserManager currentUser={currentUser!} />} />
          <Route path="financeiro" element={<Finance />} />
          <Route path="marketing" element={<MarketingQR currentUser={currentUser!} />} />
        </Route>

        {/* ============================================ */}
        {/* ADMIN ROUTES */}
        {/* ============================================ */}
        <Route path="/admin" element={
          <RoleRouteGuard user={currentUser} expectedRole={UserRole.ADMIN}>
            <Layout user={currentUser!} onLogout={handleLogout} notifications={notifications} rolePrefix="admin" />
          </RoleRouteGuard>
        }>
          <CommonRoutes prefix="admin" expectedRole={UserRole.ADMIN} />
          <Route path="agenda" element={<Agenda requests={requests} onSelectRequest={(r) => { setSelectedRequest(r); navigate(`/admin/chamados/${r.id}`); }} />} />
          <Route path="empresa" element={<CompanyProfile currentUser={currentUser!} />} />
          <Route path="clientes" element={<ClientManager currentUser={currentUser!} />} />
          <Route path="tecnicos" element={<TechnicianManager currentUser={currentUser!} />} />
          <Route path="usuarios" element={<UserManager currentUser={currentUser!} />} />
          <Route path="financeiro" element={<Finance />} />
          <Route path="marketing" element={<MarketingQR currentUser={currentUser!} />} />
          <Route path="auditoria" element={<AuditPanel currentUser={currentUser!} />} />
          <Route path="configuracoes" element={<SystemSettings />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={
          currentUser ? <Navigate to={`/${getRolePrefix(currentUser.role)}`} replace /> : <Navigate to="/login" replace />
        } />
      </Routes>
    </>
  );
};

export default App;
