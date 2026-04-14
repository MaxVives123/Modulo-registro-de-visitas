const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EvacuationNotification = sequelize.define('EvacuationNotification', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    event_id: {
      type: DataTypes.INTEGER, allowNull: false,
      references: { model: 'evacuation_events', key: 'id' },
      onDelete: 'CASCADE',
    },
    recipient_type: {
      type: DataTypes.STRING(20), allowNull: false,
      // 'employee' | 'visitor'
    },
    recipient_name: { type: DataTypes.STRING(100), allowNull: true },
    recipient_phone: { type: DataTypes.STRING(30), allowNull: true },
    channel: { type: DataTypes.STRING(20), allowNull: false },
    status: {
      type: DataTypes.STRING(20), defaultValue: 'pending', allowNull: false,
      // 'sent' | 'failed' | 'pending' | 'mock'
    },
    provider_response: { type: DataTypes.TEXT, allowNull: true },
    sent_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'evacuation_notifications',
    indexes: [
      { fields: ['event_id'] },
      { fields: ['status'] },
    ],
  });

  return EvacuationNotification;
};
