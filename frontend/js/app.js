const App = {
  currentPage: 'dashboard',
  charts: {},
  visitListParams: { page: 1, limit: 15 },
  editingVisitId: null,

  init() {
    if (API.token && localStorage.getItem('user')) {
      this.showApp();
      this.navigate('dashboard');
    } else {
      this.showLogin();
    }
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
    document.getElementById('visitForm').addEventListener('submit', (e) => this.handleVisitSubmit(e));
    document.getElementById('sidebarToggle').addEventListener('click', () => this.toggleSidebar());

    document.querySelectorAll('.sidebar-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(link.dataset.page);
        this.closeSidebar();
      });
    });

    document.getElementById('btnSearch').addEventListener('click', () => this.loadVisits());
    document.getElementById('btnClearFilters').addEventListener('click', () => this.clearFilters());
    document.getElementById('btnExportCSV').addEventListener('click', () => this.exportCSV());

    document.getElementById('searchInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.loadVisits();
    });

    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebarOverlay';
    overlay.addEventListener('click', () => this.closeSidebar());
    document.body.appendChild(overlay);

  },

  showLogin() {
    document.getElementById('loginScreen').classList.remove('d-none');
    document.getElementById('appLayout').classList.add('d-none');
  },

  showApp() {
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('appLayout').classList.remove('d-none');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('sidebarUserName').textContent = user.full_name || 'Usuario';
    document.getElementById('navUserName').textContent = user.full_name || 'Usuario';
  },

  async handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const spinner = document.getElementById('loginSpinner');
    const errorDiv = document.getElementById('loginError');
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;

    if (!username || !password) {
      errorDiv.textContent = 'Ingresa usuario y contraseña';
      errorDiv.classList.remove('d-none');
      return;
    }

    btn.disabled = true;
    spinner.classList.remove('d-none');
    errorDiv.classList.add('d-none');

    try {
      const data = await API.login(username, password);
      API.setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      this.showApp();
      this.navigate('dashboard');
    } catch (err) {
      errorDiv.textContent = err.error || 'Error al iniciar sesión';
      errorDiv.classList.remove('d-none');
    } finally {
      btn.disabled = false;
      spinner.classList.add('d-none');
    }
  },

  handleLogout() {
    API.setToken(null);
    localStorage.removeItem('user');
    this.showLogin();
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    document.getElementById('loginError').classList.add('d-none');
  },

  navigate(page) {
    this.currentPage = page;
    document.querySelectorAll('.page-content').forEach((p) => p.classList.add('d-none'));
    document.querySelectorAll('.sidebar-link').forEach((l) => l.classList.remove('active'));

    const titles = {
      dashboard: 'Dashboard',
      visits: 'Lista de Visitas',
      'new-visit': 'Nueva Visita',
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';

    const activeLink = document.querySelector(`.sidebar-link[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add('active');

    switch (page) {
      case 'dashboard':
        document.getElementById('pageDashboard').classList.remove('d-none');
        this.loadDashboard();
        break;
      case 'visits':
        document.getElementById('pageVisits').classList.remove('d-none');
        this.loadVisits();
        break;
      case 'new-visit':
        document.getElementById('pageNewVisit').classList.remove('d-none');
        this.editingVisitId = null;
        this.resetVisitForm();
        this.loadDestinations();
        break;
    }
  },

  editVisit(id) {
    this.editingVisitId = id;
    document.querySelectorAll('.page-content').forEach((p) => p.classList.add('d-none'));
    document.getElementById('pageNewVisit').classList.remove('d-none');
    document.getElementById('pageTitle').textContent = 'Editar Visita';
    document.getElementById('visitFormTitle').innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Visita';
    document.getElementById('visitSubmitBtn').innerHTML = '<span class="spinner-border spinner-border-sm d-none me-2 visit-submit-spinner" role="status" aria-hidden="true"></span><i class="bi bi-check-lg me-1"></i>Guardar Cambios';
    const extras = document.getElementById('visitFormExtras');
    if (extras) extras.classList.add('d-none');
    this.loadVisitForEdit(id);
    this.loadDestinations();
  },

  async loadVisitForEdit(id) {
    try {
      const data = await API.getVisit(id);
      const v = data.visit;
      document.getElementById('visitId').value = v.id;
      document.getElementById('vName').value = v.visitor_name || '';
      document.getElementById('vDocument').value = v.visitor_document || '';
      document.getElementById('vCompany').value = v.visitor_company || '';
      document.getElementById('vEmail').value = v.visitor_email || '';
      document.getElementById('vPhone').value = v.visitor_phone || '';
      document.getElementById('vDestination').value = v.destination || '';
      document.getElementById('vPurpose').value = v.purpose || '';
      document.getElementById('vNotes').value = v.notes || '';
    } catch (err) {
      this.toast('Error al cargar la visita', 'danger');
    }
  },

  resetVisitForm() {
    document.getElementById('visitForm').reset();
    document.getElementById('visitId').value = '';
    document.getElementById('visitFormTitle').innerHTML = '<i class="bi bi-person-plus me-2"></i>Nueva Visita';
    document.getElementById('visitSubmitBtn').innerHTML = '<span class="spinner-border spinner-border-sm d-none me-2 visit-submit-spinner" role="status" aria-hidden="true"></span><i class="bi bi-check-lg me-1"></i>Registrar Visita';
    const extras = document.getElementById('visitFormExtras');
    if (extras) extras.classList.remove('d-none');
    const printChk = document.getElementById('visitPrintAfterSave');
    if (printChk) printChk.checked = true;
    document.getElementById('visitFormError').classList.add('d-none');
  },

  setVisitFormError(message, type = 'danger') {
    const errorDiv = document.getElementById('visitFormError');
    if (!errorDiv) return;
    errorDiv.className = `alert alert-${type} mt-3`;
    errorDiv.textContent = message;
    errorDiv.classList.remove('d-none');
  },

  formatVisitSubmitError(err) {
    if (err?.details?.length) {
      return err.details
        .map((d) => `${d.field ? `${d.field}: ` : ''}${d.message}`)
        .join(' | ');
    }
    return err?.error || 'Error al guardar';
  },

  async handleVisitSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('visitSubmitBtn');
    const spinner = btn ? btn.querySelector('.visit-submit-spinner') : null;
    const errorDiv = document.getElementById('visitFormError');
    if (!btn) return;

    const data = {
      visitor_name: document.getElementById('vName').value.trim(),
      visitor_document: document.getElementById('vDocument').value.trim(),
      visitor_company: document.getElementById('vCompany').value.trim(),
      visitor_email: document.getElementById('vEmail').value.trim(),
      visitor_phone: document.getElementById('vPhone').value.trim(),
      destination: document.getElementById('vDestination').value.trim(),
      purpose: document.getElementById('vPurpose').value.trim(),
      notes: document.getElementById('vNotes').value.trim(),
    };

    if (!data.visitor_name || !data.visitor_document || !data.destination || !data.purpose) {
      this.setVisitFormError('Completa todos los campos obligatorios', 'danger');
      return;
    }

    btn.disabled = true;
    spinner?.classList.remove('d-none');
    this.setVisitFormError('Registrando visita... por favor espera.', 'info');

    const doPrint = !this.editingVisitId && document.getElementById('visitPrintAfterSave')?.checked;

    try {
      if (this.editingVisitId) {
        const updated = await API.updateVisit(this.editingVisitId, data);
        if (!updated?.visit) {
          throw { error: 'El servidor no confirmó los cambios. Revisa la sesión o inténtalo de nuevo.' };
        }
        this.setVisitFormError('Visita actualizada correctamente.', 'success');
        this.toast('Visita actualizada correctamente', 'success');
        this.navigate('visits');
      } else {
        const result = await API.createVisit(data);
        if (!result?.visit) {
          throw { error: 'No se pudo crear la visita (respuesta vacía del servidor). Suele indicar sesión caducada: cierra sesión y entra de nuevo.' };
        }
        const visitId = result.visit.id ? ` (ID #${result.visit.id})` : '';
        this.setVisitFormError(`Visita registrada correctamente${visitId}.`, 'success');
        this.toast('Visita registrada correctamente', 'success');
        this.navigate('visits');
        if (result.visit && doPrint) {
          setTimeout(() => this.showCredentialAndPrint(result.visit.id), 400);
        }
      }
    } catch (err) {
      if (err.status === 401) {
        this.handleLogout();
        return;
      }
      const msg = this.formatVisitSubmitError(err);
      this.setVisitFormError(`Error al registrar: ${msg}`, 'danger');
      this.toast(`Error al registrar: ${msg}`, 'danger');
    } finally {
      btn.disabled = false;
      spinner?.classList.add('d-none');
    }
  },

  // ===== DASHBOARD =====
  async loadDashboard() {
    try {
      const [stats, activity, destinations, recent] = await Promise.all([
        API.getStats(),
        API.getActivity(),
        API.getDestinationChart(),
        API.getRecentVisits(),
      ]);

      document.getElementById('statTotal').textContent = stats.total_visits.toLocaleString();
      document.getElementById('statToday').textContent = stats.today_visits;
      document.getElementById('statInside').textContent = stats.currently_inside;
      document.getElementById('statCheckouts').textContent = stats.today_checkouts;

      this.renderActivityChart(activity);
      this.renderDestinationChart(destinations);
      this.renderRecentVisits(recent.visits);
    } catch (err) {
      this.toast('Error al cargar el dashboard', 'danger');
    }
  },

  renderActivityChart(data) {
    const ctx = document.getElementById('activityChart');
    if (this.charts.activity) this.charts.activity.destroy();

    const labels = data.labels.map((d) => {
      const date = new Date(d + 'T12:00:00');
      return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
    });

    this.charts.activity = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Visitas',
          data: data.data,
          backgroundColor: 'rgba(67, 97, 238, 0.8)',
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { grid: { display: false } },
        },
      },
    });
  },

  renderDestinationChart(data) {
    const ctx = document.getElementById('destinationChart');
    if (this.charts.destination) this.charts.destination.destroy();

    const colors = [
      '#4361ee', '#2ec4b6', '#ff9f1c', '#7209b7', '#e71d36',
      '#3a86ff', '#06d6a0', '#ffd166', '#8338ec', '#ef476f',
    ];

    this.charts.destination = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.data,
          backgroundColor: colors.slice(0, data.labels.length),
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } },
        },
      },
    });
  },

  renderRecentVisits(visits) {
    const tbody = document.getElementById('recentVisitsTable');
    if (!visits.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3 text-muted">No hay visitas recientes</td></tr>';
      return;
    }

    tbody.innerHTML = visits.map((v) => `
      <tr>
        <td><strong>${this.esc(v.visitor_name)}</strong><br><small class="text-muted">${this.esc(v.visitor_company || 'Particular')}</small></td>
        <td class="d-none d-md-table-cell">${this.esc(v.destination)}</td>
        <td>${this.statusBadge(v.status)}</td>
        <td class="d-none d-sm-table-cell"><small>${this.formatTime(v.check_in)}</small></td>
      </tr>
    `).join('');
  },

  // ===== VISITS LIST =====
  async loadVisits() {
    const params = {
      page: this.visitListParams.page,
      limit: this.visitListParams.limit,
      search: document.getElementById('searchInput')?.value || '',
      status: document.getElementById('filterStatus')?.value || '',
      date_from: document.getElementById('filterDateFrom')?.value || '',
      date_to: document.getElementById('filterDateTo')?.value || '',
    };

    const tbody = document.getElementById('visitsTable');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>';

    try {
      const data = await API.getVisits(params);
      this.renderVisitsTable(data.visits, data.pagination);
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-danger">Error al cargar visitas</td></tr>';
    }
  },

  renderVisitsTable(visits, pagination) {
    const tbody = document.getElementById('visitsTable');

    if (!visits.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron visitas</td></tr>';
      this.renderPagination(pagination);
      return;
    }

    tbody.innerHTML = visits.map((v) => `
      <tr>
        <td><small class="text-muted">#${v.id}</small></td>
        <td>
          <strong>${this.esc(v.visitor_name)}</strong><br>
          <small class="text-muted">${this.esc(v.visitor_document)}</small>
        </td>
        <td class="d-none d-md-table-cell">${this.esc(v.visitor_company || '—')}</td>
        <td class="d-none d-lg-table-cell">${this.esc(v.destination)}</td>
        <td>${this.statusBadge(v.status)}</td>
        <td class="d-none d-sm-table-cell"><small>${this.formatDateTime(v.check_in)}</small></td>
        <td>
          <div class="d-flex gap-1 flex-wrap">
            <button class="btn btn-outline-primary btn-action" title="Ver detalle" onclick="App.showVisitDetail(${v.id})">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-outline-success btn-action" title="Imprimir credencial" onclick="App.showCredentialAndPrint(${v.id})">
              <i class="bi bi-printer"></i>
            </button>
            ${v.status === 'checked_in' ? `<button class="btn btn-outline-warning btn-action" title="Registrar salida" onclick="App.performCheckOut(${v.id})"><i class="bi bi-box-arrow-right"></i></button>` : ''}
            <button class="btn btn-outline-secondary btn-action" title="Editar" onclick="App.editVisit(${v.id})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger btn-action" title="Eliminar" onclick="App.confirmDelete(${v.id}, '${this.esc(v.visitor_name)}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    this.renderPagination(pagination);
  },

  renderPagination(pagination) {
    const { total, page, limit, pages } = pagination;
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    document.getElementById('paginationInfo').textContent =
      total > 0 ? `Mostrando ${start}-${end} de ${total}` : 'Sin resultados';

    const nav = document.getElementById('paginationNav');
    if (pages <= 1) {
      nav.innerHTML = '';
      return;
    }

    let html = '';
    html += `<li class="page-item ${page === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="App.goToPage(${page - 1}); return false;">&laquo;</a></li>`;

    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);

    if (startPage > 1) {
      html += `<li class="page-item"><a class="page-link" href="#" onclick="App.goToPage(1); return false;">1</a></li>`;
      if (startPage > 2) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `<li class="page-item ${i === page ? 'active' : ''}">
        <a class="page-link" href="#" onclick="App.goToPage(${i}); return false;">${i}</a></li>`;
    }

    if (endPage < pages) {
      if (endPage < pages - 1) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      html += `<li class="page-item"><a class="page-link" href="#" onclick="App.goToPage(${pages}); return false;">${pages}</a></li>`;
    }

    html += `<li class="page-item ${page === pages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="App.goToPage(${page + 1}); return false;">&raquo;</a></li>`;

    nav.innerHTML = html;
  },

  goToPage(page) {
    this.visitListParams.page = page;
    this.loadVisits();
  },

  clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    this.visitListParams.page = 1;
    this.loadVisits();
  },

  async exportCSV() {
    try {
      const params = {
        status: document.getElementById('filterStatus')?.value || '',
        date_from: document.getElementById('filterDateFrom')?.value || '',
        date_to: document.getElementById('filterDateTo')?.value || '',
      };
      await API.exportCSV(params);
      this.toast('Archivo CSV descargado', 'success');
    } catch (err) {
      this.toast('Error al exportar CSV', 'danger');
    }
  },

  // ===== VISIT DETAIL =====
  async showVisitDetail(id) {
    try {
      const [visitData, qrData] = await Promise.all([
        API.getVisit(id),
        API.generateQR(id),
      ]);

      const v = visitData.visit;
      const statusLabels = {
        pending: 'Pendiente', checked_in: 'En instalaciones',
        checked_out: 'Salida registrada', cancelled: 'Cancelada',
      };

      document.getElementById('visitDetailBody').innerHTML = `
        <div class="detail-grid">
          <div class="detail-item"><label>Visitante</label><span>${this.esc(v.visitor_name)}</span></div>
          <div class="detail-item"><label>Documento</label><span>${this.esc(v.visitor_document)}</span></div>
          <div class="detail-item"><label>Empresa</label><span>${this.esc(v.visitor_company || 'N/A')}</span></div>
          <div class="detail-item"><label>Email</label><span>${this.esc(v.visitor_email || 'N/A')}</span></div>
          <div class="detail-item"><label>Teléfono</label><span>${this.esc(v.visitor_phone || 'N/A')}</span></div>
          <div class="detail-item"><label>Destino</label><span>${this.esc(v.destination)}</span></div>
          <div class="detail-item"><label>Motivo</label><span>${this.esc(v.purpose)}</span></div>
          <div class="detail-item"><label>Estado</label><span>${this.statusBadge(v.status)}</span></div>
          <div class="detail-item"><label>Entrada</label><span>${this.formatDateTime(v.check_in) || 'Sin registro'}</span></div>
          <div class="detail-item"><label>Salida</label><span>${this.formatDateTime(v.check_out) || 'Sin registro'}</span></div>
          <div class="detail-item"><label>Registrado por</label><span>${this.esc(v.creator?.full_name || 'N/A')}</span></div>
          <div class="detail-item"><label>Fecha de creación</label><span>${this.formatDateTime(v.created_at)}</span></div>
        </div>
        ${v.notes ? `<div class="mt-3"><label class="form-label small fw-semibold text-muted">NOTAS</label><p>${this.esc(v.notes)}</p></div>` : ''}
        <div class="text-center mt-3">
          <p class="text-muted small mb-2">Código QR de la visita</p>
          <img src="${qrData.qr_image}" alt="QR Code" style="max-width: 180px;">
          <p class="text-muted small mt-1">${qrData.qr_code}</p>
        </div>
      `;

      let footerHtml = `
        <button class="btn btn-success" onclick="App.showCredentialAndPrint(${v.id})">
          <i class="bi bi-printer me-1"></i>Imprimir Credencial
        </button>`;

      if (v.status === 'checked_in') {
        footerHtml += `
          <button class="btn btn-warning" onclick="App.performCheckOut(${v.id})">
            <i class="bi bi-box-arrow-right me-1"></i>Registrar Salida
          </button>`;
      }

      footerHtml += `<button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>`;
      document.getElementById('visitDetailFooter').innerHTML = footerHtml;

      new bootstrap.Modal(document.getElementById('visitDetailModal')).show();
    } catch (err) {
      this.toast('Error al cargar detalle de la visita', 'danger');
    }
  },

  // ===== CHECK OUT =====
  async performCheckOut(id) {
    try {
      await API.checkOut(id);
      this.toast('Salida registrada correctamente', 'success');
      bootstrap.Modal.getInstance(document.getElementById('visitDetailModal'))?.hide();
      if (this.currentPage === 'visits') this.loadVisits();
      if (this.currentPage === 'dashboard') this.loadDashboard();
    } catch (err) {
      this.toast(err.error || 'Error al registrar salida', 'danger');
    }
  },

  // ===== DELETE =====
  confirmDelete(id, name) {
    document.getElementById('deleteVisitName').textContent = name;
    document.getElementById('confirmDeleteBtn').onclick = () => this.deleteVisit(id);
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
  },

  async deleteVisit(id) {
    try {
      await API.deleteVisit(id);
      this.toast('Visita eliminada correctamente', 'success');
      bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
      this.loadVisits();
    } catch (err) {
      this.toast(err.error || 'Error al eliminar', 'danger');
    }
  },

  // ===== CREDENTIAL / PRINT =====
  async showCredentialAndPrint(id) {
    try {
      const data = await API.getCredential(id);
      const v = data.visit;
      const checkInDate = v.check_in ? new Date(v.check_in) : new Date();

      const ticketHTML = `
        <div class="credential-ticket thermal" id="thermalTicket">
          <div class="credential-header">
            <h3>${this.esc(data.company_name)}</h3>
            <p>CREDENCIAL DE VISITANTE</p>
          </div>
          <div class="credential-body">
            <div class="credential-row"><span class="label">Visitante:</span><span class="value">${this.esc(v.visitor_name)}</span></div>
            <div class="credential-row"><span class="label">Documento:</span><span class="value">${this.esc(v.visitor_document)}</span></div>
            ${v.visitor_company ? `<div class="credential-row"><span class="label">Empresa:</span><span class="value">${this.esc(v.visitor_company)}</span></div>` : ''}
            <div class="credential-row"><span class="label">Destino:</span><span class="value">${this.esc(v.destination)}</span></div>
            <div class="credential-row"><span class="label">Motivo:</span><span class="value">${this.esc(v.purpose)}</span></div>
            <div class="credential-row"><span class="label">Fecha:</span><span class="value">${checkInDate.toLocaleDateString('es-ES')}</span></div>
            <div class="credential-row"><span class="label">Hora:</span><span class="value">${checkInDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span></div>
          </div>
          <div class="credential-qr">
            <img src="${data.qr_image}" alt="QR">
            <p style="margin: 4px 0 0; font-size: 10px; color: #666;">${v.qr_code}</p>
          </div>
          <div class="credential-footer">
            <p style="margin: 0;">Presente esta credencial en recepción</p>
            <p style="margin: 2px 0 0;">al momento de retirarse</p>
          </div>
        </div>
      `;

      const printContainer = document.getElementById('printCredential');
      printContainer.innerHTML = ticketHTML;

      const printWindow = window.open('', '_blank', 'width=400,height=600');
      printWindow.document.write(`<!DOCTYPE html><html><head><title>Credencial - ${this.esc(v.visitor_name)}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; }
          .credential-ticket { padding: 10px; color: #000; }
          .credential-ticket.thermal { width: 58mm; max-width: 58mm; font-size: 11px; }
          .credential-header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 8px; margin-bottom: 10px; }
          .credential-header h3 { margin: 0; font-size: 1.2em; font-weight: 700; text-transform: uppercase; }
          .credential-header p { margin: 2px 0 0; font-size: 0.85em; color: #555; }
          .credential-body { padding: 8px 0; }
          .credential-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dotted #ccc; }
          .credential-row .label { font-weight: 600; color: #333; }
          .credential-row .value { text-align: right; max-width: 60%; }
          .credential-qr { text-align: center; padding: 10px 0; }
          .credential-qr img { max-width: 150px; }
          .credential-footer { text-align: center; border-top: 2px dashed #333; padding-top: 8px; margin-top: 8px; font-size: 0.8em; color: #666; }
          @media print {
            @page { size: 58mm auto; margin: 0; }
            body { width: 58mm; }
          }
        </style></head><body>${ticketHTML}
        <script>window.onload = function() { window.print(); }</script>
        </body></html>`);
      printWindow.document.close();

    } catch (err) {
      this.toast('Error al generar credencial', 'danger');
    }
  },

  // ===== HELPERS =====
  async loadDestinations() {
    try {
      const data = await API.getDestinations();
      const datalist = document.getElementById('destinationsList');
      datalist.innerHTML = data.destinations.map((d) => `<option value="${this.esc(d)}">`).join('');
    } catch (e) { /* silently fail */ }
  },

  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('show');
    document.getElementById('sidebarOverlay').classList.toggle('show');
  },

  closeSidebar() {
    document.getElementById('sidebar').classList.remove('show');
    document.getElementById('sidebarOverlay').classList.remove('show');
  },

  statusBadge(status) {
    const labels = {
      pending: 'Pendiente', checked_in: 'En instalaciones',
      checked_out: 'Salida registrada', cancelled: 'Cancelada',
    };
    return `<span class="badge badge-status badge-${status}">${labels[status] || status}</span>`;
  },

  formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  formatTime(date) {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  },

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: 'check-circle-fill', danger: 'exclamation-triangle-fill', info: 'info-circle-fill', warning: 'exclamation-circle-fill' };
    const id = 'toast-' + Date.now();
    const html = `
      <div id="${id}" class="toast align-items-center text-bg-${type} border-0" role="alert">
        <div class="d-flex">
          <div class="toast-body"><i class="bi bi-${icons[type] || 'info-circle-fill'} me-2"></i>${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>`;
    container.insertAdjacentHTML('beforeend', html);
    const toastEl = document.getElementById(id);
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
