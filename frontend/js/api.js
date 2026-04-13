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

  // QR
  generateQR(id) { return this.get(`/qr/generate/${id}`); },
  getCredential(id) { return this.get(`/qr/credential/${id}`); },

  async exportCSV(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
    const response = await this.request(`/visits/export/csv?${query.toString()}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
};
