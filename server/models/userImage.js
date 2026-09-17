module.exports = (sequelize, DataTypes) => {
  const UserImage = sequelize.define(
    "user_image",
    {
      ui_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pr_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ui_imagepath: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ui_created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ui_updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ui_created_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ui_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "user_image",
      timestamps: false,
      freezeTableName: true,
    }
  );

  return UserImage;
};