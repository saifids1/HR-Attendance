module.exports = (sequelize, DataTypes) => {
  const AttendanceRegularizationLog = sequelize.define(
    "AttendanceRegularizationLog",
    {
      arl_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      ar_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      action_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      action_role: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },

      action: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },

      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      action_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "attendance_regularization_log",
      timestamps: false,
    }
  );

  return AttendanceRegularizationLog;
};