module.exports = (sequelize, DataTypes) => {
  const LeaveQuota = sequelize.define(
    'leave_quota',
    {
      lq_id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      lq_pr_id: { type: DataTypes.INTEGER, allowNull: false },
      lq_leave_type_id: { type: DataTypes.INTEGER, allowNull: false },
      lq_emptype: { type: DataTypes.INTEGER, allowNull: false },
      lq_leave_year: { type: DataTypes.INTEGER, allowNull: false },
      lq_allocated_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      lq_carry_forward_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      lq_used_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      lq_pending_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      lq_created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      lq_updated_at: { type: DataTypes.DATE, allowNull: true },
      lq_created_by: { type: DataTypes.INTEGER, allowNull: true },
      lq_updated_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'leave_quota', timestamps: false }
  );
  return LeaveQuota;
};