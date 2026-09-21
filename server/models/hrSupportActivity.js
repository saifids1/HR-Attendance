module.exports = (sequelize, DataTypes) => {
  const HrSupportActivity = sequelize.define(
    "HrSupportActivity",
    {
      hsa_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },

      hsa_request_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },

      hsa_activity_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      hsa_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      hsa_performed_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },

      hsa_created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "hr_support_activity",
      timestamps: false,
    }
  );

  return HrSupportActivity;
};