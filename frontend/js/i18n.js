const TRANSLATIONS = {
  es: {
    // Login
    login_title: 'Registro de Visitas',
    login_subtitle: 'Inicia sesión para continuar',
    login_user: 'Usuario',
    login_password: 'Contraseña',
    login_btn: 'Iniciar Sesión',

    // Nav
    nav_dashboard: 'Dashboard',
    nav_visits: 'Visitas',
    nav_new_visit: 'Nueva Visita',
    nav_users: 'Empleados',
    nav_platform_users: 'Usuarios plataforma',
    nav_companies: 'Empresas',
    nav_evacuation: 'Evacuación',
    nav_integrations: 'Integraciones',
    nav_logout: 'Cerrar sesión',

    // Dashboard
    dash_stat_total: 'Total visitas',
    dash_stat_today: 'Hoy',
    dash_stat_inside: 'En instalaciones',
    dash_stat_checkouts: 'Salidas hoy',
    dash_activity: 'Actividad',
    dash_week: 'Semana',
    dash_month: 'Mes',
    dash_destinations: 'Destinos principales',
    dash_recent_current: 'Actuales',
    dash_recent_all: 'Todas',
    dash_recent_title_current: 'Visitas en instalación (actual)',
    dash_recent_title_all: 'Visitas recientes (todas)',

    // Visit list
    visits_title: 'Visitas',
    visits_search_placeholder: 'Nombre, empresa, destino...',
    visits_filter_status: 'Estado',
    visits_filter_from: 'Desde',
    visits_filter_to: 'Hasta',
    visits_btn_search: 'Buscar',
    visits_btn_clear: 'Limpiar',
    visits_btn_excel: 'Excel',
    visits_btn_pdf: 'PDF',
    visits_btn_new: 'Nueva Visita',
    visits_filter_all: 'Todos',
    visits_col_visitor: 'Visitante',
    visits_col_host: 'Persona visitada',
    visits_col_status: 'Estado',
    visits_col_checkin: 'Entrada',
    visits_col_checkout: 'Salida',
    visits_col_actions: 'Acciones',
    users_col_email: 'Correo',
    users_col_phone: 'Teléfono',
    users_col_visitable: 'Visitable',
    users_col_access: 'Usuario acceso',
    users_col_created: 'Creado',

    // Status
    status_pending: 'Pendiente',
    status_checked_in: 'En instalaciones',
    status_checked_out: 'Salida registrada',
    status_cancelled: 'Cancelada',

    // Visit form
    visit_form_new: 'Nueva Visita',
    visit_form_edit: 'Editar Visita',
    visit_section_visitor: 'Persona visitante',
    visit_section_host: 'Persona o área visitada',
    visit_field_name: 'Nombre completo',
    visit_field_company: 'Empresa del visitante',
    visit_field_email: 'Email',
    visit_field_phone: 'Teléfono',
    visit_field_document: 'DNI / NIE',
    visit_field_plate: 'Matrícula del vehículo',
    visit_field_host_name: 'Nombre empleado',
    visit_field_host_job: 'Cargo',
    visit_field_host_email: 'E-mail persona visitada',
    visit_field_host_phone: 'Teléfono persona visitada',
    visit_field_site: 'Oficina / Sede',
    visit_field_destination: 'Departamento / Destino',
    visit_field_building: 'Edificio',
    visit_field_purpose: 'Motivo de la visita',
    visit_field_notes: 'Notas internas',
    visit_field_signature: 'Firma del Visitante',
    visit_btn_preregister: 'Pre-registrar visita',
    visit_btn_register: 'Registrar visita',
    visit_btn_save: 'Guardar Cambios',
    visit_btn_cancel: 'Cancelar',
    visit_checkin_section: 'Fecha y hora de entrada / salida',
    visit_checkin_label: 'Entrada',
    visit_checkout_label: 'Salida',
    visit_print_after: 'Tras guardar, abrir la credencial con código QR para imprimir o guardar PDF',

    // Visit detail
    detail_visitor: 'Visitante',
    detail_visitor_company: 'Empresa visitante',
    detail_visitor_email: 'Email visitante',
    detail_visitor_phone: 'Teléfono',
    detail_visitor_plate: 'Matrícula vehículo',
    detail_host: 'Persona visitada',
    detail_destination: 'Destino / Dpto.',
    detail_host_email: 'Email persona visitada',
    detail_location: 'Ubicación',
    detail_purpose: 'Motivo',
    detail_status: 'Estado',
    detail_checkin: 'Entrada',
    detail_checkout: 'Salida',
    detail_creator: 'Registrado por',
    detail_created_at: 'Fecha de creación',
    detail_notes: 'NOTAS',
    detail_signature: 'FIRMA DEL VISITANTE',
    detail_btn_checkin: 'Registrar Entrada',
    detail_btn_checkout: 'Registrar Salida',
    detail_btn_cancel_visit: 'Cancelar visita',
    detail_btn_print: 'Imprimir Credencial',
    detail_btn_pdf: 'PDF',
    detail_btn_close: 'Cerrar',

    // Users / employees
    users_title: 'Empleados',
    users_btn_new: 'Nuevo Empleado',
    users_btn_import: 'Importar Excel',
    users_col_name: 'Nombre',
    users_col_role: 'Rol',
    users_col_dept: 'Departamento',
    users_col_site: 'Sede',
    users_col_status: 'Estado',
    users_col_actions: 'Acciones',
    user_form_new: 'Nuevo empleado',
    user_form_edit: 'Editar empleado',
    user_section_credentials: 'Credenciales de acceso',
    user_field_username: 'Usuario',
    user_field_password: 'Contraseña',
    user_field_role: 'Rol',
    user_field_status: 'Estado',
    user_section_personal: 'Información personal',
    user_field_fullname: 'Nombre Completo',
    user_field_phone: 'Teléfono',
    user_field_email: 'Email de contacto',
    user_section_job: 'Cargo y ubicación',
    user_field_document: 'DNI / NIE',
    user_field_job_level: 'Nivel de cargo',
    user_field_job_title: 'Título del cargo',
    user_field_department: 'Departamento',
    user_field_site: 'Sede',
    user_field_building: 'Edificio',
    user_active: 'Activo',
    user_inactive: 'Inactivo',

    // Companies
    companies_title: 'Gestión de Empresas',
    companies_btn_new: 'Nueva Empresa',
    company_form_new: 'Registrar nueva empresa',
    company_form_edit: 'Editar Empresa',
    company_field_name: 'Nombre',
    company_field_rif: 'RIF / NIF',
    company_field_email: 'Email',
    company_field_phone: 'Teléfono',
    company_field_address: 'Dirección',
    company_admin_section: 'Administrador de la empresa',
    company_admin_name: 'Nombre completo',
    company_admin_user: 'Usuario',
    company_admin_pass: 'Contraseña',
    company_admin_pass_confirm: 'Confirmar contraseña',

    // Evacuation
    evacuation_title: 'Módulo de Evacuación',
    evacuation_btn_trigger: 'Activar Evacuación',

    // Common
    btn_save: 'Guardar',
    btn_cancel: 'Cancelar',
    btn_edit: 'Editar',
    btn_delete: 'Eliminar',
    btn_close: 'Cerrar',
    btn_checkin: 'Check-in',
    btn_checkout: 'Salida',
    status_active: 'Activo',
    status_inactive: 'Inactivo',
    no_records: 'Sin registros',
    loading: 'Cargando...',
    required_fields: 'Completa todos los campos obligatorios',
    confirm_delete: '¿Eliminar esta visita?',
    confirm_cancel_visit: '¿Cancelar esta visita? Esta acción no se puede deshacer.',
  },

  ca: {
    // Login
    login_title: 'Registre de Visites',
    login_subtitle: 'Inicia sessió per continuar',
    login_user: 'Usuari',
    login_password: 'Contrasenya',
    login_btn: 'Iniciar Sessió',

    // Nav
    nav_dashboard: 'Tauler',
    nav_visits: 'Visites',
    nav_new_visit: 'Nova Visita',
    nav_users: 'Empleats',
    nav_platform_users: 'Usuaris plataforma',
    nav_companies: 'Empreses',
    nav_evacuation: 'Evacuació',
    nav_integrations: 'Integracions',
    nav_logout: 'Tancar sessió',

    // Dashboard
    dash_stat_total: 'Total visites',
    dash_stat_today: 'Avui',
    dash_stat_inside: 'A les instal·lacions',
    dash_stat_checkouts: 'Sortides avui',
    dash_activity: 'Activitat',
    dash_week: 'Setmana',
    dash_month: 'Mes',
    dash_destinations: 'Destinacions principals',
    dash_recent_current: 'Actuals',
    dash_recent_all: 'Totes',
    dash_recent_title_current: 'Visites a les instal·lacions (actual)',
    dash_recent_title_all: 'Visites recents (totes)',

    // Visit list
    visits_title: 'Visites',
    visits_search_placeholder: 'Nom, empresa, destinació...',
    visits_filter_status: 'Estat',
    visits_filter_from: 'Des de',
    visits_filter_to: 'Fins a',
    visits_btn_search: 'Cercar',
    visits_btn_clear: 'Netejar',
    visits_btn_excel: 'Excel',
    visits_btn_pdf: 'PDF',
    visits_btn_new: 'Nova Visita',
    visits_filter_all: 'Tots',
    visits_col_visitor: 'Visitant',
    visits_col_host: 'Persona visitada',
    visits_col_status: 'Estat',
    visits_col_checkin: 'Entrada',
    visits_col_checkout: 'Sortida',
    visits_col_actions: 'Accions',
    users_col_email: 'Correu',
    users_col_phone: 'Telèfon',
    users_col_visitable: 'Visitable',
    users_col_access: 'Usuari accés',
    users_col_created: 'Creat',

    // Status
    status_pending: 'Pendent',
    status_checked_in: 'A les instal·lacions',
    status_checked_out: 'Sortida registrada',
    status_cancelled: 'Cancel·lada',

    // Visit form
    visit_form_new: 'Nova Visita',
    visit_form_edit: 'Editar Visita',
    visit_section_visitor: 'Persona visitant',
    visit_section_host: 'Persona o àrea visitada',
    visit_field_name: 'Nom complet',
    visit_field_company: 'Empresa del visitant',
    visit_field_email: 'Correu electrònic',
    visit_field_phone: 'Telèfon',
    visit_field_document: 'DNI / NIE',
    visit_field_plate: 'Matrícula del vehicle',
    visit_field_host_name: 'Nom empleat',
    visit_field_host_job: 'Càrrec',
    visit_field_host_email: 'Correu persona visitada',
    visit_field_host_phone: 'Telèfon persona visitada',
    visit_field_site: 'Oficina / Seu',
    visit_field_destination: 'Departament / Destinació',
    visit_field_building: 'Edifici',
    visit_field_purpose: 'Motiu de la visita',
    visit_field_notes: 'Notes internes',
    visit_field_signature: 'Signatura del Visitant',
    visit_btn_preregister: 'Pre-registrar visita',
    visit_btn_register: 'Registrar visita',
    visit_btn_save: 'Desar Canvis',
    visit_btn_cancel: 'Cancel·lar',
    visit_checkin_section: 'Data i hora d\'entrada / sortida',
    visit_checkin_label: 'Entrada',
    visit_checkout_label: 'Sortida',
    visit_print_after: 'Després de desar, obrir la credencial amb codi QR per imprimir o desar PDF',

    // Visit detail
    detail_visitor: 'Visitant',
    detail_visitor_company: 'Empresa visitant',
    detail_visitor_email: 'Correu visitant',
    detail_visitor_phone: 'Telèfon',
    detail_visitor_plate: 'Matrícula vehicle',
    detail_host: 'Persona visitada',
    detail_destination: 'Destinació / Dpt.',
    detail_host_email: 'Correu persona visitada',
    detail_location: 'Ubicació',
    detail_purpose: 'Motiu',
    detail_status: 'Estat',
    detail_checkin: 'Entrada',
    detail_checkout: 'Sortida',
    detail_creator: 'Registrat per',
    detail_created_at: 'Data de creació',
    detail_notes: 'NOTES',
    detail_signature: 'SIGNATURA DEL VISITANT',
    detail_btn_checkin: 'Registrar Entrada',
    detail_btn_checkout: 'Registrar Sortida',
    detail_btn_cancel_visit: 'Cancel·lar visita',
    detail_btn_print: 'Imprimir Credencial',
    detail_btn_pdf: 'PDF',
    detail_btn_close: 'Tancar',

    // Users / employees
    users_title: 'Empleats',
    users_btn_new: 'Nou Empleat',
    users_btn_import: 'Importar Excel',
    users_col_name: 'Nom',
    users_col_role: 'Rol',
    users_col_dept: 'Departament',
    users_col_site: 'Seu',
    users_col_status: 'Estat',
    users_col_actions: 'Accions',
    user_form_new: 'Nou empleat',
    user_form_edit: 'Editar empleat',
    user_section_credentials: 'Credencials d\'accés',
    user_field_username: 'Usuari',
    user_field_password: 'Contrasenya',
    user_field_role: 'Rol',
    user_field_status: 'Estat',
    user_section_personal: 'Informació personal',
    user_field_fullname: 'Nom Complet',
    user_field_phone: 'Telèfon',
    user_field_email: 'Correu de contacte',
    user_section_job: 'Càrrec i ubicació',
    user_field_document: 'DNI / NIE',
    user_field_job_level: 'Nivell de càrrec',
    user_field_job_title: 'Títol del càrrec',
    user_field_department: 'Departament',
    user_field_site: 'Seu',
    user_field_building: 'Edifici',
    user_active: 'Actiu',
    user_inactive: 'Inactiu',

    // Companies
    companies_title: 'Gestió d\'Empreses',
    companies_btn_new: 'Nova Empresa',
    company_form_new: 'Registrar nova empresa',
    company_form_edit: 'Editar Empresa',
    company_field_name: 'Nom',
    company_field_rif: 'RIF / NIF',
    company_field_email: 'Correu',
    company_field_phone: 'Telèfon',
    company_field_address: 'Adreça',
    company_admin_section: 'Administrador de l\'empresa',
    company_admin_name: 'Nom complet',
    company_admin_user: 'Usuari',
    company_admin_pass: 'Contrasenya',
    company_admin_pass_confirm: 'Confirmar contrasenya',

    // Evacuation
    evacuation_title: 'Mòdul d\'Evacuació',
    evacuation_btn_trigger: 'Activar Evacuació',

    // Common
    btn_save: 'Desar',
    btn_cancel: 'Cancel·lar',
    btn_edit: 'Editar',
    btn_delete: 'Eliminar',
    btn_close: 'Tancar',
    btn_checkin: 'Check-in',
    btn_checkout: 'Sortida',
    status_active: 'Actiu',
    status_inactive: 'Inactiu',
    no_records: 'Sense registres',
    loading: 'Carregant...',
    required_fields: 'Completa tots els camps obligatoris',
    confirm_delete: 'Eliminar aquesta visita?',
    confirm_cancel_visit: 'Cancel·lar aquesta visita? Aquesta acció no es pot desfer.',
  },

  en: {
    // Login
    login_title: 'Visitor Register',
    login_subtitle: 'Sign in to continue',
    login_user: 'Username',
    login_password: 'Password',
    login_btn: 'Sign In',

    // Nav
    nav_dashboard: 'Dashboard',
    nav_visits: 'Visits',
    nav_new_visit: 'New Visit',
    nav_users: 'Employees',
    nav_platform_users: 'Platform users',
    nav_companies: 'Companies',
    nav_evacuation: 'Evacuation',
    nav_integrations: 'Integrations',
    nav_logout: 'Sign out',

    // Dashboard
    dash_stat_total: 'Total visits',
    dash_stat_today: 'Today',
    dash_stat_inside: 'On premises',
    dash_stat_checkouts: 'Checkouts today',
    dash_activity: 'Activity',
    dash_week: 'Week',
    dash_month: 'Month',
    dash_destinations: 'Top destinations',
    dash_recent_current: 'Current',
    dash_recent_all: 'All',
    dash_recent_title_current: 'Visitors on premises (current)',
    dash_recent_title_all: 'Recent visits (all)',

    // Visit list
    visits_title: 'Visits',
    visits_search_placeholder: 'Name, company, destination...',
    visits_filter_status: 'Status',
    visits_filter_from: 'From',
    visits_filter_to: 'To',
    visits_btn_search: 'Search',
    visits_btn_clear: 'Clear',
    visits_btn_excel: 'Excel',
    visits_btn_pdf: 'PDF',
    visits_btn_new: 'New Visit',
    visits_filter_all: 'All',
    visits_col_visitor: 'Visitor',
    visits_col_host: 'Host',
    visits_col_status: 'Status',
    visits_col_checkin: 'Check-in',
    visits_col_checkout: 'Check-out',
    visits_col_actions: 'Actions',
    users_col_email: 'Email',
    users_col_phone: 'Phone',
    users_col_visitable: 'Visitable',
    users_col_access: 'Login',
    users_col_created: 'Created',

    // Status
    status_pending: 'Pending',
    status_checked_in: 'On premises',
    status_checked_out: 'Checked out',
    status_cancelled: 'Cancelled',

    // Visit form
    visit_form_new: 'New Visit',
    visit_form_edit: 'Edit Visit',
    visit_section_visitor: 'Visitor',
    visit_section_host: 'Host / Area',
    visit_field_name: 'Full name',
    visit_field_company: 'Visitor\'s company',
    visit_field_email: 'Email',
    visit_field_phone: 'Phone',
    visit_field_document: 'ID / Passport',
    visit_field_plate: 'Vehicle plate',
    visit_field_host_name: 'Employee name',
    visit_field_host_job: 'Job title',
    visit_field_host_email: 'Host email',
    visit_field_host_phone: 'Host phone',
    visit_field_site: 'Office / Site',
    visit_field_destination: 'Department / Destination',
    visit_field_building: 'Building',
    visit_field_purpose: 'Purpose of visit',
    visit_field_notes: 'Internal notes',
    visit_field_signature: 'Visitor Signature',
    visit_btn_preregister: 'Pre-register visit',
    visit_btn_register: 'Register visit',
    visit_btn_save: 'Save Changes',
    visit_btn_cancel: 'Cancel',
    visit_checkin_section: 'Check-in / Check-out date & time',
    visit_checkin_label: 'Check-in',
    visit_checkout_label: 'Check-out',
    visit_print_after: 'After saving, open the QR credential to print or save as PDF',

    // Visit detail
    detail_visitor: 'Visitor',
    detail_visitor_company: 'Visitor\'s company',
    detail_visitor_email: 'Visitor email',
    detail_visitor_phone: 'Phone',
    detail_visitor_plate: 'Vehicle plate',
    detail_host: 'Host',
    detail_destination: 'Destination / Dept.',
    detail_host_email: 'Host email',
    detail_location: 'Location',
    detail_purpose: 'Purpose',
    detail_status: 'Status',
    detail_checkin: 'Check-in',
    detail_checkout: 'Check-out',
    detail_creator: 'Registered by',
    detail_created_at: 'Creation date',
    detail_notes: 'NOTES',
    detail_signature: 'VISITOR SIGNATURE',
    detail_btn_checkin: 'Register Check-in',
    detail_btn_checkout: 'Register Check-out',
    detail_btn_cancel_visit: 'Cancel visit',
    detail_btn_print: 'Print Credential',
    detail_btn_pdf: 'PDF',
    detail_btn_close: 'Close',

    // Users / employees
    users_title: 'Employees',
    users_btn_new: 'New Employee',
    users_btn_import: 'Import Excel',
    users_col_name: 'Name',
    users_col_role: 'Role',
    users_col_dept: 'Department',
    users_col_site: 'Site',
    users_col_status: 'Status',
    users_col_actions: 'Actions',
    user_form_new: 'New employee',
    user_form_edit: 'Edit employee',
    user_section_credentials: 'Access credentials',
    user_field_username: 'Username',
    user_field_password: 'Password',
    user_field_role: 'Role',
    user_field_status: 'Status',
    user_section_personal: 'Personal information',
    user_field_fullname: 'Full name',
    user_field_phone: 'Phone',
    user_field_email: 'Contact email',
    user_section_job: 'Job & location',
    user_field_document: 'ID / NIE',
    user_field_job_level: 'Job level',
    user_field_job_title: 'Job title',
    user_field_department: 'Department',
    user_field_site: 'Site',
    user_field_building: 'Building',
    user_active: 'Active',
    user_inactive: 'Inactive',

    // Companies
    companies_title: 'Company Management',
    companies_btn_new: 'New Company',
    company_form_new: 'Register new company',
    company_form_edit: 'Edit Company',
    company_field_name: 'Name',
    company_field_rif: 'Tax ID',
    company_field_email: 'Email',
    company_field_phone: 'Phone',
    company_field_address: 'Address',
    company_admin_section: 'Company administrator',
    company_admin_name: 'Full name',
    company_admin_user: 'Username',
    company_admin_pass: 'Password',
    company_admin_pass_confirm: 'Confirm password',

    // Evacuation
    evacuation_title: 'Evacuation Module',
    evacuation_btn_trigger: 'Trigger Evacuation',

    // Common
    btn_save: 'Save',
    btn_cancel: 'Cancel',
    btn_edit: 'Edit',
    btn_delete: 'Delete',
    btn_close: 'Close',
    btn_checkin: 'Check-in',
    btn_checkout: 'Check-out',
    status_active: 'Active',
    status_inactive: 'Inactive',
    no_records: 'No records',
    loading: 'Loading...',
    required_fields: 'Please fill in all required fields',
    confirm_delete: 'Delete this visit?',
    confirm_cancel_visit: 'Cancel this visit? This action cannot be undone.',
  },
};

