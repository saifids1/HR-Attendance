module.exports = (sequelize, DataTypes) => {
  const DesignationMaster = sequelize.define(
    "designation_master",
    {
      designation_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      designation_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      IsHOD: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "IsHOD",
      },
    },
    {
      tableName: "designation_master",
      timestamps: false,
      freezeTableName: true,
    }
  );
  return DesignationMaster;
};  