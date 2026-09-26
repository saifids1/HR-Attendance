module.exports = (sequelize, DataTypes) => {
  const AttendanceRegularizationItem =
    sequelize.define(
      "AttendanceRegularizationItem",
      {
        ari_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },

        ar_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },

        ari_type_code: {
          type: DataTypes.STRING(30),
          allowNull: false,
        },

        ari_punch_time: {
          type: DataTypes.STRING,
          allowNull: true,
        },

        ari_remarks: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        tableName: "attendance_regularization_items",
        timestamps: false,
        underscored: true,
      }
    );

  return AttendanceRegularizationItem;
};