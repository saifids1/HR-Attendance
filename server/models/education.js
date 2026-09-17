module.exports = (sequelize, DataTypes) => {
  const Education = sequelize.define(
    "education",
    {
      ed_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pr_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ed_field_of_study: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ed_institution_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ed_university: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ed_percentage_or_grade: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ed_passing_year: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ed_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ed_degree_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ed_created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ed_updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ed_created_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "education",
      timestamps: false,
      freezeTableName: true,
    }
  );
  return Education;
};