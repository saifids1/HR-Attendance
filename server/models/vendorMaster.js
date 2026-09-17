module.exports = (sequelize, DataTypes) => {
  const VendorMaster = sequelize.define(
    "vendor_master",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      vendor_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      vendor_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      vendor_email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      vendor_number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "vendor_master",
      timestamps: false,
      freezeTableName: true,
    }
  );
  return VendorMaster;
};