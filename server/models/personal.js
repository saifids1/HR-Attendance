module.exports = (sequelize, DataTypes) => {
  const Personal = sequelize.define(
    'personal',
    {
      pr_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      pr_email: { type: DataTypes.STRING, allowNull: true, validate: { isEmail: true } },
      pr_first_name: { type: DataTypes.STRING, allowNull: true },
      pr_last_name: { type: DataTypes.STRING, allowNull: true },
      pr_dob: { type: DataTypes.DATEONLY, allowNull: true },
      pr_gender_id: { type: DataTypes.INTEGER, allowNull: true },
      pr_blood_group_id: { type: DataTypes.INTEGER, allowNull: true },
      pr_marital_status_id: { type: DataTypes.INTEGER, allowNull: true },
      pr_nationality_id: { type: DataTypes.INTEGER, allowNull: true },
      pr_profile_image: { type: DataTypes.TEXT, allowNull: true },
      pr_is_active: { type: DataTypes.BOOLEAN, allowNull: true },
      pr_created_at: { type: DataTypes.DATE, allowNull: true },
      pr_updated_at: { type: DataTypes.DATE, allowNull: true },
      pr_created_by: { type: DataTypes.INTEGER, allowNull: true },
      pr_updated_by: { type: DataTypes.INTEGER, allowNull: true },
      pr_contact: { type: DataTypes.STRING, allowNull: true },
    },
    { tableName: 'personal', timestamps: false }
  );
  return Personal;
};