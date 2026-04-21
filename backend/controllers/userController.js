const ExcelJS = require('exceljs');
const { User, Company } = require('../models');
const { JOB_LEVELS, DEPARTMENTS, SITES } = require('../models/User');
const { isSuperAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const USER_ATTRS = [
  'id', 'username', 'full_name', 'role', 'company_id', 'active',
  'phone', 'email', 'job_level', 'job_title', 'department',
  'site', 'building', 'can_receive_visits', 'can_trigger_evacuation',
  'is_present', 'last_access_at', 'createdAt',
];

async function list(req, res, next) {
  try {
    const where = {};
    if (!isSuperAdmin(req.user.role)) {
      where.company_id = req.user.company_id;
    }

    const users = await User.findAll({
      where,
      attributes: USER_ATTRS,
      include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const where = { id: req.params.id };
    if (!isSuperAdmin(req.user.role)) where.company_id = req.user.company_id;

    const user = await User.findOne({
      where,
      attributes: USER_ATTRS,
      include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const {
      username, password, full_name, role,
      phone, email, job_level, job_title, department,
      site, building, can_receive_visits, can_trigger_evacuation,
    } = req.body;
    const callerRole = req.user.role;

    let companyId;
    if (isSuperAdmin(callerRole)) {
      companyId = req.body.company_id ? parseInt(req.body.company_id, 10) : null;
    } else {
      companyId = req.user.company_id;
    }

    // Superadmin puede asignar cualquier rol; admin_empresa solo user/admin_empresa
    let assignedRole = role || 'user';
    if (!isSuperAdmin(callerRole)) {
      assignedRole = (role === 'admin_empresa') ? 'admin_empresa' : 'user';
    }

    const existing = await User.findOne({ where: { username } });
    if (existing) return res.status(409).json({ error: 'El nombre de usuario ya existe' });

    // Solo superadmin puede asignar can_trigger_evacuation
    const canTriggerEvac = isSuperAdmin(callerRole)
      ? (can_trigger_evacuation ?? false)
      : false;

    const user = await User.create({
      username, password, full_name,
      role: assignedRole,
      company_id: companyId,
      active: true,
      phone: phone || null,
      email: email || null,
      job_level: job_level || null,
      job_title: job_title || null,
      department: department || null,
      site: site || null,
      building: building || null,
      can_receive_visits: can_receive_visits !== undefined ? Boolean(can_receive_visits) : true,
      can_trigger_evacuation: canTriggerEvac,
    });

    logger.info(`Usuario creado: ${username} (role: ${assignedRole}, company: ${companyId ?? 'global'}) por ${req.user.username}`);
    res.status(201).json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const where = { id: req.params.id };
    if (!isSuperAdmin(req.user.role)) where.company_id = req.user.company_id;

    const user = await User.findOne({ where });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const updates = {};
    const allowed = [
      'full_name', 'phone', 'email', 'job_level', 'job_title',
      'department', 'site', 'building', 'can_receive_visits',
    ];
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (req.body.role !== undefined) {
      if (!isSuperAdmin(req.user.role)) {
        if (!['user', 'admin_empresa'].includes(req.body.role)) {
          return res.status(403).json({ error: 'No puedes asignar ese rol' });
        }
        updates.role = req.body.role;
      } else {
        updates.role = req.body.role;
      }
    }

    if (req.body.active !== undefined) {
      if (user.id === req.user.id && !req.body.active) {
        return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });
      }
      updates.active = req.body.active;
    }

    // Solo superadmin puede cambiar can_trigger_evacuation
    if (req.body.can_trigger_evacuation !== undefined && isSuperAdmin(req.user.role)) {
      updates.can_trigger_evacuation = Boolean(req.body.can_trigger_evacuation);
    }

    await user.update(updates);
    logger.info(`Usuario actualizado: ${user.username} por ${req.user.username}`);
    res.json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
}

async function updateVisitable(req, res, next) {
  try {
    const where = { id: req.params.id };
    if (!isSuperAdmin(req.user.role)) where.company_id = req.user.company_id;
    const user = await User.findOne({ where });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (typeof req.body.visitable !== 'boolean') {
      return res.status(400).json({ error: 'Campo visitable inválido' });
    }

    await user.update({ can_receive_visits: req.body.visitable });
    logger.info(`Visitable actualizado para ${user.username}: ${req.body.visitable} por ${req.user.username}`);
    res.json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const where = { id: req.params.id };
    if (!isSuperAdmin(req.user.role)) where.company_id = req.user.company_id;

    const user = await User.findOne({ where });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    user.password = req.body.password;
    await user.save();

    logger.info(`Contraseña cambiada para: ${user.username} por ${req.user.username}`);
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const where = { id: req.params.id };
    if (!isSuperAdmin(req.user.role)) where.company_id = req.user.company_id;

    const user = await User.findOne({ where });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    await user.update({ active: false });
    logger.info(`Usuario desactivado: ${user.username} por ${req.user.username}`);
    res.json({ message: 'Usuario desactivado correctamente' });
  } catch (error) {
    next(error);
  }
}

/** Normaliza cabeceras de Excel para mapear columnas */
function normalizeHeader(raw) {
  if (raw === undefined || raw === null) return '';
  let s = String(raw).trim().toLowerCase();
  s = s.replace(/ñ/g, 'n');
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s.replace(/\s+/g, '_');
}

const HEADER_TO_FIELD = {
  usuario: 'username',
  username: 'username',
  user: 'username',
  usuario_acceso: 'username',
  contrasena: 'password',
  contraseña: 'password',
  password: 'password',
  clave: 'password',
  nombre_completo: 'full_name',
  nombre: 'full_name',
  full_name: 'full_name',
  apellidos_y_nombre: 'full_name',
  email: 'email',
  correo: 'email',
  correo_electronico: 'email',
  telefono: 'phone',
  teléfono: 'phone',
  phone: 'phone',
  movil: 'phone',
  departamento: 'department',
  department: 'department',
  dpto: 'department',
  cargo: 'job_title',
  titulo_cargo: 'job_title',
  puesto: 'job_title',
  job_title: 'job_title',
  nivel_cargo: 'job_level',
  job_level: 'job_level',
  sede: 'site',
  site: 'site',
  edificio: 'building',
  building: 'building',
  puede_recibir_visitas: 'can_receive_visits',
  recibe_visitas: 'can_receive_visits',
};

function mapHeaderToField(headerCell) {
  const n = normalizeHeader(headerCell);
  return HEADER_TO_FIELD[n] || null;
}

function parseBoolCell(val) {
  if (val === undefined || val === null || val === '') return true;
  const s = String(val).trim().toLowerCase();
  if (['no', 'false', '0', 'n', 'f'].includes(s)) return false;
  if (['sí', 'si', 'yes', 'true', '1', 's', 'y'].includes(s)) return true;
  return true;
}

function validateOptionalEnum(value, allowed, label) {
  if (!value || String(value).trim() === '') return { ok: true, value: null };
  const v = String(value).trim();
  if (!allowed.includes(v)) {
    return { ok: false, error: `${label} inválido: "${v}". Valores: ${allowed.join(', ')}` };
  }
  return { ok: true, value: v };
}

/**
 * GET /api/users/import/template
 * Descarga plantilla .xlsx con columnas y hoja de referencia de códigos.
 */
async function downloadImportTemplate(req, res, next) {
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sistema de Registro de Visitas';

    const ws = wb.addWorksheet('Empleados', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
      { header: 'usuario', key: 'u', width: 16 },
      { header: 'contraseña', key: 'p', width: 14 },
      { header: 'nombre_completo', key: 'n', width: 28 },
      { header: 'email', key: 'e', width: 26 },
      { header: 'telefono', key: 't', width: 14 },
      { header: 'departamento', key: 'd', width: 22 },
      { header: 'cargo', key: 'c', width: 22 },
      { header: 'nivel_cargo', key: 'nl', width: 18 },
      { header: 'sede', key: 's', width: 12 },
      { header: 'edificio', key: 'b', width: 14 },
      { header: 'puede_recibir_visitas', key: 'cr', width: 22 },
    ];
    const hr = ws.getRow(1);
    hr.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4361EE' } };

    ws.addRow({
      u: 'jperez',
      p: 'Cambiar123',
      n: 'Juan Pérez García',
      e: 'juan.perez@empresa.com',
      t: '+34 600 000 000',
      d: 'rrhh',
      c: 'Técnico de selección',
      nl: 'tecnico_administrativo',
      s: 'Madrid',
      b: 'Torre A',
      cr: 'sí',
    });

    ws.getCell('A3').value = 'Rellena una fila por empleado. Elimina la fila de ejemplo (jperez) antes de importar. Contraseñas: mínimo 8 caracteres. Usa los códigos exactos de la hoja "Referencia" para departamento, nivel_cargo y sede.';
    ws.getCell('A3').font = { italic: true, color: { argb: 'FF666666' } };
    ws.mergeCells('A3:K3');

    const ref = wb.addWorksheet('Referencia');
    ref.getCell('A1').value = 'departamento (código)';
    ref.getCell('B1').value = 'nivel_cargo (código)';
    ref.getCell('C1').value = 'sede (valor)';
    ref.getCell('A1').font = { bold: true };
    ref.getCell('B1').font = { bold: true };
    ref.getCell('C1').font = { bold: true };

    let r = 2;
    const maxLen = Math.max(DEPARTMENTS.length, JOB_LEVELS.length, SITES.length);
    for (let i = 0; i < maxLen; i++) {
      if (DEPARTMENTS[i]) ref.getCell(`A${r}`).value = DEPARTMENTS[i];
      if (JOB_LEVELS[i]) ref.getCell(`B${r}`).value = JOB_LEVELS[i];
      if (SITES[i]) ref.getCell(`C${r}`).value = SITES[i];
      r++;
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_empleados.xlsx');
    await wb.xlsx.write(res);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/users/import  (multipart: file)
 * Importa empleados desde Excel. Crea usuarios con rol "user" en la empresa del administrador.
 */
async function importExcel(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Adjunta un archivo Excel (.xlsx)' });
    }

    const callerRole = req.user.role;
    let companyId;
    if (isSuperAdmin(callerRole)) {
      const raw = req.body.company_id;
      companyId = raw ? parseInt(raw, 10) : null;
      if (!companyId || Number.isNaN(companyId)) {
        return res.status(400).json({ error: 'Como superadmin debes indicar company_id (empresa destino).' });
      }
      const comp = await Company.findByPk(companyId);
      if (!comp) return res.status(404).json({ error: 'Empresa no encontrada' });
    } else {
      companyId = req.user.company_id;
      if (!companyId) {
        return res.status(400).json({ error: 'Tu usuario no está asociado a una empresa.' });
      }
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    const ws = wb.getWorksheet('Empleados') || wb.worksheets[0];
    if (!ws) {
      return res.status(400).json({ error: 'El archivo no contiene hojas de cálculo.' });
    }

    const headerRow = ws.getRow(1);
    const colToField = {};
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const field = mapHeaderToField(cell.value);
      if (field) colToField[colNumber] = field;
    });

    if (!colToField || !Object.values(colToField).includes('username')) {
      return res.status(400).json({
        error: 'Falta la columna obligatoria "usuario" (primera fila = cabeceras).',
      });
    }
    if (!Object.values(colToField).includes('password')) {
      return res.status(400).json({
        error: 'Falta la columna obligatoria "contraseña".',
      });
    }
    if (!Object.values(colToField).includes('full_name')) {
      return res.status(400).json({
        error: 'Falta la columna obligatoria "nombre_completo".',
      });
    }

    const seenUsernames = new Set();
    const results = { created: 0, failed: 0, errors: [] };

    const maxRow = ws.rowCount;
    for (let rowNum = 2; rowNum <= maxRow; rowNum++) {
      const row = ws.getRow(rowNum);
      const data = {};
      Object.entries(colToField).forEach(([colStr, field]) => {
        const col = parseInt(colStr, 10);
        const cell = row.getCell(col);
        let v = cell.value;
        if (v && typeof v === 'object' && v.text !== undefined) v = v.text;
        if (v !== undefined && v !== null) data[field] = String(v).trim();
        else data[field] = '';
      });

      const username = data.username;
      const password = data.password;
      const fullName = data.full_name;

      if (!username && !password && !fullName) continue;

      if (!username || !password || !fullName) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          username: username || '—',
          error: 'Faltan usuario, contraseña o nombre_completo',
        });
        continue;
      }

      if (username.length < 3 || username.length > 50) {
        results.failed++;
        results.errors.push({ row: rowNum, username, error: 'Usuario: entre 3 y 50 caracteres' });
        continue;
      }

      if (password.length < 8) {
        results.failed++;
        results.errors.push({ row: rowNum, username, error: 'Contraseña: mínimo 8 caracteres' });
        continue;
      }

      if (fullName.length < 2 || fullName.length > 100) {
        results.failed++;
        results.errors.push({ row: rowNum, username, error: 'Nombre completo: entre 2 y 100 caracteres' });
        continue;
      }

      if (seenUsernames.has(username.toLowerCase())) {
        results.failed++;
        results.errors.push({ row: rowNum, username, error: 'Usuario duplicado en el archivo' });
        continue;
      }
      seenUsernames.add(username.toLowerCase());

      const exists = await User.findOne({ where: { username } });
      if (exists) {
        results.failed++;
        results.errors.push({ row: rowNum, username, error: 'El nombre de usuario ya existe en el sistema' });
        continue;
      }

      const dep = validateOptionalEnum(data.department, DEPARTMENTS, 'departamento');
      if (!dep.ok) {
        results.failed++;
        results.errors.push({ row: rowNum, username, error: dep.error });
        continue;
      }

      const jl = validateOptionalEnum(data.job_level, JOB_LEVELS, 'nivel_cargo');
      if (!jl.ok) {
        results.failed++;
        results.errors.push({ row: rowNum, username, error: jl.error });
        continue;
      }

      const st = validateOptionalEnum(data.site, SITES, 'sede');
      if (!st.ok) {
        results.failed++;
        results.errors.push({ row: rowNum, username, error: st.error });
        continue;
      }

      let email = data.email || null;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.failed++;
        results.errors.push({ row: rowNum, username, error: 'Email inválido' });
        continue;
      }
      if (email === '') email = null;

      try {
        await User.create({
          username,
          password,
          full_name: fullName,
          role: 'user',
          company_id: companyId,
          active: true,
          phone: data.phone || null,
          email,
          job_level: jl.value,
          job_title: data.job_title || null,
          department: dep.value,
          site: st.value,
          building: data.building || null,
          can_receive_visits: parseBoolCell(data.can_receive_visits),
          can_trigger_evacuation: false,
        });
        results.created++;
        logger.info(`Import empleado: ${username} (empresa ${companyId}) por ${req.user.username}`);
      } catch (err) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          username,
          error: err.message || 'Error al crear',
        });
      }
    }

    res.status(201).json({
      message: `Importación finalizada: ${results.created} creados, ${results.failed} con error.`,
      ...results,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  changePassword,
  remove,
  updateVisitable,
  downloadImportTemplate,
  importExcel,
};
