module.exports = (sequelize, DataTypes) => {
  const WeeklyAttendance = sequelize.define(
    "WeeklyAttendance",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      attendance_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      punch_in: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      punch_out: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      total_hours: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "00:00:00",
      },

      expected_hours: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "09:00:00",
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },

      emp_id: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      late_arrival: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      is_late_arrived: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },

      early_go: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      is_early_gone: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },

      status_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // Regularization protection
      is_regularized: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      regularization_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      regularized_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      regularized_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "weekly_attendance",
      timestamps: false,
    }
  );

  return WeeklyAttendance;
};