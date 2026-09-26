module.exports = (sequelize, DataTypes) => {
  const AttendanceRegularization = sequelize.define(
<<<<<<< HEAD
<<<<<<< HEAD
    "AttendanceRegularization",
=======
    'attendance_regularization',
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======
    "AttendanceRegularization",
>>>>>>> 6aef60d (Change for Attendance Regulaization)
    {
      ar_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
<<<<<<< HEAD
<<<<<<< HEAD
        allowNull: false,
      },

      ar_pr_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

=======
=======
        allowNull: false,
>>>>>>> 6aef60d (Change for Attendance Regulaization)
      },

      ar_pr_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
<<<<<<< HEAD
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      ar_attendance_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      ar_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
<<<<<<< HEAD
<<<<<<< HEAD

      ar_status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "PENDING_MANAGER",
      },

=======
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      ar_status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "PENDING_MANAGER",
      },

<<<<<<< HEAD
      // Manager's personal.pr_id
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======
>>>>>>> 6aef60d (Change for Attendance Regulaization)
      ar_manager_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      ar_manager_action_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      ar_manager_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

<<<<<<< HEAD
<<<<<<< HEAD
=======
      // HR's personal.pr_id
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======
>>>>>>> 6aef60d (Change for Attendance Regulaization)
      ar_hr_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      ar_hr_action_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      ar_hr_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      ar_company_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      ar_created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      ar_updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
<<<<<<< HEAD
<<<<<<< HEAD

      ar_created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

=======
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      ar_created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
<<<<<<< HEAD
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      ar_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
<<<<<<< HEAD
<<<<<<< HEAD
      tableName: "attendance_regularization",
=======
      tableName: 'attendance_regularization',
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======
      tableName: "attendance_regularization",
>>>>>>> 6aef60d (Change for Attendance Regulaization)
      timestamps: false,
    }
  );

  return AttendanceRegularization;
};