module.exports = (sequelize, DataTypes) => {
  const HrSupportAttachment = sequelize.define(
    "HrSupportAttachment",
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

      hsa_message_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },

      hsa_file_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      hsa_file_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },

      hsa_file_extension: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      hsa_file_size: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },

      hsa_uploaded_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },

      hsa_created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      hsa_is_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "hr_support_attachment",
      timestamps: false,
    }
  );

  return HrSupportAttachment;
};