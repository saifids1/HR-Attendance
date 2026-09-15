module.exports = (sequelize, DataTypes) => {
  const Nominee = sequelize.define(
    "nominee",
    {
      nm_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pr_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      nm_nominee_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      nm_nominee_relation: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      nm_nominee_contact: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      nm_nominee_percentage: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      nm_created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      nm_updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      nm_created_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      nm_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "nominee",
      timestamps: false,
      freezeTableName: true,
    }
  );
  return Nominee;
};