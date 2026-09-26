module.exports = (sequelize, DataTypes) => {
  const AttendanceRegularizationLog = sequelize.define(
<<<<<<< HEAD
<<<<<<< HEAD
    "AttendanceRegularizationLog",
=======
    'attendance_regularization_log',
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======
    "AttendanceRegularizationLog",
>>>>>>> 6aef60d (Change for Attendance Regulaization)
    {
      arl_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
<<<<<<< HEAD
<<<<<<< HEAD
        allowNull: false,
      },

=======
      },
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======
        allowNull: false,
      },

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      ar_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
<<<<<<< HEAD
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
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
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
<<<<<<< HEAD
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 6aef60d (Change for Attendance Regulaization)

      action_at: {
        type: DataTypes.DATE,
        allowNull: false,
<<<<<<< HEAD
=======
      action_at: {
        type: DataTypes.DATE,
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======
>>>>>>> 6aef60d (Change for Attendance Regulaization)
        defaultValue: DataTypes.NOW,
      },
    },
    {
<<<<<<< HEAD
<<<<<<< HEAD
      tableName: "attendance_regularization_log",
=======
      tableName: 'attendance_regularization_log',
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======
      tableName: "attendance_regularization_log",
>>>>>>> 6aef60d (Change for Attendance Regulaization)
      timestamps: false,
    }
  );

  return AttendanceRegularizationLog;
};