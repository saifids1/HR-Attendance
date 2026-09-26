module.exports = (sequelize, DataTypes) => {
  const AttendanceRegularizationBackup = sequelize.define(
    "AttendanceRegularizationBackup",
    {
      arb_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      ar_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "attendance_regularization",
          key: "ar_id",
        },
      },
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      emp_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      attendance_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
<<<<<<< HEAD
<<<<<<< HEAD

      snapshot_json: {
        type: DataTypes.JSONB,
        allowNull: false,
      },

=======
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      snapshot_json: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
<<<<<<< HEAD
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      restored_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      restored_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "attendance_regularization_backup",
      timestamps: false,
      underscored: true,
      indexes: [
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 6aef60d (Change for Attendance Regulaization)
        {
          name: "idx_arb_ar_id",
          fields: ["ar_id"],
        },
        {
          name: "idx_arb_emp_date",
          fields: ["emp_id", "attendance_date"],
        },
        {
          name: "idx_arb_created",
          fields: [{ name: "created_at", order: "DESC" }],
        },
<<<<<<< HEAD
=======
        { name: "idx_arb_ar_id",    fields: ["ar_id"] },
        { name: "idx_arb_emp_date", fields: ["emp_id", "attendance_date"] },
        { name: "idx_arb_created",  fields: [{ name: "created_at", order: "DESC" }] },
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======
>>>>>>> 6aef60d (Change for Attendance Regulaization)
      ],
    }
  );

<<<<<<< HEAD
<<<<<<< HEAD
=======
  // ---------- Associations ----------
  AttendanceRegularizationBackup.associate = (models) => {
    AttendanceRegularizationBackup.belongsTo(models.AttendanceRegularization, {
      foreignKey: "ar_id",
      targetKey: "ar_id",
      as: "regularization",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======
>>>>>>> 6aef60d (Change for Attendance Regulaization)
  return AttendanceRegularizationBackup;
};