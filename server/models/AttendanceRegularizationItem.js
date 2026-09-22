module.exports = (sequelize, DataTypes) => {
  const AttendanceRegularizationItem = sequelize.define(
    'attendance_regularization_items',
    {
      ari_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ar_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ari_type_code: {
        // PUNCH_IN | PUNCH_OUT | ON_DUTY
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      ari_punch_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ari_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'attendance_regularization_items',
      timestamps: false,
    }
  );

  return AttendanceRegularizationItem;
};