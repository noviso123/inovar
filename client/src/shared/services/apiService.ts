// API Service for INOVAR Backend
// Replaces localStorage with real API calls

const API_BASE = import.meta.env.VITE_API_URL || '/api';
console.log('🚀 INOVAR API_BASE:', API_BASE);

import { ServiceRequest, User, UserRole } from '../types';

interface AuthResponse {
  success: boolean;
  data: {
    user: any;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      cache: 'no-store', // Prevent browser caching (fix for ghost data)
    });

    // Handle token expiration
    if (response.status === 401) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        // Retry request with new token
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });

        if (retryResponse.status === 204) return {} as T;
        return retryResponse.json();
      } else {
        // Clear tokens and redirect to login
        this.clearTokens();
        window.location.reload();
        throw new Error('Session expired');
      }
    }

    if (response.status === 204) return {} as T;
    const data = await response.json();

    if (!response.ok || (data && data.success === false)) {
      throw new Error(data.message || data.error || 'Request failed');
    }

    return data;
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setAccessToken(data.accessToken);
        return true;
      }
    } catch (e) {
      console.error('Token refresh failed:', e);
    }

    return false;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
    localStorage.setItem('accessToken', token);
  }

  getAccessToken(): string | null {
    return this.accessToken || localStorage.getItem('accessToken');
  }

  private setRefreshToken(token: string) {
    this.refreshToken = token;
    localStorage.setItem('refreshToken', token);
  }

  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
  }

  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    // Clear any existing tokens before login attempt
    // This prevents "Session expired" error from stale tokens
    this.clearTokens();

    try {
      // Direct fetch for login - don't use this.request() as it tries to refresh old tokens
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          data: data,
          message: data.message || 'Credenciais inválidas',
        } as AuthResponse;
      }

      if (data.success) {
        this.setAccessToken(data.data.accessToken);
        this.setRefreshToken(data.data.refreshToken);
        localStorage.setItem('currentUser', JSON.stringify(data.data.user));
      }

      return data;
    } catch (error) {
      console.error('🚨 Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.request('/logout', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }

  async getCurrentUser(): Promise<any> {
    const response = await this.request<{ data: any }>('/me');
    // Sync to localStorage to ensure fresh state on reload (crucial for MustChangePassword)
    if (response.data) {
      localStorage.setItem('currentUser', JSON.stringify(response.data));
    }
    return response.data;
  }

  async updateProfile(data: any): Promise<any> {
    const response = await this.request<{ data: any }>('/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    // Sync updated user to localStorage so it persists on reload
    const updatedUser = response.data;
    if (updatedUser) {
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }

    return updatedUser;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.request('/me/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Users
  async getUsers(): Promise<any[]> {
    const response = await this.request<{ data: any[] }>('/users');
    return response.data;
  }

  async createUser(data: any): Promise<any> {
    const response = await this.request<{ data: any }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateUser(id: string, data: any): Promise<any> {
    const response = await this.request<{ data: any }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async blockUser(id: string): Promise<any> {
    const response = await this.request<{ data: any }>(`/users/${id}/block`, {
      method: 'PATCH',
    });
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await this.request(`/users/${id}`, { method: 'DELETE' });
  }

  async adminResetPassword(id: string): Promise<any> {
    const response = await this.request<{ data: any }>(`/users/${id}/reset-password`, {
      method: 'POST',
    });
    return response.data;
  }

  // Clients
  async getClients(): Promise<any[]> {
    const response = await this.request<{ data: any[] }>('/clients');
    return response.data || [];
  }

  async createClient(data: any): Promise<any> {
    const response = await this.request<{ data: any }>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateClient(id: string, data: any): Promise<any> {
    const response = await this.request<{ data: any }>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async blockClient(id: string): Promise<any> {
    const response = await this.request<{ data: any }>(`/clients/${id}/block`, {
      method: 'PATCH',
    });
    return response.data;
  }

  async deleteRequest(id: string): Promise<void> {
    await this.request<void>(`/requests/${id}`, { method: 'DELETE' });
  }

  // Client Deletion
  async deleteClient(id: string): Promise<void> {
    await this.request<void>(`/clients/${id}`, { method: 'DELETE' });
  }

  // Equipment
  async getEquipments(clientId?: string, activeOnly = true): Promise<any[]> {
    const params = new URLSearchParams();
    if (clientId) params.append('clientId', clientId);
    params.append('activeOnly', String(activeOnly));

    const response = await this.request<{ data: any[] }>(`/equipments?${params}`);
    return response.data || [];
  }

  async createEquipment(data: any): Promise<any> {
    const response = await this.request<{ data: any }>('/equipments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateEquipment(id: string, data: any): Promise<any> {
    const response = await this.request<{ data: any }>(`/equipments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deactivateEquipment(id: string): Promise<any> {
    const response = await this.request<{ data: any }>(`/equipments/${id}/deactivate`, {
      method: 'PATCH',
    });
    return response.data;
  }

  async reactivateEquipment(id: string): Promise<any> {
    const response = await this.request<{ data: any }>(`/equipments/${id}/reactivate`, {
      method: 'PATCH',
    });
    return response.data;
  }

  async deleteEquipment(id: string): Promise<void> {
    await this.request(`/equipments/${id}`, { method: 'DELETE' });
  }

  // Custom QR Codes
  async getCustomQRs(): Promise<any[]> {
    const response = await this.request<{ data: any[] }>('/equipments/custom');
    return response.data || [];
  }

  async createCustomQR(data: any): Promise<any> {
    const response = await this.request<{ data: any }>('/equipments/custom', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deleteCustomQR(id: string): Promise<void> {
    await this.request(`/equipments/custom/${id}`, { method: 'DELETE' });
  }

  // Requests
  async getRequests(filters?: { status?: string; priority?: string; clientId?: string; onlyMine?: boolean }): Promise<ServiceRequest[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.clientId) params.append('clientId', filters.clientId);
    if (filters?.onlyMine) params.append('onlyMine', 'true');

    const response = await this.request<{ data: ServiceRequest[] }>(`/requests?${params}`);
    return response.data || [];
  }

  async createRequest(data: Partial<ServiceRequest>): Promise<ServiceRequest> {
    const response = await this.request<{ data: ServiceRequest }>('/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async getRequest(id: string): Promise<any> {
    const response = await this.request<{ data: any }>(`/requests/${id}`);
    return response.data;
  }

  async updateRequestStatus(id: string, status: string, observation?: string, materialsUsed?: string, nextMaintenanceAt?: string, scheduledAt?: string, preventiveDone?: boolean): Promise<any> {
    const response = await this.request<{ data: any }>(`/requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, observation, materialsUsed, nextMaintenanceAt, scheduledAt, preventiveDone }),
    });
    return response.data;
  }

  async updateRequestDetails(id: string, details: { responsibleId?: string; responsibleName?: string; priority?: string }): Promise<any> {
    const response = await this.request<{ data: any }>(`/requests/${id}/details`, {
      method: 'PATCH',
      body: JSON.stringify(details),
    });
    return response.data;
  }


  // Checklists
  async getChecklists(requestId: string): Promise<any[]> {
      const response = await this.request<{ data: any[] }>(`/requests/${requestId}/checklists`);
      return response.data || [];
  }

  async createChecklist(requestId: string, item: { description: string }): Promise<any> {
      const response = await this.request<{ data: any }>(`/requests/${requestId}/checklists`, {
          method: 'POST',
          body: JSON.stringify(item)
      });
      return response.data;
  }

  async updateChecklist(requestId: string, itemId: string, updates: { checked: boolean; observation?: string }): Promise<any> {
      const response = await this.request<{ data: any }>(`/requests/${requestId}/checklists/${itemId}`, {
          method: 'PATCH',
          body: JSON.stringify(updates)
      });
      return response.data;
  }

  async deleteChecklist(requestId: string, itemId: string): Promise<void> {
      await this.request(`/requests/${requestId}/checklists/${itemId}`, {
          method: 'DELETE'
      });
  }

  async assignRequest(id: string, responsibleId: string, responsibleName: string): Promise<any> {
    const response = await this.request<{ data: any }>(`/requests/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ responsibleId, responsibleName }),
    });
    return response.data;
  }

  async confirmRequest(id: string): Promise<any> {
    const response = await this.request<{ data: any }>(`/requests/${id}/confirm`, {
      method: 'POST',
    });
    return response.data;
  }

  async getRequestHistory(id: string): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(`/requests/${id}/history`);
    return response.data || [];
  }

  // Budget/Orcamento
  async getOrcamentoSugestoes(): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(`/requests/orcamento/sugestoes`);
    return response.data;
  }

  async addOrcamentoItem(requestId: string, item: { descricao: string; quantidade: number; valorUnit: number; tipo: string }): Promise<any> {
    const response = await this.request<{ data: any }>(`/requests/${requestId}/orcamento/itens`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
    return response.data;
  }

  async removeOrcamentoItem(requestId: string, itemId: string): Promise<void> {
    await this.request(`/requests/${requestId}/orcamento/itens/${itemId}`, {
      method: 'DELETE',
    });
  }

  async aprovarOrcamento(requestId: string): Promise<void> {
    await this.request(`/requests/${requestId}/orcamento/aprovar`, {
      method: 'POST',
    });
  }

  // Signatures
  async salvarAssinatura(requestId: string, assinatura: string, tipo: 'cliente' | 'tecnico'): Promise<void> {
    await this.request(`/requests/${requestId}/assinatura`, {
      method: 'POST',
      body: JSON.stringify({ assinatura, tipo }),
    });
  }

  // NFS-e
  async issueNFSe(requestId: string): Promise<any> {
    const response = await this.request<{ data: any }>(`/requests/${requestId}/nfse`, {
      method: 'POST',
    });
    return response.data;
  }

  async cancelNFSe(requestId: string): Promise<void> {
    await this.request(`/requests/${requestId}/nfse`, {
      method: 'DELETE',
    });
  }

  async getNFSe(requestId: string): Promise<any> {
    const response = await this.request<{ data: any }>(`/requests/${requestId}/nfse`);
    return response.data;
  }

  async getDANFSe(requestId: string): Promise<string> {
    const response = await fetch(`${API_BASE}/requests/${requestId}/nfse/danfse`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    if (!response.ok) throw new Error('Falha ao obter DANFS-e');
    return response.text();
  }

  async getNFSeEventos(requestId: string): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(`/requests/${requestId}/nfse/eventos`);
    return response.data;
  }

  async cancelNFSeWithMotivo(requestId: string, motivo: number, justificativa?: string): Promise<any> {
    const response = await this.request<{ data: any }>(`/requests/${requestId}/nfse/cancelar`, {
      method: 'POST',
      body: JSON.stringify({ motivo, justificativa }),
    });
    return response.data;
  }

  async getFiscalConfig(): Promise<any> {
    const response = await this.request<{ data: any }>('/fiscal/config');
    return response.data;
  }

  async updateFiscalConfig(data: any): Promise<any> {
    const response = await this.request<{ data: any }>('/fiscal/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }


  // Attachments
  async getAttachments(requestId: string): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(`/requests/${requestId}/attachments`);
    console.log('📂 Attachments:', response.data);
    return response.data || [];
  }

  async uploadAttachment(requestId: string, file: File, type?: string, contextId?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (type) formData.append('type', type);
    if (contextId) formData.append('contextId', contextId);

    const response = await this.upload(`/requests/${requestId}/attachments`, formData);
    return response.data;
  }

  // Public Upload Method with Auth and Refresh Handling
  async upload<T = any>(endpoint: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {};

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const performRequest = () => fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    let response = await performRequest();

    // Handle 401 (Token Expired)
    if (response.status === 401) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        response = await performRequest();
      } else {
        this.clearTokens();
        window.location.reload();
        throw new Error('Session expired');
      }
    }

    const data = await response.json();

    if (!response.ok || (data && data.success === false)) {
      throw new Error(data.message || data.error || 'Upload failed');
    }

    return data;
  }

  async deleteAttachment(requestId: string, id: string): Promise<void> {
    await this.request(`/requests/${requestId}/attachments/${id}`, { method: 'DELETE' });
  }

  // Agenda
  async getAgenda(filters?: { start?: string; end?: string; technicianId?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.start) params.append('start', filters.start);
    if (filters?.end) params.append('end', filters.end);
    if (filters?.technicianId) params.append('technicianId', filters.technicianId);

    const response = await this.request<{ data: any[] }>(`/agenda?${params}`);
    return response.data || [];
  }

  async createAgendaEntry(data: any): Promise<any> {
    const response = await this.request<{ data: any }>('/agenda', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async updateAgendaEntry(id: string, data: any): Promise<any> {
    const response = await this.request<{ data: any }>(`/agenda/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  }

  async deleteAgendaEntry(id: string): Promise<void> {
    await this.request(`/agenda/${id}`, { method: 'DELETE' });
  }

  // Finance
  async getFinanceSummary(): Promise<any> {
    const response = await this.request<{ data: any }>('/finance/summary');
    return response.data || {};
  }

  // Audit
  async getAuditLogs(filters?: { entity?: string; userId?: string; limit?: number }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.entity) params.append('entity', filters.entity);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await this.request<{ data: any[] }>(`/audit?${params}`);
    return response.data || [];
  }

  // Settings
  async getSettings(): Promise<Record<string, string>> {
    const response = await this.request<{ data: Record<string, string> }>('/settings');
    return response.data || {};
  }

  async updateSettings(settings: Record<string, string>): Promise<void> {
    await this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
  }

  // Company (Prestador)
  async getCompany(): Promise<any> {
    const response = await this.request<{ data: any }>('/company');
    return response.data || {};
  }

  async updateCompany(data: any): Promise<any> {
    const response = await this.request<{ data: any }>('/company', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data || {};
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Get stored user
  getStoredUser(): any | null {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  // ============================================
  // EXTRA ENDPOINTS (Backend-ready)
  // ============================================

  // Users - Get by ID
  async getUser(id: string): Promise<any> {
    const response = await this.request<{ data: any }>(`/users/${id}`);
    return response.data || {};
  }

  // Clients - Get by ID
  async getClient(id: string): Promise<any> {
    const response = await this.request<{ data: any }>(`/clients/${id}`);
    return response.data || {};
  }

  // Equipments - Get by ID
  async getEquipment(id: string): Promise<any> {
    const response = await this.request<{ data: any }>(`/equipments/${id}`);
    return response.data || {};
  }

  // Auth - Forgot Password (public endpoint)
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    return { success: response.ok, message: data.message || 'E-mail enviado com sucesso' };
  }

  // Auth - Reset Password (public endpoint)
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await response.json();
    return { success: response.ok, message: data.message || 'Senha alterada com sucesso' };
  }

  // Auth - Public Registration
  async register(data: any): Promise<{ success: boolean; message: string; user?: any }> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    return {
      success: response.ok,
      message: result.message || (response.ok ? 'Cadastro realizado!' : 'Falha no cadastro'),
      user: result.data?.user
    };
  }

  // Fiscal - Upload Certificate A1
  async uploadCertificate(file: File, password: string): Promise<any> {
    const formData = new FormData();
    formData.append('certificate', file);
    formData.append('password', password);

    const response = await fetch(`${API_BASE}/fiscal/certificate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.accessToken}` },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao enviar certificado');
    return data.data || {};
  }

  async getTaxRegimes(): Promise<any> {
    const response = await this.request<{ data: any }>('/fiscal/regimes');
    // Backend returns { regimes: [...], motivosCancelamento: [...] }
    return response.data || {};
  }

  async lookupCNPJ(cnpj: string): Promise<any> {
    const response = await this.request<{ data: any }>(`/fiscal/lookup/${cnpj}`);
    return response.data || {};
  }

  // Finance - List Transactions
  async getFinanceTransactions(): Promise<any[]> {
    const response = await this.request<{ data: any }>('/finance/transactions');
    // Backend reuses GetFinanceSummary, so we need to extract transactions if it returns the full object
    if (response.data && !Array.isArray(response.data) && response.data.transactions) {
      return response.data.transactions;
    }
    return (response.data as any[]) || [];
  }

  // Utils
  async searchCEP(cep: string): Promise<{ logradouro: string; bairro: string; localidade: string; uf: string; erro?: boolean }> {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) throw new Error('CEP inválido');

    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();

    if (data.erro) throw new Error('CEP não encontrado');

    return data;
  }
  // System Visibility
  async getSystemRoutes(): Promise<any[]> {
    const response = await this.request<{ data: any[] }>('/system/routes');
    return response.data || [];
  }

  async getSystemTables(): Promise<string[]> {
    const response = await this.request<{ data: string[] }>('/system/tables');
    return response.data || [];
  }

  async getSystemTableData(tableName: string): Promise<any[]> {
    const response = await this.request<{ data: any[] }>(`/system/tables/${tableName}`);
    return response.data || [];
  }

}

export const apiService = new ApiService();
