module.exports = (sequelize, DataTypes) => {
  const ShiftMaster = sequelize.define(
    "shift_master",
    {
      Sm_shift_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "sm_shift_id",
      },

      Sm_shift_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: "sm_shift_code",
      },

      Sm_shift_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "sm_shift_name",
      },

      Sm_start_time: {
        type: DataTypes.TIME,
        allowNull: false,
        field: "sm_start_time",
      },

      Sm_end_time: {
        type: DataTypes.TIME,
        allowNull: false,
        field: "sm_end_time",
      },

      Sm_expected_hours: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 8.00,
        validate: {
          min: 0,
        },
        field: "sm_expected_hours",
      },

      Sm_half_day_hours: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 5.00,
        validate: {
          min: 0,
        },
        field: "sm_half_day_hours",
      },

      Sm_grace_in_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
        field: "sm_grace_in_minutes",
      },

      Sm_grace_out_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
        field: "sm_grace_out_minutes",
      },

      Sm_half_day_after_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
        },
        field: "sm_half_day_after_minutes",
      },

      Sm_early_go_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
        },
        field: "sm_early_go_minutes",
      },

      Sm_is_overnight: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "sm_is_overnight",
      },

      Sm_CreatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "sm_createdby",
      },

      Sm_UpdatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "sm_updatedby",
      },

      Sm_IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "sm_isactive",
      },
    },
    {
      tableName: "shift_master",
      freezeTableName: true,
      timestamps: true,
      createdAt: "sm_createdat",
      updatedAt: "sm_updatedat",
    }
  );

  return ShiftMaster;
};