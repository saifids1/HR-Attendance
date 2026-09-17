module.exports = (sequelize, DataTypes) => {
  const Address = sequelize.define(
    "address",
    {
      ad_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pr_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ad_perment_address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ad_current_address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ad_is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      ad_created_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ad_created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ad_updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ad_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "address",
      timestamps: false,
      freezeTableName: true,
    }
  );
  return Address;
};