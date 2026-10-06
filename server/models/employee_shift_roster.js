module.exports = (sequelize, DataTypes) => {
  const EmployeeShiftRoster = sequelize.define(
    "employee_shift_roster",
    {
      Esr_roster_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "esr_roster_id",
      },
      Esr_pr_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "esr_pr_id",
      },
      Esr_shift_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "esr_shift_id",
      },
      Esr_from_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "esr_effective_from",
      },
      Esr_to_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: "esr_effective_to",
      },
      Esr_assignment_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "MASTER",
        field: "esr_assignment_type",
      },
      Esr_CreatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "esr_createdby",
      },
      Esr_UpdatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "esr_updatedby",
      },
      Esr_IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "esr_isactive",
      },
    },
    {
      tableName: "employee_shift_roster",
      freezeTableName: true,
      timestamps: true,
      createdAt: "esr_createdat",
      updatedAt: "esr_updatedat",
    }
  );

  return EmployeeShiftRoster;
};
