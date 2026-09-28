module.exports = (sequelize, DataTypes) => {
  const AttendanceRegularizationLog = sequelize.define(
    "attendance_regularization_log",
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
        references: {
          model: "attendance_regularization",
          key: "ar_id",
        },
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
        // RAISED | APPROVED | REJECTED | CANCELLED | REVERTED
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