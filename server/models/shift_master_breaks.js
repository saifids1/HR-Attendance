module.exports = (sequelize, DataTypes) => {
  const ShiftMasterBreaks = sequelize.define(
    "shift_master_breaks",
    {
      Smb_shift_break_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "smb_shift_break_id",
      },

      Smb_shift_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "smb_shift_id",
      },

      Smb_break_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "smb_break_name",
      },

      Smb_start_time: {
        type: DataTypes.TIME,
        allowNull: false,
        field: "smb_start_time",
      },

      Smb_end_time: {
        type: DataTypes.TIME,
        allowNull: false,
        field: "smb_end_time",
      },

      Smb_is_paid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "smb_is_paid",
      },

      Smb_CreatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "smb_createdby",
      },

      Smb_UpdatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "smb_updatedby",
      },

      Smb_IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "smb_isactive",
      },
    },
    {
      tableName: "shift_master_breaks",
      freezeTableName: true,
      timestamps: true,
      createdAt: "smb_createdat",
      updatedAt: "smb_updatedat",
    }
  );

  return ShiftMasterBreaks;
};

