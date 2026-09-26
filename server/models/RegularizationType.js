module.exports = (sequelize, DataTypes) => {
  const RegularizationType = sequelize.define(
<<<<<<< HEAD
<<<<<<< HEAD
    "RegularizationType",
=======
    'regularization_types',
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======
    "RegularizationType",
>>>>>>> 6aef60d (Change for Attendance Regulaization)
    {
      rt_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
<<<<<<< HEAD
<<<<<<< HEAD
        allowNull: false,
      },

=======
      },
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======
        allowNull: false,
      },

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      rt_code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      rt_name: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      rt_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
<<<<<<< HEAD
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
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
      rt_is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      created_at: {
        type: DataTypes.DATE,
<<<<<<< HEAD
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======
        allowNull: false,
>>>>>>> 6aef60d (Change for Attendance Regulaization)
        defaultValue: DataTypes.NOW,
      },
    },
    {
<<<<<<< HEAD
<<<<<<< HEAD
      tableName: "regularization_types",
=======
      tableName: 'regularization_types',
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======
      tableName: "regularization_types",
>>>>>>> 6aef60d (Change for Attendance Regulaization)
      timestamps: false,
    }
  );

  return RegularizationType;
};