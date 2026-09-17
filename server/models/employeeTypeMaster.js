module.exports = (sequelize, DataTypes) => {
  const EmployeeTypeMaster = sequelize.define(
    'employee_type_master',
    {
      employee_type_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      employee_type_name: { type: DataTypes.STRING(100), allowNull: false },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_by: { type: DataTypes.INTEGER, allowNull: true },
      updated_at: { type: DataTypes.DATE, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'employee_type_master', timestamps: false }
  );
  return EmployeeTypeMaster;
};