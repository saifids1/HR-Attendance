const sendEmail = require("../utils/mailer");

const BACKFILL_START_DATE =
  process.env.ATTENDANCE_BACKFILL_START_DATE || "2025-07-01";

async function generateDailyAttendance(client) {
  const query = `
WITH current_day AS
(
  SELECT
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE AS attendance_date
),

punch_data AS
(
  SELECT
    TRIM(al.emp_id) AS emp_id,
    al.punch_time AT TIME ZONE 'Asia/Kolkata' AS punch_local,
    al.created_at
  FROM public.attendance_logs al
  WHERE al.emp_id IS NOT NULL
    AND TRIM(al.emp_id) <> ''
    AND al.punch_time IS NOT NULL
    AND COALESCE(al.is_active, TRUE) = TRUE
),

punch_candidate_dates AS
(
  SELECT
    pd.emp_id,
    pd.punch_local,
    pd.created_at,
    pd.punch_local::DATE AS attendance_date
  FROM punch_data pd

  UNION ALL

  SELECT
    pd.emp_id,
    pd.punch_local,
    pd.created_at,
    (pd.punch_local::DATE - INTERVAL '1 day')::DATE AS attendance_date
  FROM punch_data pd
),

punch_shift_resolution AS
(
  SELECT
    pcd.emp_id,
    pcd.punch_local,
    pcd.created_at,
    pcd.attendance_date,

    o.pr_id,

    r.esr_roster_id,
    r.esr_shift_id,

    sm.sm_start_time,
    sm.sm_end_time,
    sm.sm_grace_in_minutes,
    sm.sm_grace_out_minutes,
    sm.sm_is_overnight

  FROM punch_candidate_dates pcd

  JOIN public.organizations o
    ON TRIM(o.or_emp_id) = pcd.emp_id
   AND COALESCE(o.or_is_active, TRUE) = TRUE

  JOIN LATERAL
  (
    SELECT
      r.*
    FROM public.employee_shift_roster r

    WHERE r.esr_pr_id = o.pr_id
      AND r.esr_isactive = TRUE
      AND r.esr_effective_from <= pcd.attendance_date
      AND
      (
        r.esr_effective_to IS NULL
        OR r.esr_effective_to >= pcd.attendance_date
      )

    ORDER BY
      r.esr_effective_from DESC,
      r.esr_roster_id DESC

    LIMIT 1
  ) r ON TRUE

  JOIN public.shift_master sm
    ON sm.sm_shift_id = r.esr_shift_id
   AND sm.sm_isactive = TRUE
),

valid_punch_assignments AS
(
  SELECT
    psr.emp_id,
    psr.attendance_date,
    psr.punch_local,
    psr.created_at

  FROM punch_shift_resolution psr

  WHERE
  (
    psr.sm_is_overnight = FALSE

    AND psr.punch_local BETWEEN
    (
      psr.attendance_date
      + psr.sm_start_time
      - MAKE_INTERVAL(
          mins => COALESCE(
            psr.sm_grace_in_minutes,
            0
          )
        )
    )
    AND
    (
      psr.attendance_date
      + psr.sm_end_time
      + MAKE_INTERVAL(
          mins => COALESCE(
            psr.sm_grace_out_minutes,
            0
          )
        )
    )
  )

  OR

  (
    psr.sm_is_overnight = TRUE

    AND psr.punch_local BETWEEN
    (
      psr.attendance_date
      + psr.sm_start_time
      - MAKE_INTERVAL(
          mins => COALESCE(
            psr.sm_grace_in_minutes,
            0
          )
        )
    )
    AND
    (
      psr.attendance_date
      + INTERVAL '1 day'
      + psr.sm_end_time
      + MAKE_INTERVAL(
          mins => COALESCE(
            psr.sm_grace_out_minutes,
            0
          )
        )
    )
  )
),

assigned_punches AS
(
  SELECT
    vpa.emp_id,
    vpa.attendance_date,
    vpa.punch_local,
    vpa.created_at,

    ROW_NUMBER() OVER
    (
      PARTITION BY
        vpa.emp_id,
        vpa.punch_local

      ORDER BY
        CASE
          WHEN vpa.attendance_date = vpa.punch_local::DATE
          THEN 0
          ELSE 1
        END
    ) AS assignment_priority

  FROM valid_punch_assignments vpa
),

final_assigned_punches AS
(
  SELECT
    emp_id,
    attendance_date,
    punch_local,
    created_at

  FROM assigned_punches

  WHERE assignment_priority = 1
),

stale_pairs AS
(
  SELECT DISTINCT
    fap.emp_id,
    fap.attendance_date

  FROM final_assigned_punches fap

  WHERE NOT EXISTS
  (
    SELECT 1
    FROM public.daily_attendance da
    WHERE da.emp_id = fap.emp_id
      AND da.attendance_date = fap.attendance_date
      AND da.updated_at >= fap.created_at
  )
),

today_pairs AS
(
  SELECT
    TRIM(o.or_emp_id) AS emp_id,
    cd.attendance_date

  FROM public.organizations o

  CROSS JOIN current_day cd

  WHERE o.or_emp_id IS NOT NULL
    AND TRIM(o.or_emp_id) <> ''
    AND COALESCE(o.or_is_active, TRUE) = TRUE

    AND
    (
      o.or_joining_date IS NULL
      OR o.or_joining_date <= cd.attendance_date
    )

    AND
    (
      o.or_leaving_date IS NULL
      OR o.or_leaving_date >= cd.attendance_date
    )
),

backfill_pairs AS
(
  SELECT
    TRIM(o.or_emp_id) AS emp_id,
    d.attendance_date

  FROM
  (
    SELECT
      generate_series(
        '${BACKFILL_START_DATE}'::DATE,
        (
          CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'
        )::DATE,
        INTERVAL '1 day'
      )::DATE AS attendance_date
  ) d

  CROSS JOIN public.organizations o

  WHERE o.or_emp_id IS NOT NULL
    AND TRIM(o.or_emp_id) <> ''
    AND COALESCE(o.or_is_active, TRUE) = TRUE

    AND
    (
      o.or_joining_date IS NULL
      OR o.or_joining_date <= d.attendance_date
    )

    AND
    (
      o.or_leaving_date IS NULL
      OR o.or_leaving_date >= d.attendance_date
    )

    AND NOT EXISTS
    (
      SELECT 1
      FROM public.daily_attendance da
      WHERE da.emp_id = TRIM(o.or_emp_id)
        AND da.attendance_date = d.attendance_date
    )
),

target_pairs AS
(
  SELECT
    emp_id,
    attendance_date
  FROM stale_pairs

  UNION

  SELECT
    emp_id,
    attendance_date
  FROM today_pairs

  UNION

  SELECT
    emp_id,
    attendance_date
  FROM backfill_pairs
),

distinct_target_dates AS
(
  SELECT DISTINCT
    attendance_date
  FROM target_pairs
),

prior_state AS
(
  SELECT
    da.emp_id,
    da.attendance_date,
    da.punch_in AS old_punch_in,
    da.punch_out AS old_punch_out

  FROM public.daily_attendance da

  JOIN target_pairs tp
    ON tp.emp_id = da.emp_id
   AND tp.attendance_date = da.attendance_date
),

employees AS
(
  SELECT DISTINCT
    tp.emp_id,
    tp.attendance_date,
    o.pr_id

  FROM target_pairs tp

  JOIN public.organizations o
    ON TRIM(o.or_emp_id) = tp.emp_id

  WHERE COALESCE(o.or_is_active, TRUE) = TRUE

    AND
    (
      o.or_joining_date IS NULL
      OR o.or_joining_date <= tp.attendance_date
    )

    AND
    (
      o.or_leaving_date IS NULL
      OR o.or_leaving_date >= tp.attendance_date
    )
),

employee_shift AS
(
  SELECT
    e.emp_id,
    e.attendance_date,
    e.pr_id,

    r.esr_roster_id,
    r.esr_shift_id,

    sm.sm_shift_code,
    sm.sm_shift_name,
    sm.sm_start_time,
    sm.sm_end_time,
    sm.sm_grace_in_minutes,
    sm.sm_grace_out_minutes,
    sm.sm_half_day_after_minutes,
    sm.sm_half_day_hours,
    sm.sm_expected_hours,
    sm.sm_early_go_minutes,
    sm.sm_is_overnight,

    smd.smd_attendance_status_id,
    smd.smd_day_of_week,
    smd.smd_day_name

  FROM employees e

  LEFT JOIN LATERAL
  (
    SELECT
      r.*
    FROM public.employee_shift_roster r

    WHERE r.esr_pr_id = e.pr_id
      AND r.esr_isactive = TRUE
      AND r.esr_effective_from <= e.attendance_date
      AND
      (
        r.esr_effective_to IS NULL
        OR r.esr_effective_to >= e.attendance_date
      )

    ORDER BY
      r.esr_effective_from DESC,
      r.esr_roster_id DESC

    LIMIT 1
  ) r ON TRUE

  LEFT JOIN public.shift_master sm
    ON sm.sm_shift_id = r.esr_shift_id
   AND sm.sm_isactive = TRUE

  LEFT JOIN public.shift_master_days smd
    ON smd.smd_shift_id = sm.sm_shift_id
   AND smd.smd_day_of_week =
       EXTRACT(
         DOW FROM e.attendance_date
       )::INTEGER
   AND smd.smd_isactive = TRUE
),

shift_rule AS
(
  SELECT
    es.*,

    es.attendance_date
    + es.sm_start_time
    AS expected_start,

    CASE
      WHEN es.sm_is_overnight = TRUE
      THEN
        es.attendance_date
        + INTERVAL '1 day'
        + es.sm_end_time

      ELSE
        es.attendance_date
        + es.sm_end_time
    END AS expected_end

  FROM employee_shift es
),

holiday_info AS
(
  SELECT
    d.attendance_date,

    h.holiday_id,
    h.holiday_name,
    h.is_paid,
    h.remarks

  FROM distinct_target_dates d

  LEFT JOIN LATERAL
  (
    SELECT
      h2.holiday_id,
      h2.holiday_name,
      h2.is_paid,
      h2.remarks

    FROM public.holidays h2

    WHERE h2.holiday_date = d.attendance_date
      AND COALESCE(h2.is_active, TRUE) = TRUE

    ORDER BY
      h2.holiday_id

    LIMIT 1
  ) h ON TRUE
),

statuses AS
(
  SELECT
    MAX(id) FILTER
    (
      WHERE LOWER(TRIM(status_name)) = 'present'
    ) AS present_id,

    MAX(id) FILTER
    (
      WHERE LOWER(TRIM(status_name)) = 'working'
    ) AS working_id,

    MAX(id) FILTER
    (
      WHERE LOWER(TRIM(status_name)) = 'half day'
    ) AS half_day_id,

    MAX(id) FILTER
    (
      WHERE LOWER(TRIM(status_name)) = 'holiday'
    ) AS holiday_id,

    MAX(id) FILTER
    (
      WHERE LOWER(TRIM(status_name)) = 'weekly off'
    ) AS weekly_off_id,

    MAX(id) FILTER
    (
      WHERE LOWER(TRIM(status_name)) = 'absent'
    ) AS absent_id,

    MAX(id) FILTER
    (
      WHERE LOWER(TRIM(status_name)) = 'leave'
    ) AS leave_id

  FROM public.attendence_status

  WHERE is_active = TRUE
),

punches AS
(
  SELECT
    sr.emp_id,
    sr.attendance_date,

    MIN(fap.punch_local) AS punch_in,

    CASE
      WHEN COUNT(fap.punch_local) <= 1
      THEN NULL

      ELSE
        MAX(fap.punch_local)
    END AS punch_out

  FROM shift_rule sr

  LEFT JOIN final_assigned_punches fap
    ON fap.emp_id = sr.emp_id
   AND fap.attendance_date = sr.attendance_date

  GROUP BY
    sr.emp_id,
    sr.attendance_date
),

leave_info AS
(
  SELECT
    e.emp_id,
    e.attendance_date,

    MAX(
      lr.lr_leave_request_id
    ) AS leave_request_id

  FROM employees e

  JOIN public.organizations o
    ON TRIM(o.or_emp_id) = e.emp_id

  JOIN public.leave_requests lr
    ON lr.lr_pr_id = o.pr_id

   AND e.attendance_date BETWEEN
       lr.lr_from_date
       AND
       lr.lr_to_date

   AND lr.lr_status_id = 2

  GROUP BY
    e.emp_id,
    e.attendance_date
),

calculated AS
(
  SELECT
    p.emp_id,
    p.attendance_date,

    p.punch_in,
    p.punch_out,

    (
      ps.old_punch_in IS NULL
      AND p.punch_in IS NOT NULL
    ) AS send_punch_in,

    (
      ps.old_punch_out IS NULL
      AND p.punch_out IS NOT NULL
    ) AS send_punch_out,

    CASE
      WHEN p.punch_in IS NULL
        THEN INTERVAL '0'

      WHEN p.punch_out IS NULL
        THEN INTERVAL '0'

      ELSE
        p.punch_out - p.punch_in
    END AS total_hours,

    CASE
      WHEN h.holiday_id IS NOT NULL
        THEN INTERVAL '0'

      WHEN sr.smd_attendance_status_id =
           sid.weekly_off_id
        THEN INTERVAL '0'

      WHEN sr.sm_expected_hours IS NULL
        THEN INTERVAL '0'

      ELSE
        sr.sm_expected_hours * INTERVAL '1 hour'
    END AS expected_hours,

    CASE
      WHEN p.punch_in IS NULL
        THEN 0

      WHEN h.holiday_id IS NOT NULL
        THEN 0

      WHEN li.leave_request_id IS NOT NULL
        THEN 0

      WHEN sr.smd_attendance_status_id =
           sid.weekly_off_id
        THEN 0

      WHEN sr.expected_start IS NULL
        THEN 0

      ELSE
        GREATEST(
          0,
          FLOOR(
            EXTRACT(
              EPOCH FROM
              (
                p.punch_in
                -
                sr.expected_start
              )
            ) / 60
          )::INTEGER
        )
    END AS late_arrival,

    CASE
      WHEN p.punch_in IS NULL
        THEN FALSE

      WHEN h.holiday_id IS NOT NULL
        THEN FALSE

      WHEN li.leave_request_id IS NOT NULL
        THEN FALSE

      WHEN sr.smd_attendance_status_id =
           sid.weekly_off_id
        THEN FALSE

      WHEN sr.expected_start IS NULL
        THEN FALSE

      WHEN p.punch_in >
           (
             sr.expected_start
             +
             MAKE_INTERVAL(
               mins => COALESCE(
                 sr.sm_grace_in_minutes,
                 0
               )
             )
           )
        THEN TRUE

      ELSE FALSE
    END AS is_late_arrived,

    CASE
      WHEN p.punch_out IS NULL
        THEN 0

      WHEN h.holiday_id IS NOT NULL
        THEN 0

      WHEN li.leave_request_id IS NOT NULL
        THEN 0

      WHEN sr.smd_attendance_status_id =
           sid.weekly_off_id
        THEN 0

      WHEN sr.expected_end IS NULL
        THEN 0

      WHEN p.punch_out >= sr.expected_end
        THEN 0

      ELSE
        GREATEST(
          0,
          FLOOR(
            EXTRACT(
              EPOCH FROM
              (
                sr.expected_end
                -
                p.punch_out
              )
            ) / 60
          )::INTEGER
        )
    END AS early_go,

    CASE
      WHEN p.punch_out IS NULL
        THEN FALSE

      WHEN h.holiday_id IS NOT NULL
        THEN FALSE

      WHEN li.leave_request_id IS NOT NULL
        THEN FALSE

      WHEN sr.smd_attendance_status_id =
           sid.weekly_off_id
        THEN FALSE

      WHEN sr.expected_end IS NULL
        THEN FALSE

      WHEN p.punch_out <
           (
             sr.expected_end
             -
             MAKE_INTERVAL(
               mins => COALESCE(
                 sr.sm_early_go_minutes,
                 0
               )
             )
           )
        THEN TRUE

      ELSE FALSE
    END AS is_early_gone,

    CASE
      WHEN h.holiday_id IS NOT NULL
        THEN sid.holiday_id

      WHEN li.leave_request_id IS NOT NULL
        THEN sid.leave_id

      WHEN sr.esr_shift_id IS NULL
        THEN sid.absent_id

      WHEN sr.smd_attendance_status_id =
           sid.weekly_off_id
        THEN sid.weekly_off_id

      WHEN sr.smd_attendance_status_id =
           sid.holiday_id
        THEN sid.holiday_id

      WHEN sr.smd_attendance_status_id =
           sid.leave_id
        THEN sid.leave_id

      WHEN p.punch_in IS NULL
        THEN sid.absent_id

      WHEN sr.sm_half_day_after_minutes IS NOT NULL
           AND sr.expected_start IS NOT NULL
           AND p.punch_in >=
           (
             sr.expected_start
             +
             MAKE_INTERVAL(
               mins => sr.sm_half_day_after_minutes
             )
           )
        THEN sid.half_day_id

      WHEN p.punch_out IS NULL
        THEN sid.working_id

      WHEN sr.sm_half_day_hours IS NOT NULL
           AND
           (
             EXTRACT(
               EPOCH FROM
               (
                 p.punch_out
                 -
                 p.punch_in
               )
             ) / 3600
           ) < sr.sm_half_day_hours
        THEN sid.half_day_id

      WHEN sr.sm_expected_hours IS NOT NULL
           AND
           (
             EXTRACT(
               EPOCH FROM
               (
                 p.punch_out
                 -
                 p.punch_in
               )
             ) / 3600
           ) >= sr.sm_expected_hours
        THEN sid.present_id

      ELSE sid.working_id
    END AS status_id

  FROM punches p

  LEFT JOIN shift_rule sr
    ON sr.emp_id = p.emp_id
   AND sr.attendance_date = p.attendance_date

  CROSS JOIN statuses sid

  LEFT JOIN holiday_info h
    ON h.attendance_date = p.attendance_date

  LEFT JOIN leave_info li
    ON li.emp_id = p.emp_id
   AND li.attendance_date = p.attendance_date

  LEFT JOIN prior_state ps
    ON ps.emp_id = p.emp_id
   AND ps.attendance_date = p.attendance_date
),

upserted AS
(
  INSERT INTO public.daily_attendance
  (
    attendance_date,
    punch_in,
    punch_out,
    total_hours,
    expected_hours,
    created_at,
    updated_at,
    emp_id,
    late_arrival,
    is_late_arrived,
    early_go,
    is_early_gone,
    status_id,
    is_regularized,
    regularization_id,
    regularized_at,
    regularized_by
  )

  SELECT
    attendance_date,
    punch_in,
    punch_out,
    total_hours,
    expected_hours,

    CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata',
    CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata',

    emp_id,
    late_arrival,
    is_late_arrived,
    early_go,
    is_early_gone,
    status_id,

    FALSE,
    NULL,
    NULL,
    NULL

  FROM calculated

  ON CONFLICT
  (
    emp_id,
    attendance_date
  )

  DO UPDATE SET
    punch_in = EXCLUDED.punch_in,
    punch_out = EXCLUDED.punch_out,
    total_hours = EXCLUDED.total_hours,
    expected_hours = EXCLUDED.expected_hours,
    late_arrival = EXCLUDED.late_arrival,
    is_late_arrived = EXCLUDED.is_late_arrived,
    early_go = EXCLUDED.early_go,
    is_early_gone = EXCLUDED.is_early_gone,
    status_id = EXCLUDED.status_id,
    updated_at =
      CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'

  WHERE daily_attendance.is_regularized = FALSE

  RETURNING *
)

SELECT
  u.emp_id,

  TRIM(
    COALESCE(
      p.pr_first_name,
      ''
    )
    ||
    ' '
    ||
    COALESCE(
      p.pr_last_name,
      ''
    )
  ) AS emp_name,

  o.or_official_email AS emp_email,

  TO_CHAR(
    u.attendance_date,
    'DD Mon YYYY'
  ) AS date_text,

  TO_CHAR(
    u.attendance_date,
    'FMDay'
  ) AS day_text,

  TO_CHAR(
    u.punch_in,
    'HH12:MI AM'
  ) AS punch_in_text,

  TO_CHAR(
    u.punch_out,
    'HH12:MI AM'
  ) AS punch_out_text,

  CASE
    WHEN u.punch_out IS NOT NULL
    THEN
      FLOOR(
        EXTRACT(
          EPOCH FROM u.total_hours
        ) / 3600
      )::INT
      ||
      'h '
      ||
      FLOOR(
        MOD(
          EXTRACT(
            EPOCH FROM u.total_hours
          )::INT,
          3600
        ) / 60
      )::INT
      ||
      'm'
  END AS duration_text,

  (
    os.old_punch_in IS NULL
    AND u.punch_in IS NOT NULL
  ) AS send_punch_in,

  (
    os.old_punch_out IS NULL
    AND u.punch_out IS NOT NULL
  ) AS send_punch_out

FROM upserted u

JOIN public.organizations o
  ON TRIM(o.or_emp_id) = u.emp_id

JOIN public.personal p
  ON p.pr_id = o.pr_id

LEFT JOIN prior_state os
  ON os.emp_id = u.emp_id
 AND os.attendance_date = u.attendance_date

WHERE
  (
    os.old_punch_in IS NULL
    AND u.punch_in IS NOT NULL
  )

  OR

  (
    os.old_punch_out IS NULL
    AND u.punch_out IS NOT NULL
  );
`;

  const result = await client.query(query);

  for (const row of result.rows) {
    if (!row.emp_email) {
      continue;
    }

    if (row.send_punch_in) {
    }

    if (row.send_punch_out) {
    }
  }

  return {
    touched: result.rowCount,
  };
}

module.exports = {
  generateDailyAttendance,
};