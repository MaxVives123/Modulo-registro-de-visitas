const App = {
  currentPage: 'dashboard',
  charts: {},
  visitListParams: { page: 1, limit: 15 },
  editingVisitId: null,
  editingCompanyId: null,
  signaturePad: null,
  notifInterval: null,
  _companiesCache: [],

  /** Helpers de rol */
  currentUser() { return JSON.parse(localStorage.getItem('user') || '{}'); },
  isSuperAdmin() { const r = this.currentUser().role; return r === 'superadmin' || r === 'admin'; },
  isCompanyAdmin() { return this.currentUser().role === 'admin_empresa'; },
  canManageUsers() { return this.isSuperAdmin() || this.isCompanyAdmin(); },

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
    document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegisterCompany(e));
    document.getElementById('showRegisterLink').addEventListener('click', (e) => { e.preventDefault(); this.showRegister(); });
    document.getElementById('showLoginLink').addEventListener('click', (e) => { e.preventDefault(); this.showLoginForm(); });
    document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
    document.getElementById('visitForm').addEventListener('submit', (e) => this.handleVisitSubmit(e));
    document.getElementById('sidebarToggle').addEventListener('click', () => this.toggleSidebar());
    document.getElementById('clearSignatureBtn').addEventListener('click', () => this.clearSignature());
    document.getElementById('markAllReadBtn')?.addEventListener('click', () => this.handleMarkAllRead());
    document.getElementById('notifBell')?.addEventListener('click', () => this.loadNotifications());
    document.getElementById('btnNewUser')?.addEventListener('click', () => this.showUserForm());
    document.getElementById('userFormSaveBtn')?.addEventListener('click', () => this.handleUserSave());
    document.getElementById('cpSaveBtn')?.addEventListener('click', () => this.handleChangePassword());
    document.getElementById('btnNewCompany')?.addEventListener('click', () => this.showCompanyForm());
    document.getElementById('companyFormSaveBtn')?.addEventListener('click', () => this.handleCompanySave());

    // Evacuación
    document.getElementById('btnTriggerEvacuation')?.addEventListener('click', () => this.showEvacuationConfirm());
    document.getElementById('confirmEvacuationBtn')?.addEventListener('click', () => this.handleTriggerEvacuation());
    document.getElementById('btnCloseEvacuation')?.addEventListener('click', () => this.handleCloseEvacuation());
    document.getElementById('btnRefreshPresence')?.addEventListener('click', () => this.loadPresentNow());
    document.getElementById('btnApplyPresenceFilter')?.addEventListener('click', () => this.loadPresentNow());

    // Integraciones
    document.getElementById('testNotifForm')?.addEventListener('submit', (e) => this.handleTestNotification(e));
    document.getElementById('btnToggleApiKey')?.addEventListener('click', () => {
      const inp = document.getElementById('apiKeyDisplay');
      if (inp.type === 'password') { inp.type = 'text'; } else { inp.type = 'password'; }
    });

    this.initSignaturePad();

    document.querySelectorAll('.sidebar-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(link.dataset.page);
        this.closeSidebar();
      });
    });

    document.getElementById('btnSearch').addEventListener('click', () => this.loadVisits());
    document.getElementById('btnClearFilters').addEventListener('click', () => this.clearFilters());
    document.getElementById('btnExportExcel')?.addEventListener('click', () => this.exportExcel());
    document.getElementById('btnExportPDF').addEventListener('click', () => this.exportPDF());

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
    this.showLoginForm();
  },

  showLoginForm() {
    document.getElementById('loginCard').classList.remove('d-none');
    document.getElementById('registerCard').classList.add('d-none');
  },

  showRegister() {
    document.getElementById('loginCard').classList.add('d-none');
    document.getElementById('registerCard').classList.remove('d-none');
  },

  showApp() {
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('appLayout').classList.remove('d-none');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('sidebarUserName').textContent = user.full_name || 'Usuario';
    document.getElementById('navUserName').textContent = user.full_name || 'Usuario';
    const isSA = this.isSuperAdmin();
    const canUsers = this.canManageUsers();

    // Empresas: solo superadmin
    document.getElementById('sidebarCompaniesItem')?.classList.toggle('d-none', !isSA);
    // Usuarios: superadmin y admin_empresa
    document.getElementById('sidebarUsersItem')?.classList.toggle('d-none', !canUsers);
    // Evacuación: admin o quien tenga can_trigger_evacuation
    const canEvac = isSA || this.isCompanyAdmin() || user.can_trigger_evacuation;
    document.getElementById('sidebarEvacuationItem')?.classList.toggle('d-none', !canEvac);
    // Integraciones: solo superadmin
    document.getElementById('sidebarIntegrationsItem')?.classList.toggle('d-none', !isSA);

    // Badge de empresa en sidebar (para admin_empresa y user)
    const companyBadge = document.getElementById('sidebarCompanyBadge');
    const companyNameEl = document.getElementById('sidebarCompanyName');
    if (!isSA && user.company_name) {
      companyBadge?.classList.remove('d-none');
      if (companyNameEl) companyNameEl.textContent = user.company_name;
    } else {
      companyBadge?.classList.add('d-none');
    }

    // Etiqueta empresa en panel de usuarios
    const usersLabel = document.getElementById('usersCompanyLabel');
    if (usersLabel) {
      if (!isSA && user.company_name) {
        usersLabel.textContent = user.company_name;
        usersLabel.classList.remove('d-none');
      } else {
        usersLabel.classList.add('d-none');
      }
    }
    this.startNotifPolling();
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

  async handleRegisterCompany(e) {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    const spinner = document.getElementById('registerSpinner');
    const errorDiv = document.getElementById('registerError');
    errorDiv.classList.add('d-none');

    const companyName = document.getElementById('regCompanyName').value.trim();
    const adminName = document.getElementById('regAdminName').value.trim();
    const adminUser = document.getElementById('regAdminUser').value.trim();
    const adminPass = document.getElementById('regAdminPass').value;
    const adminPassConfirm = document.getElementById('regAdminPassConfirm').value;

    if (!companyName || !adminName || !adminUser || !adminPass) {
      errorDiv.textContent = 'Completa todos los campos obligatorios.';
      errorDiv.classList.remove('d-none');
      return;
    }
    if (adminPass.length < 8) {
      errorDiv.textContent = 'La contraseña debe tener al menos 8 caracteres.';
      errorDiv.classList.remove('d-none');
      return;
    }
    if (adminPass !== adminPassConfirm) {
      errorDiv.textContent = 'Las contraseñas no coinciden.';
      errorDiv.classList.remove('d-none');
      return;
    }

    btn.disabled = true;
    spinner.classList.remove('d-none');

    try {
      const data = await API.registerCompany({
        company_name: companyName,
        company_rif: document.getElementById('regCompanyRif').value.trim(),
        company_email: document.getElementById('regCompanyEmail').value.trim(),
        company_phone: document.getElementById('regCompanyPhone').value.trim(),
        admin_full_name: adminName,
        admin_username: adminUser,
        admin_password: adminPass,
      });

      API.setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      this.showApp();
      this.navigate('dashboard');
      this.toast(`¡Bienvenido! Empresa "${data.company.name}" registrada correctamente.`, 'success');
    } catch (err) {
      errorDiv.textContent = err.error || 'Error al registrar la empresa.';
      errorDiv.classList.remove('d-none');
    } finally {
      btn.disabled = false;
      spinner.classList.add('d-none');
    }
  },

  handleLogout() {
    API.setToken(null);
    localStorage.removeItem('user');
    this.stopNotifPolling();
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
      users: 'Gestión de Usuarios',
      companies: 'Gestión de Empresas',
      evacuation: 'Evacuación',
      integrations: 'Integraciones',
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
        this._applyCompanyScopeToForm();
        break;
      case 'users':
        document.getElementById('pageUsers').classList.remove('d-none');
        this.loadUsers();
        break;
      case 'companies':
        document.getElementById('pageCompanies').classList.remove('d-none');
        this.loadCompanies();
        break;
      case 'evacuation':
        document.getElementById('pageEvacuation').classList.remove('d-none');
        this.loadEvacuationPage();
        break;
      case 'integrations':
        document.getElementById('pageIntegrations').classList.remove('d-none');
        this.loadIntegrationsPage();
        break;
    }
  },

  initSignaturePad() {
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;
    this.resizeSignatureCanvas(canvas);
    this.signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255,255,255)',
      penColor: 'rgb(0,0,0)',
    });
    window.addEventListener('resize', () => this.resizeSignatureCanvas(canvas));
  },

  resizeSignatureCanvas(canvas) {
    const wrapper = canvas.parentElement;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = wrapper.offsetWidth * ratio;
    canvas.height = wrapper.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    if (this.signaturePad) this.signaturePad.clear();
  },

  clearSignature() {
    if (this.signaturePad) this.signaturePad.clear();
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
    const sigBlock = document.getElementById('signatureBlock');
    if (sigBlock) sigBlock.classList.add('d-none');
    this.loadVisitForEdit(id);
    this.loadDestinations();
  },

  _applyCompanyScopeToForm() {
    const user = this.currentUser();
    const selectGroup = document.getElementById('vCompanySelectGroup');
    const fixedGroup = document.getElementById('vCompanyFixedGroup');
    const fixedEl = document.getElementById('vCompanyFixed');

    if (this.isSuperAdmin()) {
      selectGroup?.classList.remove('d-none');
      fixedGroup?.classList.add('d-none');
      this.loadCompaniesForSelect();
    } else {
      selectGroup?.classList.add('d-none');
      fixedGroup?.classList.remove('d-none');
      if (fixedEl) fixedEl.textContent = user.company_name || 'Mi empresa';
    }
  },

  async loadVisitForEdit(id) {
    try {
      this._applyCompanyScopeToForm();
      const data = await API.getVisit(id);
      const v = data.visit;
      document.getElementById('visitId').value = v.id;
      document.getElementById('vName').value = v.visitor_name || '';
      document.getElementById('vDocument').value = v.visitor_document || '';
      document.getElementById('vCompany').value = v.visitor_company || '';
      document.getElementById('vEmail').value = v.visitor_email || '';
      document.getElementById('vPhone').value = v.visitor_phone || '';
      document.getElementById('vDestination').value = v.destination || '';
      document.getElementById('vHostName').value = v.host_name || '';
      document.getElementById('vHostEmail').value = v.host_email || '';
      document.getElementById('vVehiclePlate').value = v.vehicle_plate || '';
      document.getElementById('vSite').value = v.site || '';
      document.getElementById('vBuilding').value = v.building || '';
      document.getElementById('vCompanyId').value = v.company_id || '';
      document.getElementById('vPurpose').value = v.purpose || '';
      document.getElementById('vNotes').value = v.notes || '';
    } catch (err) {
      this.toast('Error al cargar la visita', 'danger');
    }
  },

  resetVisitForm() {
    document.getElementById('visitForm').reset();
    document.getElementById('visitId').value = '';
    const selEl = document.getElementById('vCompanyId');
    if (selEl) selEl.value = '';
    document.getElementById('vHostName').value = '';
    document.getElementById('vHostEmail').value = '';
    document.getElementById('vVehiclePlate').value = '';
    document.getElementById('vSite').value = '';
    document.getElementById('vBuilding').value = '';
    document.getElementById('visitFormTitle').innerHTML = '<i class="bi bi-person-plus me-2"></i>Nueva Visita';
    document.getElementById('visitSubmitBtn').innerHTML = '<span class="spinner-border spinner-border-sm d-none me-2 visit-submit-spinner" role="status" aria-hidden="true"></span><i class="bi bi-check-lg me-1"></i>Registrar Visita';
    const extras = document.getElementById('visitFormExtras');
    if (extras) extras.classList.remove('d-none');
    const printChk = document.getElementById('visitPrintAfterSave');
    if (printChk) printChk.checked = true;
    document.getElementById('visitFormError').classList.add('d-none');
    const sigBlock = document.getElementById('signatureBlock');
    if (sigBlock) sigBlock.classList.remove('d-none');
    this.clearSignature();
  },

  setVisitFormError(message, type = 'danger') {
    const errorDiv = document.getElementById('visitFormError');
    if (!errorDiv) return;
    errorDiv.className = `alert alert-${type} mt-3`;
    errorDiv.textContent = message;
    errorDiv.classList.remove('d-none');
  },

  /** Mensajes concretos cuando el backend devuelve { error, details: [{ message }] } */
  formatApiValidationError(err, fallback = 'Error') {
    if (err?.details?.length) {
      return err.details.map((d) => d.message).join(' ');
    }
    return err?.error || fallback;
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

    const companyIdRaw = document.getElementById('vCompanyId').value;
    const data = {
      visitor_name: document.getElementById('vName').value.trim(),
      visitor_document: document.getElementById('vDocument').value.trim(),
      visitor_company: document.getElementById('vCompany').value.trim(),
      visitor_email: document.getElementById('vEmail').value.trim(),
      visitor_phone: document.getElementById('vPhone').value.trim(),
      destination: document.getElementById('vDestination').value.trim(),
      host_name: document.getElementById('vHostName').value.trim(),
      host_email: document.getElementById('vHostEmail').value.trim(),
      vehicle_plate: document.getElementById('vVehiclePlate').value.trim(),
      site: document.getElementById('vSite').value.trim(),
      building: document.getElementById('vBuilding').value.trim(),
      // Solo el superadmin puede elegir empresa desde el selector
      company_id: this.isSuperAdmin() ? (companyIdRaw ? parseInt(companyIdRaw, 10) : null) : undefined,
      purpose: document.getElementById('vPurpose').value.trim(),
      notes: document.getElementById('vNotes').value.trim(),
    };

    if (!data.visitor_name || !data.visitor_document || !data.destination || !data.purpose) {
      this.setVisitFormError('Completa todos los campos obligatorios', 'danger');
      return;
    }

    if (!this.editingVisitId && this.signaturePad && !this.signaturePad.isEmpty()) {
      data.signature = this.signaturePad.toDataURL('image/png');
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
      vehicle_plate: document.getElementById('filterPlate')?.value || '',
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
          ${v.vehicle_plate ? `<br><span class="badge bg-warning text-dark" title="Matrícula"><i class="bi bi-car-front"></i> ${this.esc(v.vehicle_plate)}</span>` : ''}
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
    const filterPlate = document.getElementById('filterPlate');
    if (filterPlate) filterPlate.value = '';
    this.visitListParams.page = 1;
    this.loadVisits();
  },

  getVisitExportParams() {
    return {
      search: document.getElementById('searchInput')?.value?.trim() || '',
      status: document.getElementById('filterStatus')?.value || '',
      date_from: document.getElementById('filterDateFrom')?.value || '',
      date_to: document.getElementById('filterDateTo')?.value || '',
      vehicle_plate: document.getElementById('filterPlate')?.value?.trim() || '',
    };
  },

  async exportPDF() {
    try {
      await API.exportPDF(this.getVisitExportParams());
      this.toast('PDF descargado', 'success');
    } catch (err) {
      this.toast('Error al exportar PDF', 'danger');
    }
  },

  async exportExcel() {
    try {
      await API.exportExcel(this.getVisitExportParams());
      this.toast('Archivo Excel descargado', 'success');
    } catch (err) {
      this.toast(err?.error || 'Error al exportar Excel', 'danger');
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
          <div class="detail-item"><label>Empresa visitante</label><span>${this.esc(v.visitor_company || 'N/A')}</span></div>
          <div class="detail-item"><label>Email visitante</label><span>${this.esc(v.visitor_email || 'N/A')}</span></div>
          <div class="detail-item"><label>Teléfono</label><span>${this.esc(v.visitor_phone || 'N/A')}</span></div>
          <div class="detail-item"><label>Empresa (sistema)</label><span>${this.esc(v.company?.name || 'N/A')}</span></div>
          <div class="detail-item"><label>Destino / Dpto.</label><span>${this.esc(v.destination)}</span></div>
          <div class="detail-item"><label>Persona visitada</label><span>${this.esc(v.host_name || 'N/A')}</span></div>
          <div class="detail-item"><label>Email persona visitada</label><span>${this.esc(v.host_email || 'N/A')}</span></div>
          ${v.vehicle_plate ? `<div class="detail-item"><label>Matrícula vehículo</label><span class="badge bg-warning text-dark fs-6">${this.esc(v.vehicle_plate)}</span></div>` : ''}
          ${v.site || v.building ? `<div class="detail-item"><label>Ubicación</label><span>${this.esc([v.site, v.building].filter(Boolean).join(' – '))}</span></div>` : ''}
          <div class="detail-item"><label>Motivo</label><span>${this.esc(v.purpose)}</span></div>
          <div class="detail-item"><label>Estado</label><span>${this.statusBadge(v.status)}</span></div>
          <div class="detail-item"><label>Entrada</label><span>${this.formatDateTime(v.check_in) || 'Sin registro'}</span></div>
          <div class="detail-item"><label>Salida</label><span>${this.formatDateTime(v.check_out) || 'Sin registro'}</span></div>
          <div class="detail-item"><label>Registrado por</label><span>${this.esc(v.creator?.full_name || 'N/A')}</span></div>
          <div class="detail-item"><label>Fecha de creación</label><span>${this.formatDateTime(v.created_at)}</span></div>
        </div>
        ${v.notes ? `<div class="mt-3"><label class="form-label small fw-semibold text-muted">NOTAS</label><p>${this.esc(v.notes)}</p></div>` : ''}
        ${v.signature ? `<div class="mt-3"><label class="form-label small fw-semibold text-muted">FIRMA DEL VISITANTE</label><div class="border rounded p-2 bg-white text-center"><img src="${v.signature}" alt="Firma" style="max-height:120px;"></div></div>` : ''}
        <div class="text-center mt-3">
          <p class="text-muted small mb-2">Código QR de la visita</p>
          <img src="${qrData.qr_image}" alt="QR Code" style="max-width: 180px;">
          <p class="text-muted small mt-1">${qrData.qr_code}</p>
        </div>
      `;

      let footerHtml = `
        <button class="btn btn-success" onclick="App.showCredentialAndPrint(${v.id})">
          <i class="bi bi-printer me-1"></i>Imprimir Credencial
        </button>
        <button class="btn btn-danger" onclick="App.downloadVisitPDF(${v.id})">
          <i class="bi bi-filetype-pdf me-1"></i>PDF
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

  async downloadVisitPDF(id) {
    try {
      await API.exportVisitPDF(id);
      this.toast('PDF de visita descargado', 'success');
    } catch (err) {
      this.toast('Error al exportar PDF de visita', 'danger');
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
          ${v.signature ? `<div class="credential-signature" style="text-align:center;padding:6px 0;border-top:1px dotted #ccc;"><p style="margin:0 0 2px;font-size:10px;color:#666;">Firma:</p><img src="${v.signature}" alt="Firma" style="max-height:60px;max-width:80%;"></div>` : ''}
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

  // ===== NOTIFICATIONS =====
  startNotifPolling() {
    this.stopNotifPolling();
    this.pollUnreadCount();
    this.notifInterval = setInterval(() => this.pollUnreadCount(), 30000);
  },

  stopNotifPolling() {
    if (this.notifInterval) {
      clearInterval(this.notifInterval);
      this.notifInterval = null;
    }
  },

  async pollUnreadCount() {
    try {
      const data = await API.getUnreadCount();
      const badge = document.getElementById('notifBadge');
      if (data.count > 0) {
        badge.textContent = data.count > 99 ? '99+' : data.count;
        badge.classList.remove('d-none');
      } else {
        badge.classList.add('d-none');
      }
    } catch (_) { /* silently ignore */ }
  },

  async loadNotifications() {
    const list = document.getElementById('notifList');
    try {
      const data = await API.getNotifications({ limit: 20 });
      if (!data.notifications.length) {
        list.innerHTML = '<div class="text-center py-3 text-muted small">Sin notificaciones</div>';
        return;
      }
      list.innerHTML = data.notifications.map((n) => {
        const icons = { info: 'info-circle text-primary', warning: 'exclamation-triangle text-warning', success: 'check-circle text-success' };
        const iconCls = icons[n.type] || icons.info;
        const bg = n.read ? '' : 'bg-light';
        const time = this.formatDateTime(n.createdAt);
        return `
          <div class="dropdown-item d-flex align-items-start gap-2 px-3 py-2 ${bg} border-bottom" style="white-space:normal;cursor:pointer;" onclick="App.markNotifRead(${n.id}, this)">
            <i class="bi bi-${iconCls} mt-1"></i>
            <div class="flex-grow-1">
              <div class="fw-semibold small">${this.esc(n.title)}</div>
              <div class="text-muted small">${this.esc(n.message)}</div>
              <div class="text-muted" style="font-size:0.7rem;">${time}</div>
            </div>
            ${!n.read ? '<span class="badge bg-primary rounded-pill" style="font-size:0.6rem;">Nuevo</span>' : ''}
          </div>`;
      }).join('');
    } catch (_) {
      list.innerHTML = '<div class="text-center py-3 text-danger small">Error al cargar</div>';
    }
  },

  async markNotifRead(id, el) {
    try {
      await API.markNotifRead(id);
      if (el) {
        el.classList.remove('bg-light');
        const badge = el.querySelector('.badge');
        if (badge) badge.remove();
      }
      this.pollUnreadCount();
    } catch (_) { /* ignore */ }
  },

  async handleMarkAllRead() {
    try {
      await API.markAllNotifsRead();
      this.pollUnreadCount();
      this.loadNotifications();
      this.toast('Notificaciones marcadas como leídas', 'success');
    } catch (_) {
      this.toast('Error al marcar notificaciones', 'danger');
    }
  },

  // ===== USERS CRUD =====
  async loadUsers() {
    const tbody = document.getElementById('usersTable');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>';
    try {
      const data = await API.getUsers();
      this.renderUsersTable(data.users);
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-danger">Error al cargar usuarios</td></tr>';
    }
  },

  renderUsersTable(users) {
    const tbody = document.getElementById('usersTable');
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No hay usuarios</td></tr>';
      return;
    }
    tbody.innerHTML = users.map((u) => `
      <tr class="${!u.active ? 'table-secondary' : ''}">
        <td><small class="text-muted">#${u.id}</small></td>
        <td><strong>${this.esc(u.username)}</strong>${u.email ? `<br><small class="text-muted">${this.esc(u.email)}</small>` : ''}</td>
        <td>${this.esc(u.full_name)}${u.job_title ? `<br><small class="text-muted">${this.esc(u.job_title)}</small>` : ''}</td>
        <td>
          <span class="badge ${{ superadmin: 'bg-danger', admin: 'bg-primary', admin_empresa: 'bg-warning text-dark', user: 'bg-secondary' }[u.role] || 'bg-secondary'}">${{ superadmin: 'Superadmin', admin: 'Admin', admin_empresa: 'Admin Empresa', user: 'Usuario' }[u.role] || u.role}</span>
          ${u.can_trigger_evacuation ? '<span class="badge bg-danger ms-1" title="Puede activar evacuación"><i class="bi bi-exclamation-triangle"></i></span>' : ''}
          ${!u.can_receive_visits ? '<span class="badge bg-secondary ms-1" title="No recibe visitas"><i class="bi bi-slash-circle"></i></span>' : ''}
        </td>
        <td><span class="badge ${u.active ? 'bg-success' : 'bg-danger'}">${u.active ? 'Activo' : 'Inactivo'}</span></td>
        <td class="d-none d-md-table-cell"><small>${this.formatDateTime(u.createdAt)}</small></td>
        <td>
          <div class="d-flex gap-1 flex-wrap">
            <button class="btn btn-outline-primary btn-action" title="Editar" onclick="App.showUserForm(${u.id})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-warning btn-action" title="Cambiar contraseña" onclick="App.showChangePassword(${u.id})"><i class="bi bi-key"></i></button>
            ${u.active ? `<button class="btn btn-outline-danger btn-action" title="Desactivar" onclick="App.deactivateUser(${u.id}, '${this.esc(u.username)}')"><i class="bi bi-person-slash"></i></button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  showUserForm(userId) {
    const modal = new bootstrap.Modal(document.getElementById('userFormModal'));
    const title = document.getElementById('userFormTitle');
    const usernameInput = document.getElementById('ufUsername');
    const pwGroup = document.getElementById('ufPasswordGroup');
    const activeGroup = document.getElementById('ufActiveGroup');
    const errorDiv = document.getElementById('userFormError');
    const roleSelect = document.getElementById('ufRole');

    document.getElementById('userForm').reset();
    document.getElementById('userFormId').value = '';
    errorDiv.classList.add('d-none');

    // Ajustar opciones de rol según quién llama
    if (roleSelect) {
      if (this.isSuperAdmin()) {
        roleSelect.innerHTML = `
          <option value="user">Usuario</option>
          <option value="admin_empresa">Admin Empresa</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>`;
      } else {
        roleSelect.innerHTML = `
          <option value="user">Usuario</option>
          <option value="admin_empresa">Admin Empresa</option>`;
      }
    }

    // Mostrar/ocultar campo de can_trigger_evacuation (solo superadmin puede cambiar)
    const canTriggerGroup = document.getElementById('ufCanTriggerEvacGroup');
    if (canTriggerGroup) canTriggerGroup.style.display = this.isSuperAdmin() ? '' : 'none';

    if (userId) {
      title.innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Usuario';
      usernameInput.disabled = true;
      pwGroup.classList.add('d-none');
      activeGroup.classList.remove('d-none');
      API.getUser(userId).then((data) => {
        const u = data.user;
        document.getElementById('userFormId').value = u.id;
        usernameInput.value = u.username;
        document.getElementById('ufFullName').value = u.full_name || '';
        document.getElementById('ufRole').value = u.role || 'user';
        document.getElementById('ufActive').value = String(u.active);
        document.getElementById('ufPhone').value = u.phone || '';
        document.getElementById('ufEmail').value = u.email || '';
        document.getElementById('ufDni').value = u.dni || '';
        document.getElementById('ufJobLevel').value = u.job_level || '';
        document.getElementById('ufJobTitle').value = u.job_title || '';
        document.getElementById('ufDepartment').value = u.department || '';
        document.getElementById('ufSite').value = u.site || '';
        document.getElementById('ufBuilding').value = u.building || '';
        document.getElementById('ufCanReceiveVisits').value = String(u.can_receive_visits !== false);
        document.getElementById('ufCanTriggerEvac').value = String(u.can_trigger_evacuation === true);
      }).catch(() => this.toast('Error al cargar usuario', 'danger'));
    } else {
      title.innerHTML = '<i class="bi bi-person-plus me-2"></i>Nuevo Usuario';
      usernameInput.disabled = false;
      pwGroup.classList.remove('d-none');
      activeGroup.classList.add('d-none');
      document.getElementById('ufCanReceiveVisits').value = 'true';
      document.getElementById('ufCanTriggerEvac').value = 'false';
    }
    modal.show();
  },

  _collectUserFormData() {
    return {
      full_name: document.getElementById('ufFullName').value.trim(),
      phone: document.getElementById('ufPhone').value.trim(),
      email: document.getElementById('ufEmail').value.trim(),
      dni: document.getElementById('ufDni').value.trim(),
      job_level: document.getElementById('ufJobLevel').value || null,
      job_title: document.getElementById('ufJobTitle').value.trim(),
      department: document.getElementById('ufDepartment').value || null,
      site: document.getElementById('ufSite').value || null,
      building: document.getElementById('ufBuilding').value.trim(),
      can_receive_visits: document.getElementById('ufCanReceiveVisits').value === 'true',
      can_trigger_evacuation: document.getElementById('ufCanTriggerEvac').value === 'true',
      role: document.getElementById('ufRole').value,
    };
  },

  async handleUserSave() {
    const id = document.getElementById('userFormId').value;
    const errorDiv = document.getElementById('userFormError');
    errorDiv.classList.add('d-none');

    try {
      if (id) {
        const updateData = {
          ...this._collectUserFormData(),
          active: document.getElementById('ufActive').value === 'true',
        };
        await API.updateUser(id, updateData);
        this.toast('Usuario actualizado', 'success');
      } else {
        const password = document.getElementById('ufPassword').value;
        if (!password || password.length < 8) {
          errorDiv.textContent = 'La contraseña debe tener al menos 8 caracteres';
          errorDiv.classList.remove('d-none');
          return;
        }
        await API.createUser({
          username: document.getElementById('ufUsername').value.trim(),
          password,
          ...this._collectUserFormData(),
        });
        this.toast('Usuario creado', 'success');
      }
      bootstrap.Modal.getInstance(document.getElementById('userFormModal')).hide();
      this.loadUsers();
    } catch (err) {
      errorDiv.textContent = this.formatApiValidationError(err, 'Error al guardar usuario');
      errorDiv.classList.remove('d-none');
    }
  },

  showChangePassword(userId) {
    document.getElementById('cpUserId').value = userId;
    document.getElementById('cpPassword').value = '';
    document.getElementById('cpError').classList.add('d-none');
    new bootstrap.Modal(document.getElementById('changePasswordModal')).show();
  },

  async handleChangePassword() {
    const id = document.getElementById('cpUserId').value;
    const password = document.getElementById('cpPassword').value;
    const errorDiv = document.getElementById('cpError');
    errorDiv.classList.add('d-none');

    if (!password || password.length < 8) {
      errorDiv.textContent = 'La contraseña debe tener al menos 8 caracteres';
      errorDiv.classList.remove('d-none');
      return;
    }

    try {
      await API.changeUserPassword(id, password);
      this.toast('Contraseña actualizada', 'success');
      bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
    } catch (err) {
      errorDiv.textContent = this.formatApiValidationError(err, 'Error al cambiar contraseña');
      errorDiv.classList.remove('d-none');
    }
  },

  async deactivateUser(id, username) {
    if (!confirm(`¿Desactivar al usuario "${username}"?`)) return;
    try {
      await API.deleteUser(id);
      this.toast('Usuario desactivado', 'success');
      this.loadUsers();
    } catch (err) {
      this.toast(err.error || 'Error al desactivar usuario', 'danger');
    }
  },

  // ===== COMPANIES =====
  async loadCompaniesForSelect() {
    if (!this.isSuperAdmin()) return; // no necesario para usuarios de empresa
    try {
      const data = await API.getCompanies({ active: 'true' });
      this._companiesCache = data.companies || [];
      const sel = document.getElementById('vCompanyId');
      if (!sel) return;
      const currentVal = sel.value;
      sel.innerHTML = '<option value="">— Sin empresa / Particular —</option>';
      this._companiesCache.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        sel.appendChild(opt);
      });
      if (currentVal) sel.value = currentVal;
    } catch (_) { /* ignore */ }
  },

  async loadCompanies() {
    const tbody = document.getElementById('companiesTable');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>';
    try {
      const data = await API.getCompanies();
      this.renderCompaniesTable(data.companies);
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-danger">Error al cargar empresas</td></tr>';
    }
  },

  renderCompaniesTable(companies) {
    const tbody = document.getElementById('companiesTable');
    if (!companies.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No hay empresas registradas</td></tr>';
      return;
    }
    tbody.innerHTML = companies.map((c) => `
      <tr class="${!c.active ? 'table-secondary' : ''}">
        <td><small class="text-muted">#${c.id}</small></td>
        <td><strong>${this.esc(c.name)}</strong></td>
        <td class="d-none d-md-table-cell">${this.esc(c.rif || '—')}</td>
        <td class="d-none d-lg-table-cell">${this.esc(c.email || '—')}</td>
        <td class="d-none d-lg-table-cell">${this.esc(c.phone || '—')}</td>
        <td><span class="badge ${c.active ? 'bg-success' : 'bg-danger'}">${c.active ? 'Activa' : 'Inactiva'}</span></td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-outline-primary btn-action" title="Editar" onclick="App.showCompanyForm(${c.id})"><i class="bi bi-pencil"></i></button>
            ${c.active ? `<button class="btn btn-outline-danger btn-action" title="Desactivar" onclick="App.deactivateCompany(${c.id}, '${this.esc(c.name)}')"><i class="bi bi-building-slash"></i></button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  showCompanyForm(companyId) {
    const modal = new bootstrap.Modal(document.getElementById('companyFormModal'));
    const title = document.getElementById('companyFormTitle');
    const activeGroup = document.getElementById('cfActiveGroup');
    const errorDiv = document.getElementById('companyFormError');

    document.getElementById('companyForm').reset();
    document.getElementById('companyFormId').value = '';
    errorDiv.classList.add('d-none');

    if (companyId) {
      title.innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Empresa';
      activeGroup.classList.remove('d-none');
      this.editingCompanyId = companyId;
      API.getCompany(companyId).then((data) => {
        const c = data.company;
        document.getElementById('companyFormId').value = c.id;
        document.getElementById('cfName').value = c.name;
        document.getElementById('cfRif').value = c.rif || '';
        document.getElementById('cfEmail').value = c.email || '';
        document.getElementById('cfPhone').value = c.phone || '';
        document.getElementById('cfAddress').value = c.address || '';
        document.getElementById('cfActive').value = String(c.active);
      }).catch(() => this.toast('Error al cargar empresa', 'danger'));
    } else {
      title.innerHTML = '<i class="bi bi-building me-2"></i>Nueva Empresa';
      activeGroup.classList.add('d-none');
      this.editingCompanyId = null;
    }
    modal.show();
  },

  async handleCompanySave() {
    const id = document.getElementById('companyFormId').value;
    const errorDiv = document.getElementById('companyFormError');
    errorDiv.classList.add('d-none');

    const name = document.getElementById('cfName').value.trim();
    if (!name) {
      errorDiv.textContent = 'El nombre de la empresa es obligatorio';
      errorDiv.classList.remove('d-none');
      return;
    }

    const payload = {
      name,
      rif: document.getElementById('cfRif').value.trim(),
      email: document.getElementById('cfEmail').value.trim(),
      phone: document.getElementById('cfPhone').value.trim(),
      address: document.getElementById('cfAddress').value.trim(),
    };

    try {
      if (id) {
        payload.active = document.getElementById('cfActive').value === 'true';
        await API.updateCompany(id, payload);
        this.toast('Empresa actualizada', 'success');
      } else {
        await API.createCompany(payload);
        this.toast('Empresa creada', 'success');
      }
      bootstrap.Modal.getInstance(document.getElementById('companyFormModal')).hide();
      this.loadCompanies();
    } catch (err) {
      errorDiv.textContent = this.formatApiValidationError(err, 'Error al guardar empresa');
      errorDiv.classList.remove('d-none');
    }
  },

  async deactivateCompany(id, name) {
    if (!confirm(`¿Desactivar la empresa "${name}"?`)) return;
    try {
      await API.deleteCompany(id);
      this.toast('Empresa desactivada', 'success');
      this.loadCompanies();
    } catch (err) {
      this.toast(err.error || 'Error al desactivar empresa', 'danger');
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

  // ─── MÓDULO EVACUACIÓN ─────────────────────────────────────────────────────

  async loadEvacuationPage() {
    await Promise.all([this.loadActiveEvacuation(), this.loadPresentNow(), this.loadEvacuationHistory()]);
  },

  async loadActiveEvacuation() {
    try {
      const data = await API.getActiveEvacuation();
      const banner = document.getElementById('evacuationActiveBanner');
      const info = document.getElementById('evacuationBannerInfo');
      const btnTrigger = document.getElementById('btnTriggerEvacuation');
      if (data.event) {
        banner?.classList.remove('d-none');
        if (info) info.textContent = `Activada por ${data.event.triggeredBy?.full_name || '—'} a las ${new Date(data.event.triggered_at).toLocaleString('es-ES')} · Canal: ${data.event.channel_used}`;
        if (btnTrigger) { btnTrigger.disabled = true; btnTrigger.textContent = 'EVACUACIÓN ACTIVA'; }
      } else {
        banner?.classList.add('d-none');
        if (btnTrigger) { btnTrigger.disabled = false; btnTrigger.innerHTML = '<i class="bi bi-bell-fill me-2"></i>ACTIVAR ALARMA'; }
      }
      const mv = document.getElementById('metricVisitors');
      const me = document.getElementById('metricEmployees');
      const mt = document.getElementById('metricTotal');
      if (mv) mv.textContent = data.metrics?.present_visitors ?? '—';
      if (me) me.textContent = data.metrics?.present_employees ?? '—';
      if (mt) mt.textContent = (data.metrics?.present_visitors || 0) + (data.metrics?.present_employees || 0);
    } catch { /* silencioso */ }
  },

  async loadPresentNow() {
    try {
      const site = document.getElementById('filterPresenceSite')?.value || '';
      const building = document.getElementById('filterPresenceBuilding')?.value || '';
      const data = await API.getPresentNow({ site, building });

      const mv = document.getElementById('metricVisitors');
      const me = document.getElementById('metricEmployees');
      const mt = document.getElementById('metricTotal');
      const tvc = document.getElementById('tabVisitorCount');
      const tec = document.getElementById('tabEmployeeCount');
      if (mv) mv.textContent = data.visitors_count;
      if (me) me.textContent = data.employees_count;
      if (mt) mt.textContent = data.total;
      if (tvc) tvc.textContent = data.visitors_count;
      if (tec) tec.textContent = data.employees_count;

      const visitorsBody = document.getElementById('presentVisitorsTable');
      if (visitorsBody) {
        if (!data.visitors.length) {
          visitorsBody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">Sin visitantes en planta</td></tr>';
        } else {
          visitorsBody.innerHTML = data.visitors.map((v) => `<tr>
            <td>${this.esc(v.visitor_name)}</td>
            <td class="d-none d-md-table-cell">${this.esc(v.destination)}</td>
            <td class="d-none d-md-table-cell">${this.esc(v.visitor_phone || '—')}</td>
            <td class="d-none d-lg-table-cell">${this.esc(v.site || '—')}</td>
            <td><small>${v.check_in ? new Date(v.check_in).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}</small></td>
          </tr>`).join('');
        }
      }

      const employeesBody = document.getElementById('presentEmployeesTable');
      if (employeesBody) {
        if (!data.employees.length) {
          employeesBody.innerHTML = '<tr><td colspan="4" class="text-center py-3 text-muted">Sin empleados marcados como presentes</td></tr>';
        } else {
          employeesBody.innerHTML = data.employees.map((e) => `<tr>
            <td>${this.esc(e.full_name)}</td>
            <td class="d-none d-md-table-cell">${this.esc(e.department || '—')}</td>
            <td class="d-none d-md-table-cell">${this.esc(e.phone || '—')}</td>
            <td class="d-none d-lg-table-cell">${this.esc(e.site || '—')}</td>
          </tr>`).join('');
        }
      }
    } catch (err) {
      this.toast('Error al cargar presencia', 'danger');
    }
  },

  async loadEvacuationHistory() {
    try {
      const data = await API.getEvacuationHistory();
      const tbody = document.getElementById('evacuationHistoryTable');
      if (!tbody) return;
      if (!data.events.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">Sin evacuaciones registradas</td></tr>';
        return;
      }
      const statusBadge = (s) => s === 'active' ? '<span class="badge bg-danger">Activa</span>' : '<span class="badge bg-secondary">Cerrada</span>';
      tbody.innerHTML = data.events.map((ev) => `<tr>
        <td>#${ev.id}</td>
        <td>${statusBadge(ev.status)}</td>
        <td>${this.esc(ev.channel_used)}</td>
        <td>${this.esc(ev.triggeredBy?.full_name || '—')}</td>
        <td><small>${new Date(ev.triggered_at).toLocaleString('es-ES')}</small></td>
        <td><small>${ev.closed_at ? new Date(ev.closed_at).toLocaleString('es-ES') : '—'}</small></td>
        <td>
          <button class="btn btn-outline-secondary btn-sm" title="Descargar recuento CSV" onclick="API.exportRollcallCSV(${ev.id}).catch(()=>App.toast('Error','danger'))">
            <i class="bi bi-download"></i>
          </button>
          ${ev.status === 'active' ? `<button class="btn btn-danger btn-sm ms-1" onclick="App.handleCloseEvacuationById(${ev.id})">Cerrar</button>` : ''}
        </td>
      </tr>`).join('');
    } catch { /* silencioso */ }
  },

  async showEvacuationConfirm() {
    const modal = new bootstrap.Modal(document.getElementById('evacuationConfirmModal'));
    // Si es superadmin, mostrar selector de empresa
    const companyGroup = document.getElementById('evacuationCompanyGroup');
    const companySelect = document.getElementById('evacuationCompanyId');
    if (this.isSuperAdmin() && companyGroup && companySelect) {
      companyGroup.classList.remove('d-none');
      if (companySelect.options.length <= 1) {
        try {
          const data = await API.getCompanies();
          (data.companies || []).forEach((c) => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            companySelect.appendChild(opt);
          });
        } catch { /* silencioso */ }
      }
    } else if (companyGroup) {
      companyGroup.classList.add('d-none');
    }
    modal.show();
  },

  async handleTriggerEvacuation() {
    const btn = document.getElementById('confirmEvacuationBtn');
    const spinner = document.getElementById('evacuationSpinner');
    btn.disabled = true;
    spinner.classList.remove('d-none');
    try {
      const channel = document.getElementById('evacuationChannel').value;
      const message = document.getElementById('evacuationMessage').value.trim();
      const payload = { channel, message: message || undefined };
      // Superadmin debe seleccionar empresa
      if (this.isSuperAdmin()) {
        const companyId = document.getElementById('evacuationCompanyId')?.value;
        if (!companyId) {
          this.toast('Selecciona una empresa para activar la evacuación', 'warning');
          btn.disabled = false; spinner.classList.add('d-none');
          return;
        }
        payload.company_id = parseInt(companyId, 10);
      }
      const data = await API.triggerEvacuation(payload);
      bootstrap.Modal.getInstance(document.getElementById('evacuationConfirmModal')).hide();
      this.toast(`Evacuación activada. Enviados: ${data.stats?.sent || 0}, Fallidos: ${data.stats?.failed || 0}`, 'warning');
      this.loadEvacuationPage();
    } catch (err) {
      this.toast(err.error || 'Error al activar evacuación', 'danger');
    } finally {
      btn.disabled = false;
      spinner.classList.add('d-none');
    }
  },

  async handleCloseEvacuation() {
    try {
      const data = await API.getActiveEvacuation();
      if (!data.event) { this.toast('No hay evacuación activa', 'info'); return; }
      if (!confirm('¿Confirmas el cierre de la evacuación? Todos los empleados han sido contabilizados.')) return;
      await API.closeEvacuation(data.event.id);
      this.toast('Evacuación cerrada correctamente', 'success');
      this.loadEvacuationPage();
    } catch (err) {
      this.toast(err.error || 'Error al cerrar evacuación', 'danger');
    }
  },

  async handleCloseEvacuationById(id) {
    if (!confirm('¿Confirmas el cierre de esta evacuación?')) return;
    try {
      await API.closeEvacuation(id);
      this.toast('Evacuación cerrada', 'success');
      this.loadEvacuationPage();
    } catch (err) {
      this.toast(err.error || 'Error al cerrar evacuación', 'danger');
    }
  },

  // ─── MÓDULO INTEGRACIONES ───────────────────────────────────────────────────

  async loadIntegrationsPage() {
    try {
      const data = await API.getIntegrationsStatus();
      const statusEl = document.getElementById('integrationStatus');
      if (statusEl) {
        const prov = data.messaging;
        const badge = prov.active
          ? `<span class="badge bg-success">Twilio activo</span>`
          : `<span class="badge bg-warning text-dark">Mock (sin envío real)</span>`;
        statusEl.innerHTML = `
          <div class="d-flex align-items-center gap-3 mb-3">
            <i class="bi bi-broadcast fs-3 ${prov.active ? 'text-success' : 'text-warning'}"></i>
            <div>
              <div class="fw-semibold">Mensajería SMS/WhatsApp</div>
              ${badge}
              ${prov.reason ? `<div class="small text-muted mt-1">${this.esc(prov.reason)}</div>` : ''}
            </div>
          </div>
          <div class="small text-muted">
            <div><i class="bi bi-${data.api_key_configured ? 'check-circle text-success' : 'x-circle text-danger'} me-1"></i>API Key de integración: ${data.api_key_configured ? 'Configurada' : 'No configurada (INTEGRATION_API_KEY)'}</div>
          </div>`;
      }
      const baseUrl = document.getElementById('integrationBaseUrl');
      if (baseUrl) baseUrl.textContent = `${window.location.origin}/api/integrations/`;
    } catch (err) {
      this.toast('Error al cargar estado de integraciones', 'warning');
    }
  },

  async handleTestNotification(e) {
    e.preventDefault();
    const spinner = document.getElementById('testNotifSpinner');
    const resultEl = document.getElementById('testNotifResult');
    spinner.classList.remove('d-none');
    resultEl.classList.add('d-none');
    try {
      const channel = document.getElementById('testNotifChannel').value;
      const to = document.getElementById('testNotifTo').value.trim();
      const message = document.getElementById('testNotifMessage').value.trim();
      if (!to || !message) { this.toast('Completa todos los campos', 'warning'); return; }
      const data = await API.testIntegrationNotify({ channel, to, message });
      resultEl.className = 'alert alert-success mt-3';
      resultEl.innerHTML = `<i class="bi bi-check-circle me-2"></i>Mensaje enviado. Estado: <strong>${data.result?.status || 'ok'}</strong>`;
      resultEl.classList.remove('d-none');
    } catch (err) {
      resultEl.className = 'alert alert-danger mt-3';
      resultEl.textContent = err.error || 'Error al enviar notificación de prueba';
      resultEl.classList.remove('d-none');
    } finally {
      spinner.classList.add('d-none');
    }
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
