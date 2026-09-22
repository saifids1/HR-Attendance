module.exports = (sequelize, DataTypes) => {
  const AttendanceRegularization = sequelize.define(
<<<<<<< HEAD
    "AttendanceRegularization",
=======
    'attendance_regularization',
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
    {
      ar_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
<<<<<<< HEAD
        allowNull: false,
      },

      ar_pr_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

=======
      },
      ar_pr_id: {
        // employee's personal.pr_id
        type: DataTypes.INTEGER,
        allowNull: false,
      },
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      ar_attendance_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      ar_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
<<<<<<< HEAD

      ar_status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "PENDING_MANAGER",
      },

=======
      ar_status: {
        // PENDING_MANAGER | PENDING_HR | APPROVED | REJECTED | CANCELLED
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'PENDING_MANAGER',
      },

      // Manager's personal.pr_id
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      ar_manager_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      ar_manager_action_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      ar_manager_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

<<<<<<< HEAD
=======
      // HR's personal.pr_id
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      ar_hr_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      ar_hr_action_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      ar_hr_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      ar_company_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      ar_created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      ar_updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
<<<<<<< HEAD

      ar_created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

=======
      ar_created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      ar_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
<<<<<<< HEAD
      tableName: "attendance_regularization",
=======
      tableName: 'attendance_regularization',
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      timestamps: false,
    }
  );

  return AttendanceRegularization;
};