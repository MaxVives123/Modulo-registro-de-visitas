const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EvacuationEvent = sequelize.define('EvacuationEvent', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    company_id: {
      type: DataTypes.INTEGER, allowNull: false,
      references: { model: 'companies', key: 'id' },
    },
    triggered_by: {
      type: DataTypes.INTEGER, allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    status: {
      type: DataTypes.STRING(20), defaultValue: 'active', allowNull: false,
      // 'active' | 'closed'
    },
    channel_used: {
      type: DataTypes.STRING(20), allowNull: false, defaultValue: 'mock',
      // 'sms' | 'whatsapp' | 'both' | 'mock'
    },
    message: { type: DataTypes.TEXT, allowNull: true },
    stats: { type: DataTypes.JSON, defaultValue: {} },
    triggered_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    closed_at: { type: DataTypes.DATE, allowNull: true },
    closed_by: {
      type: DataTypes.INTEGER, allowNull: true,
      references: { model: 'users', key: 'id' },
    },
  }, {
    tableName: 'evacuation_events',
    indexes: [
      { fields: ['company_id'] },
      { fields: ['status'] },
      { fields: ['triggered_at'] },
    ],
  });

  return EvacuationEvent;
};
