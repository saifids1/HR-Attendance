module.exports = (sequelize, DataTypes) => {
  const Holiday = sequelize.define(
    "Holiday",
    {
      holiday_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      holiday_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      holiday_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      is_paid: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
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
      UpdatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      UpdatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      CreatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "holidays",
      timestamps: false,
    }
  );

  return Holiday;
};