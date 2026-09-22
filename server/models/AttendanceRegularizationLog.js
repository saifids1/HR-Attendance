module.exports = (sequelize, DataTypes) => {
  const AttendanceRegularizationLog = sequelize.define(
    'attendance_regularization_log',
    {
      arl_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ar_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      action_by: {
        // personal.pr_id of the actor
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      action_role: {
        // EMPLOYEE | MANAGER | HR_ADMIN
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      action: {
        // RAISED | APPROVED | REJECTED | CANCELLED | OVERRIDDEN
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      action_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'attendance_regularization_log',
      timestamps: false,
    }
  );

  return AttendanceRegularizationLog;
};