const { sequelize } = require('../config/database');
const defineUser = require('./User');
const defineVisit = require('./Visit');
const defineNotification = require('./Notification');
const defineCompany = require('./Company');
const defineEvacuationEvent = require('./EvacuationEvent');
const defineEvacuationNotification = require('./EvacuationNotification');

const User = defineUser(sequelize);
const Visit = defineVisit(sequelize);
const Notification = defineNotification(sequelize);
const Company = defineCompany(sequelize);
const EvacuationEvent = defineEvacuationEvent(sequelize);
const EvacuationNotification = defineEvacuationNotification(sequelize);

// Company <-> User
Company.hasMany(User, { foreignKey: 'company_id', as: 'users' });
User.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// User <-> Visit
User.hasMany(Visit, { foreignKey: 'created_by', as: 'visits' });
Visit.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Company <-> Visit
Company.hasMany(Visit, { foreignKey: 'company_id', as: 'visits' });
Visit.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// User <-> Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Company <-> EvacuationEvent
Company.hasMany(EvacuationEvent, { foreignKey: 'company_id', as: 'evacuations' });
EvacuationEvent.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
EvacuationEvent.belongsTo(User, { foreignKey: 'triggered_by', as: 'triggeredBy' });
EvacuationEvent.belongsTo(User, { foreignKey: 'closed_by', as: 'closedBy' });

// EvacuationEvent <-> EvacuationNotification
EvacuationEvent.hasMany(EvacuationNotification, { foreignKey: 'event_id', as: 'notifications' });
EvacuationNotification.belongsTo(EvacuationEvent, { foreignKey: 'event_id', as: 'event' });

module.exports = { sequelize, User, Visit, Notification, Company, EvacuationEvent, EvacuationNotification };
