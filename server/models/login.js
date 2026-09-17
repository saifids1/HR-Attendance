module.exports = (sequelize, DataTypes) => {
  const Login = sequelize.define(
    "login",
    {
      lg_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pr_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      lg_password: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      lg_created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      lg_updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      lg_created_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lg_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "login",
      timestamps: false,
      freezeTableName: true,
    }
  );

  return Login;
};