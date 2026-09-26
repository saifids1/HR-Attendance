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

      ar_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "attendance_regularization",
          key: "ar_id",
        },
      },

      emp_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },

      attendance_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      snapshot_json: {
        type: DataTypes.JSONB,
        allowNull: false,
      },

      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      restored_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

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
      ],
    }
  );

  return AttendanceRegularizationBackup;
};