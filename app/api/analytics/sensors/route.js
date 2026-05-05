import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { requireAuth } from '../../../lib/sessionAuth';

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '24h';
    
    let interval = '24 HOURS';
    if (range === '7d') interval = '7 DAYS';
    if (range === '30d') interval = '30 DAYS';

    const query = `
      SELECT 
        feed_key,
        DATE_TRUNC('hour', updated_at) AS time_bucket,
        ROUND(AVG(value_num)::numeric, 2) AS avg_value
      FROM metric_history
      WHERE feed_key IN ('sensor-temp', 'sensor-humid', 'sensor-light')
        AND value_num IS NOT NULL
        AND updated_at >= NOW() - INTERVAL '${interval}'
      GROUP BY feed_key, DATE_TRUNC('hour', updated_at)
      ORDER BY time_bucket ASC;
    `;

    const { rows } = await pool.query(query);

    // Collect unique timestamps
    const timeSet = new Set();
    rows.forEach(row => {
      timeSet.add(new Date(row.time_bucket).toISOString());
    });

    const sortedTimes = Array.from(timeSet).sort();
    const labels = sortedTimes.map(t => {
      const d = new Date(t);
      return d.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
    });

    // Map values
    const mapped = { 'sensor-temp': {}, 'sensor-humid': {}, 'sensor-light': {} };
    rows.forEach(row => {
      const ts = new Date(row.time_bucket).toISOString();
      if (mapped[row.feed_key]) {
        mapped[row.feed_key][ts] = parseFloat(row.avg_value);
      }
    });

    const datasets = {
      'sensor-temp': sortedTimes.map(t => mapped['sensor-temp'][t] ?? null),
      'sensor-humid': sortedTimes.map(t => mapped['sensor-humid'][t] ?? null),
      'sensor-light': sortedTimes.map(t => mapped['sensor-light'][t] ?? null),
    };

    return NextResponse.json({ success: true, data: { labels, datasets } });
  } catch (error) {
    console.error('Analytics Sensors Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
