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

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      ar_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "attendance_regularization",
          key: "ar_id",
        },
      },
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      emp_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      attendance_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
<<<<<<< HEAD

      snapshot_json: {
        type: DataTypes.JSONB,
        allowNull: false,
      },

=======
      snapshot_json: {
        type: DataTypes.JSONB,          // ✅ PostgreSQL — use JSONB, not JSON
        allowNull: false,
      },
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      restored_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
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
=======
        { name: "idx_arb_ar_id",    fields: ["ar_id"] },
        { name: "idx_arb_emp_date", fields: ["emp_id", "attendance_date"] },
        { name: "idx_arb_created",  fields: [{ name: "created_at", order: "DESC" }] },
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      ],
    }
  );

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
  return AttendanceRegularizationBackup;
};