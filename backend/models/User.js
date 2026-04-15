const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

// Catálogos exportados para validaciones y frontend
const JOB_LEVELS = ['alta_direccion', 'mandos_intermedios', 'tecnico_administrativo', 'operario_base'];
const DEPARTMENTS = [
  'direccion_gerencia', 'rrhh', 'informatica', 'administracion_finanzas',
  'produccion_operaciones', 'logistica_almacen', 'marketing_publicidad',
  'ventas_comercial', 'atencion_cliente', 'tecnologia_it',
  'investigacion_desarrollo', 'mantenimiento',
];
const SITES = ['Barcelona', 'Madrid', 'Londres'];

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: {
      type: DataTypes.STRING(50), allowNull: false, unique: true,
      validate: { len: [3, 50] },
    },
    password: { type: DataTypes.STRING(255), allowNull: false },
    full_name: { type: DataTypes.STRING(100), allowNull: false },
    role: {
      type: DataTypes.ENUM('superadmin', 'admin', 'admin_empresa', 'user'),
      defaultValue: 'user', allowNull: false,
    },
    company_id: {
      type: DataTypes.INTEGER, allowNull: true,
      references: { model: 'companies', key: 'id' },
      onDelete: 'SET NULL', onUpdate: 'CASCADE',
    },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },

    // Información personal
    phone: { type: DataTypes.STRING(20), allowNull: true },
    email: { type: DataTypes.STRING(100), allowNull: true, validate: { isEmail: true } },

    // Cargo y ubicación
    job_level: { type: DataTypes.STRING(50), allowNull: true },
    job_title: { type: DataTypes.STRING(100), allowNull: true },
    department: { type: DataTypes.STRING(50), allowNull: true },
    site: { type: DataTypes.STRING(50), allowNull: true },
    building: { type: DataTypes.STRING(50), allowNull: true },

    // Permisos operativos
    can_receive_visits: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
    can_trigger_evacuation: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },

    // Presencia en planta (actualizable por integraciones de control de acceso)
    is_present: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
    last_access_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'users',
    indexes: [
      { fields: ['company_id'] },
      { fields: ['role'] },
      { fields: ['can_receive_visits'] },
      { fields: ['is_present'] },
    ],
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) user.password = await bcrypt.hash(user.password, 12);
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) user.password = await bcrypt.hash(user.password, 12);
      },
    },
  });

  User.prototype.validatePassword = async function (password) {
    return bcrypt.compare(password, this.password);
  };

  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  return User;
};

module.exports.JOB_LEVELS = JOB_LEVELS;
module.exports.DEPARTMENTS = DEPARTMENTS;
module.exports.SITES = SITES;
