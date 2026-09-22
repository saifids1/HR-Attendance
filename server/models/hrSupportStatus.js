module.exports = (sequelize, DataTypes) => {
  const HrSupportStatus = sequelize.define(
    "HrSupportStatus",
    {
      hss_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },

      hss_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      hss_is_closed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      hss_is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      hss_created_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },

      hss_created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      hss_updated_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },

      hss_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "hr_support_status",
      timestamps: false,
    }
  );

  return HrSupportStatus;
};