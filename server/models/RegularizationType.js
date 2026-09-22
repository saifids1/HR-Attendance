module.exports = (sequelize, DataTypes) => {
  const RegularizationType = sequelize.define(
    'regularization_types',
    {
      rt_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      rt_code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      rt_name: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      rt_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      rt_is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'regularization_types',
      timestamps: false,
    }
  );

  return RegularizationType;
};