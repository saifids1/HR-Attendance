module.exports = (sequelize, DataTypes) => {
  const ActivityLogMobile = sequelize.define(
    "ActivityLogMobile",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      emp_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      from_user_emp_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      punch_time: {
        type: DataTypes.STRING(19),
        allowNull: true,
      },
      device_ip: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      device_sn: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      punch_type: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      image_file_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },
      received_time: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
    },
    {
      tableName: "activity_log_mobile",
      timestamps: false,
      underscored: true,
    }
  );

  return ActivityLogMobile;
};