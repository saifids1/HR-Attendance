module.exports = (sequelize, DataTypes) => {
  const UsrRoleMaster = sequelize.define(
    'usr_role_master',
    {
      rm_role_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      rm_role_name: { type: DataTypes.STRING, allowNull: true },
      rm_created_by: { type: DataTypes.INTEGER, allowNull: true },
      rm_updated_by: { type: DataTypes.INTEGER, allowNull: true },
      rm_created_at: { type: DataTypes.DATE, allowNull: true },
      rm_updated_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'usr_role_master', timestamps: false }
  );
  return UsrRoleMaster;
};