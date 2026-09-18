module.exports = (sequelize, DataTypes) => {
  const SalarySlips = sequelize.define(
    "SalarySlips",
    {
      salary_slip_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      employee_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      month: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 12,
        },
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 2000,
        },
      },
      salary_slip_no: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
      },
      payroll_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      salary_generated_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      is_published: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      published_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      published_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "salary_slips",
      timestamps: false,
    }
  );

  return SalarySlips;
};