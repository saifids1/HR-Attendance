module.exports = (sequelize, DataTypes) => {
  const HrSupportMessageRead = sequelize.define(
    "HrSupportMessageRead",
    {
      hsmr_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },

      hsmr_message_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },

      hsmr_user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },

      hsmr_read_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "hr_support_message_read",
      timestamps: false,
    }
  );

  return HrSupportMessageRead;
};