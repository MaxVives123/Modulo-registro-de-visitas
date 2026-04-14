const API = {
  baseUrl: '/api',
  token: localStorage.getItem('token'),

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutMs = 20000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, headers, signal: controller.signal });

      if (response.status === 401) {
        const data = await response.json().catch(() => ({}));
        const isLoginAttempt = endpoint.includes('/auth/login') && (options.method || 'GET').toUpperCase() === 'POST';
        if (isLoginAttempt) {
          throw { status: 401, ...data };
        }
        this.setToken(null);
        localStorage.removeItem('user');
        throw { status: 401, error: data.error || 'Sesión expirada o no válida. Vuelve a iniciar sesión.' };
      }

      if (response.headers.get('content-type')?.includes('text/csv')) {
        return response;
      }

      const data = await response.json();

      if (!response.ok) {
        throw { status: response.status, ...data };
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw { error: `Tiempo de espera agotado (${timeoutMs / 1000}s). Revisa tu conexión o el servidor.` };
      }
      if (error.status) throw error;
      throw { error: 'Error de conexión con el servidor' };
    } finally {
      clearTimeout(timeoutId);
    }
  },

  get(endpoint) {
    return this.request(endpoint);
  },

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  // Auth
  login(username, password) {
    return this.post('/auth/login', { username, password });
  },
  registerCompany(data) {
    return this.post('/auth/register-company', data);
  },

  // Dashboard
  getStats() { return this.get('/dashboard/stats'); },
  getActivity(days = 7) { return this.get(`/dashboard/activity?days=${days}`); },
  getDestinationChart() { return this.get('/dashboard/destinations'); },
  getRecentVisits() { return this.get('/dashboard/recent'); },

  // Visits
  getVisits(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
    return this.get(`/visits?${query.toString()}`);
  },
  getVisit(id) { return this.get(`/visits/${id}`); },
  createVisit(data) { return this.post('/visits', data); },
  updateVisit(id, data) { return this.put(`/visits/${id}`, data); },
  deleteVisit(id) { return this.delete(`/visits/${id}`); },
  checkIn(id) { return this.post(`/visits/${id}/checkin`); },
  checkOut(id) { return this.post(`/visits/${id}/checkout`); },
  getDestinations() { return this.get('/visits/destinations'); },

  // Users (admin)
  getUsers() { return this.get('/users'); },
  getUser(id) { return this.get(`/users/${id}`); },
  createUser(data) { return this.post('/users', data); },
  updateUser(id, data) { return this.put(`/users/${id}`, data); },
  changeUserPassword(id, password) { return this.put(`/users/${id}/password`, { password }); },
  deleteUser(id) { return this.delete(`/users/${id}`); },

  // Notifications
  getNotifications(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
    return this.get(`/notifications?${query.toString()}`);
  },
  getUnreadCount() { return this.get('/notifications/unread-count'); },
  markNotifRead(id) { return this.put(`/notifications/${id}/read`); },
  markAllNotifsRead() { return this.put('/notifications/read-all'); },

  // Companies
  getCompanies(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') query.set(k, v); });
    const qs = query.toString();
    return this.get(`/companies${qs ? '?' + qs : ''}`);
  },
  getCompany(id) { return this.get(`/companies/${id}`); },
  createCompany(data) { return this.post('/companies', data); },
  updateCompany(id, data) { return this.put(`/companies/${id}`, data); },
  deleteCompany(id) { return this.delete(`/companies/${id}`); },

  // Evacuation
  triggerEvacuation(data) { return this.post('/evacuation/trigger', data); },
  closeEvacuation(id) { return this.post(`/evacuation/${id}/close`, {}); },
  getActiveEvacuation() { return this.get('/evacuation/active'); },
  getEvacuationRollcall(id) { return this.get(`/evacuation/${id}/rollcall`); },
  getPresentNow(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
    return this.get(`/evacuation/present-now?${query.toString()}`);
  },
  getEvacuationHistory() { return this.get('/evacuation/history'); },
  async exportRollcallCSV(id) {
    const url = `${this.baseUrl}/evacuation/${id}/rollcall?format=csv`;
    const headers = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw { error: 'Error al exportar recuento' };
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `recuento_evacuacion_${id}.csv`;
    a.click();
    window.URL.revokeObjectURL(blobUrl);
  },

  // Integrations (para panel admin)
  getIntegrationsStatus() { return this.get('/integrations/status'); },
  testIntegrationNotify(data) { return this.post('/integrations/notify', data); },

  // QR
  generateQR(id) { return this.get(`/qr/generate/${id}`); },
  getCredential(id) { return this.get(`/qr/credential/${id}`); },

  async exportPDF(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
    const url = `${this.baseUrl}/visits/export/pdf?${query.toString()}`;
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw { error: 'Error al exportar PDF' };
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `visitas_${new Date().toISOString().split('T')[0]}.pdf`;
    a.click();
    window.URL.revokeObjectURL(blobUrl);
  },

  async exportVisitPDF(id) {
    const url = `${this.baseUrl}/visits/${id}/pdf`;
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw { error: 'Error al exportar PDF' };
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `visita_${id}.pdf`;
    a.click();
    window.URL.revokeObjectURL(blobUrl);
  },

  async exportExcel(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
    const url = `${this.baseUrl}/visits/export/xlsx?${query.toString()}`;
    const headers = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw { error: data.error || 'Error al exportar Excel' };
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `visitas_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(blobUrl);
  },
};
