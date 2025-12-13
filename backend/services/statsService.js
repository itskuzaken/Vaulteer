const { getPool } = require('../db/pool');

/**
 * Returns participation statistics based on hts_forms submissions
 * - today, yesterday, last7, last30 counts
 * - breakdown by test_result for today
 * - daily trend for last 7 days
 */
async function getParticipationStats() {
  const pool = getPool();

  // Use DATE boundaries to keep time zone effects minimal (server-local)
  const sql = {
    today: `SELECT COUNT(*) as count FROM hts_forms WHERE DATE(created_at) = CURDATE()`,
    yesterday: `SELECT COUNT(*) as count FROM hts_forms WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`,
    last7: `SELECT COUNT(*) as count FROM hts_forms WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`,
    last30: `SELECT COUNT(*) as count FROM hts_forms WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)`,
    todayByResult: `SELECT IFNULL(test_result, 'unknown') as test_result, COUNT(*) as count FROM hts_forms WHERE DATE(created_at) = CURDATE() GROUP BY test_result`,
    last7Trend: `SELECT DATE(created_at) as date, COUNT(*) as count FROM hts_forms WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(created_at) ORDER BY DATE(created_at)`,
  };

  try {
    const [todayRows] = await pool.query(sql.today);
    const [yesterdayRows] = await pool.query(sql.yesterday);
    const [last7Rows] = await pool.query(sql.last7);
    const [last30Rows] = await pool.query(sql.last30);
    const [byResultRows] = await pool.query(sql.todayByResult);
    const [trendRows] = await pool.query(sql.last7Trend);

    const breakdown = {};
    byResultRows.forEach((r) => {
      breakdown[r.test_result] = r.count;
    });

    // Build a completed trend array for the last 7 days (date ordered)
    const trendMap = new Map();
    trendRows.forEach((r) => {
      let dKey;
      try {
        dKey = (r.date instanceof Date ? r.date : new Date(r.date)).toISOString().slice(0,10);
      } catch (e) {
        dKey = String(r.date).slice(0,10);
      }
      trendMap.set(dKey, r.count);
    });

    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const dateKey = dt.toISOString().slice(0,10);
      trend.push({ date: dateKey, count: trendMap.get(dateKey) || 0 });
    }

    return {
      today: todayRows[0]?.count || 0,
      yesterday: yesterdayRows[0]?.count || 0,
      last7: last7Rows[0]?.count || 0,
      last30: last30Rows[0]?.count || 0,
      today_by_result: breakdown,
      trend_last7: trend,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('statsService.getParticipationStats error:', err);
    throw err;
  }
}

module.exports = {
  getParticipationStats,
};
const { getPool } = require('../db/pool');
const { DateTime } = require('luxon');

/**
 * Compute date ranges for standard periods
 */
function computeRange(period) {
  const now = DateTime.utc().startOf('day');
  switch (period) {
    case 'yesterday': {
      const end = now;
      const start = now.minus({ days: 1 });
      return { start: start.toISO(), end: end.toISO() };
    }
    case 'last7': {
      const end = now;
      const start = now.minus({ days: 7 });
      return { start: start.toISO(), end: end.toISO() };
    }
    case 'last30': {
      const end = now;
      const start = now.minus({ days: 30 });
      return { start: start.toISO(), end: end.toISO() };
    }
    default:
      throw new Error(`Unsupported period: ${period}`);
  }
}

async function getStatsForRange(pool, startTs, endTs, eventTypes = []) {
  const whereClauses = ['ep.registration_date >= ?', 'ep.registration_date < ?'];
  const params = [startTs, endTs];
  if (eventTypes.length) {
    whereClauses.push(`e.event_type IN (${eventTypes.map(() => '?').join(',')})`);
    params.push(...eventTypes);
  }

  const sql = `
    SELECT
      SUM(CASE WHEN ep.status = 'registered' THEN 1 ELSE 0 END) as registered,
      SUM(CASE WHEN ep.status = 'waitlisted' THEN 1 ELSE 0 END) as waitlisted,
      SUM(CASE WHEN ep.status = 'attended' THEN 1 ELSE 0 END) as attended,
      SUM(CASE WHEN ep.cancellation_date IS NOT NULL THEN 1 ELSE 0 END) as cancelled,
      COUNT(*) as total
    FROM event_participants ep
    JOIN events e ON ep.event_id = e.event_id
    WHERE ${whereClauses.join(' AND ')}
  `;

  const [rows] = await pool.query(sql, params);
  const r = rows[0] || {};
  return {
    registered: Number(r.registered) || 0,
    waitlisted: Number(r.waitlisted) || 0,
    attended: Number(r.attended) || 0,
    cancelled: Number(r.cancelled) || 0,
    total: Number(r.total) || 0,
  };
}

/**
 * Returns participation stats for requested periods with previous period comparison
 */
async function getParticipationStats({ periods = ['yesterday', 'last7', 'last30'], eventTypes = [] } = {}) {
  const pool = getPool();
  const results = {};

  for (const period of periods) {
    const { start, end } = computeRange(period);
    const current = await getStatsForRange(pool, start, end, eventTypes);

    // compute previous-period (elastic previous span)
    const startDt = DateTime.fromISO(start, { zone: 'utc' }).startOf('day');
    const endDt = DateTime.fromISO(end, { zone: 'utc' }).startOf('day');
    const spanDays = Math.round(endDt.diff(startDt, 'days').days) || 1;
    const prevStart = startDt.minus({ days: spanDays });
    const prevEnd = startDt;
    const previous = await getStatsForRange(pool, prevStart.toISO(), prevEnd.toISO(), eventTypes);

    // percent change helper
    const delta = (curr, prev) => {
      if (prev === 0) return null;
      return Number(((curr - prev) / prev) * 100).toFixed(1);
    };

    results[period] = {
      current,
      previous,
      deltas: {
        total: delta(current.total, previous.total),
        registered: delta(current.registered, previous.registered),
        attended: delta(current.attended, previous.attended),
        waitlisted: delta(current.waitlisted, previous.waitlisted),
        cancelled: delta(current.cancelled, previous.cancelled),
      },
    };
  }

  // Distribution by event_type for the last 30 days (or largest period requested)
  const periodForDistribution = periods.includes('last30') ? 'last30' : periods[periods.length - 1];
  const distRange = computeRange(periodForDistribution);
  const distParams = [distRange.start, distRange.end, ...eventTypes];
  const distWhere = [`ep.registration_date >= ?`, `ep.registration_date < ?`].concat(eventTypes.length ? [`e.event_type IN (${eventTypes.map(() => '?').join(',')})`] : []);
  const distSql = `
    SELECT e.event_type as event_type, COUNT(*) as count
    FROM event_participants ep
    JOIN events e ON ep.event_id = e.event_id
    WHERE ${distWhere.join(' AND ')}
    GROUP BY e.event_type
  `;
  const [distRows] = await pool.query(distSql, distParams);
  const total = distRows.reduce((acc, r) => acc + Number(r.count || 0), 0);
  const distribution = distRows.map((r) => ({ event_type: r.event_type, count: Number(r.count || 0), pct: total ? Number(((r.count / total) * 100).toFixed(1)) : 0 }));

  return { periods: results, distribution };
}

module.exports = { getParticipationStats };