let _currentLang = localStorage.getItem('lang') || 'es';

function t(key) {
  return TRANSLATIONS[_currentLang]?.[key] ?? TRANSLATIONS.es[key] ?? key;
}

function setLang(lang) {
  if (!TRANSLATIONS[lang]) return;
  _currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = val;
    } else if (el.children.length > 0) {
      // has child elements (icons, * spans, etc.)
      // find the meaningful text node (non-whitespace), replace it, blank the rest
      const textNodes = Array.from(el.childNodes).filter((n) => n.nodeType === 3);
      const target = textNodes.find((n) => n.textContent.trim() !== '') ?? textNodes[textNodes.length - 1];
      textNodes.forEach((n) => { n.textContent = n === target ? val : ''; });
    } else {
      el.textContent = val;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });

  // update language switcher active state
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  // re-render dashboard recent title if visible
  const recentTitle = document.getElementById('recentVisitsTitle');
  if (recentTitle && window.App) {
    recentTitle.innerHTML = window.App.dashboardRecentAll
      ? `<i class="bi bi-clock-history me-2"></i>${t('dash_recent_title_all')}`
      : `<i class="bi bi-clock-history me-2"></i>${t('dash_recent_title_current')}`;
  }
}

function getCurrentLang() { return _currentLang; }
