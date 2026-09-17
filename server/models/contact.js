module.exports = (sequelize, DataTypes) => {
  const Contact = sequelize.define(
    "contact",
    {
      ct_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pr_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ct_phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ct_email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ct_relation: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ct_is_primary: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      ct_created_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ct_contact_type_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ct_created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ct_updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ct_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "contact",
      timestamps: false,
      freezeTableName: true,
    }
  );
  return Contact;
};