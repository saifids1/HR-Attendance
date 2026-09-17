module.exports = (sequelize, DataTypes) => {
  const EmployeeEmail = sequelize.define(
    "EmployeeEmail",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      type: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
    },
    {
      tableName: "EmployeeEmail",
      freezeTableName: true, // prevents Sequelize pluralizing / lowercasing
      timestamps: false,
    }
  );

  return EmployeeEmail;
};