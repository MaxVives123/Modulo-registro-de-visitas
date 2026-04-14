const { sequelize } = require('../config/database');
const defineUser = require('./User');
const defineVisit = require('./Visit');
const defineNotification = require('./Notification');
const defineCompany = require('./Company');

const User = defineUser(sequelize);
const Visit = defineVisit(sequelize);
const Notification = defineNotification(sequelize);
const Company = defineCompany(sequelize);

// Company <-> User (empleados de la empresa)
Company.hasMany(User, { foreignKey: 'company_id', as: 'users' });
User.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// User <-> Visit (visitas registradas por el usuario)
User.hasMany(Visit, { foreignKey: 'created_by', as: 'visits' });
Visit.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Company <-> Visit (visitas pertenecientes a la empresa)
Company.hasMany(Visit, { foreignKey: 'company_id', as: 'visits' });
Visit.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// User <-> Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = { sequelize, User, Visit, Notification, Company };
