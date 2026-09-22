"use strict";

module.exports = (sequelize, DataTypes) => {
  const AttendanceRegularizationInserted = sequelize.define(
    "AttendanceRegularizationInserted",
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
        references: {
          model: "attendance_regularization",
          key: "ar_id",
        },
      },
      activity_log_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: "activity_log",
          key: "id",                 // ✅ activity_log PK is "id"
        },
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "attendance_regularization_inserted",
      timestamps: false,
      underscored: true,
      indexes: [
        { name: "idx_ari_ar_id", fields: ["ar_id"] },
        { name: "uq_ari_log",    unique: true, fields: ["activity_log_id"] },
      ],
    }
  );

  // ---------- Associations ----------
  AttendanceRegularizationInserted.associate = (models) => {
    AttendanceRegularizationInserted.belongsTo(models.AttendanceRegularization, {
      foreignKey: "ar_id",
      targetKey: "ar_id",
      as: "regularization",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    AttendanceRegularizationInserted.belongsTo(models.ActivityLog, {
      foreignKey: "activity_log_id",   // column in this table
      targetKey: "id",                 // ✅ PK column of activity_log
      as: "activityLog",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return AttendanceRegularizationInserted;
};