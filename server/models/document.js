module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define(
    "documents",
    {
      dc_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pr_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      dc_file_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      dc_file_path: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      dc_file_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      dc_created_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      dc_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      dc_document_number: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      dc_document_type_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      dc_created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      dc_updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "documents",
      timestamps: false,
      freezeTableName: true,
    }
  );
  return Document;
};