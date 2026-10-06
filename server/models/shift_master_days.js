module.exports = (sequelize, DataTypes) => {
  const ShiftMasterDays = sequelize.define(
    "shift_master_days",
    {
      Smd_shift_day_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "smd_shift_day_id",
      },

      Smd_shift_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "smd_shift_id",
      },

      Smd_day_of_week: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        validate: {
          min: 0,
          max: 6,
        },
        field: "smd_day_of_week",
      },

      Smd_day_name: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: "smd_day_name",
      },

      Smd_attendance_status_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "smd_attendance_status_id",
      },

      Smd_CreatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "smd_createdby",
      },

      Smd_UpdatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "smd_updatedby",
      },

      Smd_IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "smd_isactive",
      },
    },
    {
      tableName: "shift_master_days",
      freezeTableName: true,

      timestamps: true,

      createdAt: "smd_createdat",
      updatedAt: "smd_updatedat",

      indexes: [
        {
          unique: true,
          fields: ["smd_shift_id", "smd_day_of_week"],
        },
      ],
    }
  );

  return ShiftMasterDays;
};