module.exports = (sequelize, DataTypes) => {

  const ActivityLog = sequelize.define(
    "ActivityLog",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      emp_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      punch_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      device_ip: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      device_sn: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },

      received_time: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      regularization_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },

    {
      tableName: "activity_log",
      timestamps: false,
    }
  );

  return ActivityLog;
};