module.exports = (sequelize, DataTypes) => {
  const RegularizationType = sequelize.define(
<<<<<<< HEAD
    "RegularizationType",
=======
    'regularization_types',
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
    {
      rt_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
<<<<<<< HEAD
        allowNull: false,
      },

=======
      },
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      rt_code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      rt_name: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      rt_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
<<<<<<< HEAD

      rt_is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
=======
      rt_is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
        defaultValue: DataTypes.NOW,
      },
    },
    {
<<<<<<< HEAD
      tableName: "regularization_types",
=======
      tableName: 'regularization_types',
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
      timestamps: false,
    }
  );

  return RegularizationType;
};