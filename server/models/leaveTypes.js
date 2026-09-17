module.exports = (sequelize, DataTypes) => {
  const LeaveTypes = sequelize.define(
    'leave_types',
    {
      lt_leave_type_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      lt_leave_type_code: { type: DataTypes.STRING(20), allowNull: false },
      lt_leave_type_name: { type: DataTypes.STRING(100), allowNull: false },
      lt_total_days_per_year: { type: DataTypes.INTEGER, allowNull: false },
      lt_is_paid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      lt_from_date: { type: DataTypes.DATEONLY, allowNull: true },
      lt_to_date: { type: DataTypes.DATEONLY, allowNull: true },
      lt_emptype: { type: DataTypes.INTEGER, allowNull: false },
      lt_is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      lt_created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      lt_updated_at: { type: DataTypes.DATE, allowNull: true },
      lt_created_by: { type: DataTypes.INTEGER, allowNull: true },
      lt_updated_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'leave_types', timestamps: false }
  );
  return LeaveTypes;
};