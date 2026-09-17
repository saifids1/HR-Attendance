module.exports = (sequelize, DataTypes) => {
  const HolidayTypeMaster = sequelize.define(
    "HolidayTypeMaster",
    {
      holiday_type_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: false,
        allowNull: false,
      },
      holiday_type_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
      remarks: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "holiday_type_master",
      timestamps: false,
    }
  );

  return HolidayTypeMaster;
};