module.exports = (sequelize, DataTypes) => {
  const BranchMaster = sequelize.define(
    "BranchMaster",
    {
      branch_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      branch_company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      branch_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },

      branch_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },

      parent_branch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      is_current: {
        type: DataTypes.CHAR(1),
        allowNull: true,
        validate: {
          isIn: [["Y", "N"]],
        },
      },

      address_line_1: {
        type: DataTypes.STRING(250),
        allowNull: true,
      },

      address_line_2: {
        type: DataTypes.STRING(250),
        allowNull: true,
      },

      country_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      state_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      city_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      postal_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },

      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },

      center_of_radius: {
        type: DataTypes.DECIMAL(10, 2),
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

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "branch_master",
      timestamps: false,
      underscored: true,
    }
  );

  return BranchMaster;
};