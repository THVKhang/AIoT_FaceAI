import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';
import { requireAuth } from '../../../lib/sessionAuth';

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    // 1. Access Logs Stats (Doughnut Chart)
    const accessRes = await pool.query(`
      SELECT result, COUNT(*) as total 
      FROM access_logs 
      WHERE created_at >= NOW() - INTERVAL '30 DAYS'
      GROUP BY result;
    `);
    
    let validCount = 0;
    let deniedCount = 0;
    accessRes.rows.forEach(row => {
      const r = (row.result || '').toLowerCase();
      if (r === 'success' || r === 'valid') validCount += parseInt(row.total);
      else deniedCount += parseInt(row.total);
    });

    // 2. Command Activity Stats (Bar Chart) — last 7 days
    const cmdRes = await pool.query(`
      SELECT 
        feed_key,
        DATE_TRUNC('day', created_at) AS time_bucket,
        COUNT(*) as total_cmds
      FROM commands
      WHERE created_at >= NOW() - INTERVAL '7 DAYS'
      GROUP BY feed_key, DATE_TRUNC('day', created_at)
      ORDER BY time_bucket ASC;
    `);

    // Collect unique dates
    const timeSet = new Set();
    cmdRes.rows.forEach(row => {
      timeSet.add(new Date(row.time_bucket).toISOString().split('T')[0]);
    });
    const sortedDays = Array.from(timeSet).sort();
    const labels = sortedDays.map(d => {
      const dt = new Date(d);
      return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    });

    // Map all feed_keys dynamically
    const feedKeys = ['button-door', 'button-light', 'fan'];
    const mapped = {};
    feedKeys.forEach(k => { mapped[k] = {}; });
    
    cmdRes.rows.forEach(row => {
      const dayKey = new Date(row.time_bucket).toISOString().split('T')[0];
      const fk = row.feed_key;
      if (mapped[fk]) {
        mapped[fk][dayKey] = parseInt(row.total_cmds);
      }
    });

    const datasets = {};
    feedKeys.forEach(k => {
      datasets[k] = sortedDays.map(d => mapped[k][d] || 0);
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        faceStats: { Valid: validCount, Stranger: deniedCount },
        commandStats: { labels, datasets }
      }
    });
  } catch (error) {
    console.error('Analytics Access Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
