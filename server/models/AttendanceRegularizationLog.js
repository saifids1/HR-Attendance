module.exports = (sequelize, DataTypes) => {
  const AttendanceRegularizationLog = sequelize.define(
<<<<<<< HEAD
    "AttendanceRegularizationLog",
=======
    'attendance_regularization_log',
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
    {
      arl_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
<<<<<<< HEAD
        allowNull: false,
      },

=======
      },
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      ar_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
<<<<<<< HEAD

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

=======
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
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
<<<<<<< HEAD

      action_at: {
        type: DataTypes.DATE,
        allowNull: false,
=======
      action_at: {
        type: DataTypes.DATE,
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
        defaultValue: DataTypes.NOW,
      },
    },
    {
<<<<<<< HEAD
      tableName: "attendance_regularization_log",
=======
      tableName: 'attendance_regularization_log',
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      timestamps: false,
    }
  );

  return AttendanceRegularizationLog;
};