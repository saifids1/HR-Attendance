module.exports = (sequelize, DataTypes) => {
  const AttendanceRegularization = sequelize.define(
    "AttendanceRegularization",
    {
      ar_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      ar_pr_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      ar_attendance_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      ar_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      ar_status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "PENDING_MANAGER",
      },

      ar_manager_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      ar_manager_action_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      ar_manager_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      ar_hr_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      ar_hr_action_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      ar_hr_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      ar_company_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      ar_created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      ar_updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      ar_created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      ar_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "attendance_regularization",
      timestamps: false,
    }
  );

  return AttendanceRegularization;
};