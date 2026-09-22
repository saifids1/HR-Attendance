module.exports = (sequelize, DataTypes) => {
  const HrSupportMessage = sequelize.define(
    "HrSupportMessage",
    {
      hsm_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },

      hsm_request_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },

      hsm_sender_pr_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },

      hsm_sender_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },

      hsm_message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      hsm_created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      hsm_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "hr_support_message",
      timestamps: false,
    }
  );

  return HrSupportMessage;
};