module.exports = (sequelize, DataTypes) => {
  const DepartmentMaster = sequelize.define(
    "department_master",
    {
      DepartmentId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        field: "DepartmentId",
      },
      DepartmentName: {
        type: DataTypes.STRING(150),
        allowNull: false,
        field: "DepartmentName",
      },
      CreatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "CreatedBy",
      },
      CreatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "CreatedAt",
      },
      UpdatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "UpdatedBy",
      },
      UpdatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "UpdatedAt",
      },
      IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "IsActive",
      },
    },
    {
      tableName: "department_master",
      timestamps: false,
      freezeTableName: true,
    }
  );
  return DepartmentMaster;
};