module.exports = (sequelize, DataTypes) => {
  const Experience = sequelize.define(
    "experience",
    {
      ex_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pr_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ex_company_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ex_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      ex_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      ex_total_years: {
        type: DataTypes.DECIMAL,
        allowNull: true,
      },
      ex_location: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ex_designation_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ex_created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ex_updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ex_created_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ex_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "experience",
      timestamps: false,
      freezeTableName: true,
    }
  );
  return Experience;
};