module.exports = (sequelize, DataTypes) => {
  const DailyAttendance = sequelize.define(
    "DailyAttendance",
    {
      id: {
        type: DataTypes.INTEGER,
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
      // ⚠️ Postgres INTERVAL — use STRING in Sequelize
      total_hours: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "00:00:00",
      },
      // ⚠️ Postgres INTERVAL — use STRING in Sequelize
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
      late_arrival: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "daily_attendance",
      timestamps: false,
    }
  );

  return DailyAttendance;
};