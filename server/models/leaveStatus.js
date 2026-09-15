module.exports = (sequelize, DataTypes) => {
  const LeaveStatus = sequelize.define(
    'leave_status',
    {
      ls_leave_status_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      ls_leave_status_name: { type: DataTypes.STRING(100), allowNull: false },
      ls_is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      ls_created_at: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
      ls_updated_at: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
      ls_created_by: { type: DataTypes.INTEGER, allowNull: true },
      ls_updated_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'leave_status', timestamps: false }
  );
  return LeaveStatus;
};