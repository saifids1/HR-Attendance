module.exports = (sequelize, DataTypes) => {
  const CompaniesMaster = sequelize.define(
    'companies_master',
    {
      cpt_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      cpt_name: { type: DataTypes.STRING(255), allowNull: false },
      cpt_email: { type: DataTypes.STRING(255), allowNull: true, validate: { isEmail: true } },
      cpt_contact_number: { type: DataTypes.STRING(20), allowNull: true },
      cpt_website: { type: DataTypes.STRING(255), allowNull: true },
      cpt_logopath: { type: DataTypes.STRING(255), allowNull: true },
      cpt_city_id: { type: DataTypes.INTEGER, allowNull: true },
      cpt_state_id: { type: DataTypes.INTEGER, allowNull: true },
      cpt_country_id: { type: DataTypes.INTEGER, allowNull: true },
      cpt_is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      cpt_created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      cpt_created_by: { type: DataTypes.INTEGER, allowNull: true },
      cpt_updated_at: { type: DataTypes.DATE, allowNull: true },
      cpt_updated_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'companies_master', timestamps: false }
  );
  return CompaniesMaster;
};