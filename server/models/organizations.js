module.exports = (sequelize, DataTypes) => {
  const Organizations = sequelize.define(
    'organizations',
    {
      or_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      pr_id: { type: DataTypes.INTEGER, allowNull: true },
      or_organization_name: { type: DataTypes.STRING, allowNull: true },
      or_organization_location: { type: DataTypes.TEXT, allowNull: true },
      or_emp_id: { type: DataTypes.STRING, allowNull: true },
      or_is_active: { type: DataTypes.BOOLEAN, allowNull: true },
      or_created_at: { type: DataTypes.DATE, allowNull: true },
      or_updated_at: { type: DataTypes.DATE, allowNull: true },
      or_employee_type_id: { type: DataTypes.INTEGER, allowNull: true },
      or_reporting_location_id: { type: DataTypes.INTEGER, allowNull: true },
      or_organization_email: { type: DataTypes.STRING, allowNull: true },
      or_reporting_to_id: { type: DataTypes.INTEGER, allowNull: true },
      or_department_id: { type: DataTypes.INTEGER, allowNull: true },
      or_designation_id: { type: DataTypes.INTEGER, allowNull: true },
      or_joining_date: { type: DataTypes.DATEONLY, allowNull: true },
      or_leaving_date: { type: DataTypes.DATEONLY, allowNull: true },
      or_created_by: { type: DataTypes.INTEGER, allowNull: true },
      or_updated_by: { type: DataTypes.INTEGER, allowNull: true },
      or_official_email: { type: DataTypes.STRING, allowNull: true },
      or_official_contact: { type: DataTypes.STRING, allowNull: true },
      or_company_id: { type: DataTypes.INTEGER, allowNull: true },
      or_vendor_id: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'organizations', timestamps: false }
  );
  return Organizations;
};