module.exports = (sequelize, DataTypes) => {
  const ApprovalStatus = sequelize.define(
    'approval_statuses',
    {
      as_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      as_code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      as_name: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      as_is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'approval_statuses',
      timestamps: false,
    }
  );

  return ApprovalStatus;
};