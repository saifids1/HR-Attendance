module.exports = (sequelize, DataTypes) => {
  const UserRoleRelation = sequelize.define(
    'user_role_relation',
    {
      rl_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      pr_id: { type: DataTypes.INTEGER, allowNull: true },
      rl_role_id: { type: DataTypes.INTEGER, allowNull: true },
      rl_created_by: { type: DataTypes.INTEGER, allowNull: true },
      rl_updated_by: { type: DataTypes.INTEGER, allowNull: true },
      rl_created_at: { type: DataTypes.DATE, allowNull: true },
      rl_updated_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'user_role_relation', timestamps: false }
  );
  return UserRoleRelation;
};