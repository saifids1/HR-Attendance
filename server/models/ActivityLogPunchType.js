module.exports = (sequelize, DataTypes) => {
  const ActivityLogPunchType = sequelize.define(
    'activity_log_punch_types',
    {
      alpt_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      alpt_code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      alpt_name: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      alpt_is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'activity_log_punch_types',
      timestamps: false,
    }
  );

  return ActivityLogPunchType;
};