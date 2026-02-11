
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole, ServiceRequest, RequestStatus, TimelineEvent } from './types';
import { apiService } from './services/apiService';
import { wsService } from './services/websocketService';
import { NotificationToast } from './components/NotificationToast';
import { AppRoutes, getRolePrefix } from './components/AppRoutes';

// ============================================
// MAIN APP COMPONENT
// ============================================
const App: React.FC = () => {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [logs, setLogs] = useState<TimelineEvent[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Array<{ id: string, title: string, message: string, severity: 'info' | 'warning' | 'success' }>>(() => {
    try {
      const saved = localStorage.getItem('app_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse notifications from localStorage:', e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('app_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Check auth on mount
  useEffect(() => {
    // Sync API service state clears with App user state
    apiService.onUnauthorized = () => {
      setCurrentUser(null);
      navigate('/login');
    };

    const storedUser = apiService.getStoredUser();
    if (storedUser && apiService.isAuthenticated()) {
      setCurrentUser(storedUser);
      // Enforce password change on reload
      if (storedUser.mustChangePassword && window.location.pathname !== '/force-change-password') {
        navigate('/force-change-password');
      }
    }
    setIsLoading(false);

    return () => {
      apiService.onUnauthorized = null;
    };
  }, [navigate]);

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
        setRequests(prev => {
          if (prev.some(r => r.id === data.id)) return prev;
          return [data, ...prev];
        });
        // Use request ID as notification ID to prevent duplicates if replayed
        const notifId = `req-created-${data.id}`;
        setNotifications(prev => {
           if (prev.some(n => n.id === notifId)) return prev;
           return [{ id: notifId, title: 'Nova Solicitação', message: `Cliente ${data.clientName} abriu um novo chamado.`, severity: 'warning' }, ...prev];
        });
      });

      const unsubUpdate = wsService.on('request:updated', (data) => {
        setRequests(prev => prev.map(r => r.id === data.id ? data : r));
      });

      const unsubStatus = wsService.on('request:status_changed', (data) => {
        setRequests(prev => prev.map(r =>
          r.id === data.id ? { ...r, status: data.newStatus } : r
        ));
         // Add to notification list
        const notifId = `req-status-${data.id}-${data.newStatus}-${Date.now()}`; // Unique enough
        setNotifications(prev => {
            return [{ id: notifId, title: 'Status Atualizado', message: `OS #${data.id.slice(0,8)} agora está ${data.newStatus}.`, severity: 'info' }, ...prev];
        });
      });

      const unsubAssign = wsService.on('request:assigned', (data) => {
        setRequests(prev => prev.map(r =>
          r.id === data.id ? { ...r, responsibleId: data.responsibleId, responsibleName: data.responsibleName } : r
        ));
        // Add to notification list
        const notifId = `req-assign-${data.id}-${data.responsibleId}-${Date.now()}`;
        setNotifications(prev => {
            return [{ id: notifId, title: 'Técnico Atribuído', message: `Chamado atribuído a ${data.responsibleName}.`, severity: 'info' }, ...prev];
        });
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

      // Check for forced password change
      if (response.data.user.mustChangePassword) {
        navigate('/force-change-password');
        return response;
      }

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
        serviceType: newReq.serviceType,
        description: newReq.description,
      });
      setRequests([created, ...requests]);
      const prefix = getRolePrefix(currentUser.role);
      navigate(`/${prefix}/chamados`);
    } catch (err) {
      console.error('Failed to create request:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-3xl"></div>
        <div className="text-center relative z-10 p-8 rounded-3xl bg-slate-800/50 shadow-2xl border border-white/5 backdrop-blur-xl">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-white rounded-full animate-spin mx-auto mb-6 shadow-cyan-500/50 shadow-lg"></div>
          <p className="text-cyan-300 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Carregando Sistema</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <NotificationToast onSelect={(id) => {
        const req = requests.find(r => r.id === id);
        if (req && currentUser) {
          setSelectedRequest(req);
          navigate(`/${getRolePrefix(currentUser.role)}/chamados/${req.id}`);
        }
      }} />

      <AppRoutes
        currentUser={currentUser}
        requests={requests}
        onLogin={handleLogin}
        onLogout={handleLogout}
        notifications={notifications}
        onUpdateUser={setCurrentUser}
        handleCreateRequest={handleCreateRequest}
        handleUpdateStatus={handleUpdateStatus}
        setSelectedRequest={setSelectedRequest}
        selectedRequest={selectedRequest}
      />
    </>
  );
};

export default App;
