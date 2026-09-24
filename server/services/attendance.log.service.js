async function syncActivityToAttendanceLogs(client) {
  
  const updateQuery = `
    UPDATE public.attendance_logs alog
    SET
      is_active = al.is_active,
      regularization_id = al.regularization_id
    FROM public.activity_log al
    WHERE alog.emp_id = al.emp_id
      AND alog.punch_time = (
        al.punch_time AT TIME ZONE 'Asia/Kolkata'
      )
      AND (
        alog.is_active IS DISTINCT FROM al.is_active
        OR alog.regularization_id IS DISTINCT FROM al.regularization_id
      );
  `;

  await client.query(updateQuery);

  
  const insertQuery = `
    INSERT INTO public.attendance_logs
    (
      emp_id,
      punch_time,
      device_ip,
      device_sn,
      created_at,
      raw_log,
      is_active,
      regularization_id
    )
    SELECT
      TRIM(al.emp_id),

     
      al.punch_time AT TIME ZONE 'Asia/Kolkata',

      al.device_ip,
      al.device_sn,

      
      CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata',

      jsonb_build_object(
        'source',
          'activity_log',

        'activity_log_id',
          al.id,

        'emp_id',
          al.emp_id,

        'punch_time',
          al.punch_time,

        'device_ip',
          al.device_ip,

        'device_sn',
          al.device_sn,

        'is_active',
          al.is_active,

        'regularization_id',
          al.regularization_id
      ),

      al.is_active,
      al.regularization_id

    FROM public.activity_log al

    WHERE al.emp_id IS NOT NULL
      AND TRIM(al.emp_id) <> ''
      AND al.punch_time IS NOT NULL

    ON CONFLICT (emp_id, punch_time)
    DO NOTHING;
  `;

  const result = await client.query(insertQuery);

  return {
    updated: 0,
    inserted: result.rowCount || 0,
  };
}

module.exports = {
  syncActivityToAttendanceLogs,
};