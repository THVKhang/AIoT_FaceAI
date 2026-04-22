import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'yolohome',
  password: process.env.POSTGRES_PASSWORD || 'password',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '24h'; // '24h', '7d', '30d'
    
    let interval = '24 HOURS';
    if (range === '7d') interval = '7 DAYS';
    if (range === '30d') interval = '30 DAYS';

    const query = `
      SELECT 
        feed_key,
        DATE_TRUNC('hour', updated_at) AS time_bucket,
        AVG(value_num) AS avg_value
      FROM metric_history
      WHERE feed_key IN ('sensor-temp', 'sensor-humid', 'sensor-light')
        AND updated_at >= NOW() - INTERVAL '${interval}'
      GROUP BY feed_key, DATE_TRUNC('hour', updated_at)
      ORDER BY time_bucket ASC;
    `;

    const client = await pool.connect();
    const result = await client.query(query);
    client.release();

    // Format data for chart
    const data = {
      labels: [],
      datasets: {
        'sensor-temp': [],
        'sensor-humid': [],
        'sensor-light': []
      }
    };

    const timeSet = new Set();
    const rawData = result.rows;

    rawData.forEach(row => {
      const timeStr = new Date(row.time_bucket).toLocaleString('vi-VN', { 
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
      });
      timeSet.add(timeStr);
    });

    data.labels = Array.from(timeSet).sort();

    // Map values to labels
    const mapped = { 'sensor-temp': {}, 'sensor-humid': {}, 'sensor-light': {} };
    rawData.forEach(row => {
      const timeStr = new Date(row.time_bucket).toLocaleString('vi-VN', { 
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
      });
      mapped[row.feed_key][timeStr] = parseFloat(row.avg_value).toFixed(2);
    });

    data.labels.forEach(label => {
      data.datasets['sensor-temp'].push(mapped['sensor-temp'][label] || null);
      data.datasets['sensor-humid'].push(mapped['sensor-humid'][label] || null);
      data.datasets['sensor-light'].push(mapped['sensor-light'][label] || null);
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Lỗi truy vấn Analytics Sensors:', error);
    return NextResponse.json({ success: false, message: 'Lỗi Database' }, { status: 500 });
  }
}
