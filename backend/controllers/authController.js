const jwt = require('jsonwebtoken');
const { User, Company, sequelize } = require('../models');
const logger = require('../utils/logger');

function buildToken(user, companyId) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
      company_id: companyId ?? null,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
  );
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      where: { username, active: true },
      include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const companyId = user.company_id ?? null;
    const token = buildToken(user, companyId);

    logger.info(`Login exitoso: ${username} (role: ${user.role}, company: ${companyId ?? 'global'})`);

    const userJson = user.toJSON();
    userJson.company_name = user.company?.name ?? null;

    res.json({ token, user: userJson });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const userJson = user.toJSON();
    userJson.company_name = user.company?.name ?? null;
    res.json({ user: userJson });
  } catch (error) {
    next(error);
  }
}

async function registerCompany(req, res, next) {
  const transaction = await sequelize.transaction();
  try {
    const {
      company_name,
      company_rif,
      company_email,
      company_phone,
      admin_full_name,
      admin_username,
      admin_password,
    } = req.body;

    // Validar duplicados de empresa
    const orConditions = [{ name: company_name }];
    if (company_rif) orConditions.push({ rif: company_rif });
    if (company_email) orConditions.push({ email: company_email });

    const { Op } = require('sequelize');
    const existingCompany = await Company.findOne({
      where: { [Op.or]: orConditions },
      transaction,
    });
    if (existingCompany) {
      await transaction.rollback();
      return res.status(409).json({ error: 'Ya existe una empresa con ese nombre, RIF o email' });
    }

    // Validar duplicado de usuario
    const existingUser = await User.findOne({ where: { username: admin_username }, transaction });
    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({ error: 'El nombre de usuario ya está en uso' });
    }

    // Crear empresa (transacción atómica)
    const company = await Company.create({
      name: company_name,
      rif: company_rif || null,
      email: company_email || null,
      phone: company_phone || null,
      active: true,
    }, { transaction });

    // Crear primer admin de la empresa
    const user = await User.create({
      username: admin_username,
      password: admin_password,
      full_name: admin_full_name,
      role: 'admin_empresa',
      company_id: company.id,
      active: true,
    }, { transaction });

    await transaction.commit();

    const token = buildToken(user, company.id);

    logger.info(`Empresa registrada: "${company.name}" (ID ${company.id}) — admin: ${admin_username}`);

    const userJson = user.toJSON();
    userJson.company_name = company.name;

    res.status(201).json({ token, user: userJson, company });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
}

module.exports = { login, me, registerCompany };
