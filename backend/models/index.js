const { sequelize } = require('../config/database');
const defineUser = require('./User');
const defineVisit = require('./Visit');

const User = defineUser(sequelize);
const Visit = defineVisit(sequelize);

User.hasMany(Visit, { foreignKey: 'created_by', as: 'visits' });
Visit.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

module.exports = { sequelize, User, Visit };
