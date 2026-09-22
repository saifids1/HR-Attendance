module.exports = (sequelize, DataTypes) => {
  const HrSupportRequest = sequelize.define(
    "HrSupportRequest",
    {
      hsr_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },

      hsr_request_no: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },

      hsr_pr_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },

      hsr_request_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },

      hsr_subject: {
        type: DataTypes.STRING(250),
        allowNull: false,
      },

      hsr_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      hsr_status_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },

      hsr_assigned_to: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },

      hsr_created_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },

      hsr_created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      hsr_updated_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },

      hsr_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      hsr_last_activity_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      hsr_closed_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },

      hsr_closed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      hsr_is_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "hr_support_request",
      timestamps: false,
    }
  );

  return HrSupportRequest;
};