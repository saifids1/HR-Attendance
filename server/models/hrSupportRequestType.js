module.exports = (sequelize, DataTypes) => {
  const HrSupportRequestType = sequelize.define(
    "HrSupportRequestType",
    {
      rst_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },

      rst_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      rst_is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      rst_created_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },

      rst_created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      rst_updated_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },

      rst_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "hr_support_request_type",
      timestamps: false,
    }
  );

  return HrSupportRequestType;
};