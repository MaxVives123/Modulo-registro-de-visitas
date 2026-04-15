const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Visit = sequelize.define('Visit', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    visitor_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { len: [2, 100] },
    },
    visitor_document: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    visitor_company: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    visitor_email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: { isEmail: true },
    },
    visitor_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    destination: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    purpose: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    qr_code: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    check_in: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    check_out: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'checked_in', 'checked_out', 'cancelled'),
      defaultValue: 'pending',
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    signature: { type: DataTypes.TEXT, allowNull: true },
    vehicle_plate: { type: DataTypes.STRING(20), allowNull: true },
    site: { type: DataTypes.STRING(50), allowNull: true },
    building: { type: DataTypes.STRING(50), allowNull: true },
    host_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    host_email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: { isEmail: true },
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'companies',
        key: 'id',
      },
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  }, {
    tableName: 'visits',
    indexes: [
      { fields: ['status'] },
      { fields: ['check_in'] },
      { fields: ['qr_code'], unique: true },
      { fields: ['visitor_document'] },
      { fields: ['destination'] },
      { fields: ['vehicle_plate'] },
      { fields: ['site'] },
      { fields: ['building'] },
    ],
  });

  return Visit;
};
