module.exports = (sequelize, DataTypes) => {
  const AttendanceLog = sequelize.define(
    "AttendanceLog",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      emp_id: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      punch_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      device_ip: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      device_sn: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },
      raw_log: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: "attendance_logs",
      timestamps: false,
    }
  );

  return AttendanceLog;
};