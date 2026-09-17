module.exports = (sequelize, DataTypes) => {
  const BankAccount = sequelize.define(
    "bank_accounts",
    {
      ba_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pr_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ba_account_holder_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ba_bank_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ba_account_number: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ba_ifsc_code: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ba_branch_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ba_is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      ba_created_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ba_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ba_account_type_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ba_created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ba_updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "bank_accounts",
      timestamps: false,
      freezeTableName: true,
    }
  );
  return BankAccount;
};