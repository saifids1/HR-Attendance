module.exports = (sequelize, DataTypes) => {
  const SalarySlipFiles = sequelize.define(
    "SalarySlipFiles",
    {
      salary_slip_file_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      salary_slip_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      file_path: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      file_size: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
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
      tableName: "salary_slip_files",
      timestamps: false,
    }
  );

  return SalarySlipFiles;
};