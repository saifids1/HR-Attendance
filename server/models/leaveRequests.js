module.exports = (sequelize, DataTypes) => {
  const LeaveRequests = sequelize.define(
    'leave_requests',
    {
      lr_leave_request_id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      lr_pr_id: { type: DataTypes.INTEGER, allowNull: false },
      request_id: { type: DataTypes.STRING(20), allowNull: true },
      lr_leave_type_id: { type: DataTypes.INTEGER, allowNull: false },
      lr_from_date: { type: DataTypes.DATEONLY, allowNull: false },
      lr_to_date: { type: DataTypes.DATEONLY, allowNull: false },
      lr_total_days: { type: DataTypes.INTEGER, allowNull: false },
      lr_reason: { type: DataTypes.TEXT, allowNull: true },
      lr_status_id: { type: DataTypes.INTEGER, allowNull: false },
      lr_ismailfromrequester: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      lr_ismailfromapprover: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      lr_applied_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      lr_approver_by: { type: DataTypes.INTEGER, allowNull: true },
      lr_approver_at: { type: DataTypes.DATE, allowNull: true },
      lr_approver_remark: { type: DataTypes.TEXT, allowNull: true },
      lr_cancelled_at: { type: DataTypes.DATE, allowNull: true },
      lr_cancellation_reason: { type: DataTypes.TEXT, allowNull: true },
      lr_created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      lr_updated_at: { type: DataTypes.DATE, allowNull: true },
      lr_created_by: { type: DataTypes.INTEGER, allowNull: true },
      lr_updated_by: { type: DataTypes.INTEGER, allowNull: true },
      lr_reporting_to: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'leave_requests', timestamps: false }
  );
  return LeaveRequests;
};