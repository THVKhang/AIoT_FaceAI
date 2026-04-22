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
    const client = await pool.connect();
    
    // 1. Access Logs Stats (Doughnut Chart)
    const accessQuery = `
      SELECT result, COUNT(*) as total 
      FROM access_logs 
      WHERE created_at >= NOW() - INTERVAL '30 DAYS'
      GROUP BY result;
    `;
    const accessRes = await client.query(accessQuery);
    
    const faceStats = { Valid: 0, Stranger: 0 };
    accessRes.rows.forEach(row => {
      if (row.result.toLowerCase() === 'valid') faceStats.Valid = parseInt(row.total);
      if (row.result.toLowerCase() === 'stranger' || row.result.toLowerCase() === 'rejected') faceStats.Stranger += parseInt(row.total);
    });

    // 2. Command Activity Stats (Bar Chart)
    const cmdQuery = `
      SELECT 
        feed_key,
        DATE_TRUNC('day', created_at) AS time_bucket,
        COUNT(*) as total_cmds
      FROM commands
      WHERE created_at >= NOW() - INTERVAL '7 DAYS'
      GROUP BY feed_key, DATE_TRUNC('day', created_at)
      ORDER BY time_bucket ASC;
    `;
    const cmdRes = await client.query(cmdQuery);
    
    client.release();

    // Format Commands Data
    const cmdData = {
      labels: [],
      datasets: {
        'button-fan': [],
        'button-door': []
      }
    };

    const timeSet = new Set();
    cmdRes.rows.forEach(row => {
      timeSet.add(new Date(row.time_bucket).toLocaleDateString('vi-VN'));
    });
    cmdData.labels = Array.from(timeSet).sort();

    const mappedCmd = { 'button-fan': {}, 'button-door': {} };
    cmdRes.rows.forEach(row => {
      const timeStr = new Date(row.time_bucket).toLocaleDateString('vi-VN');
      if (mappedCmd[row.feed_key]) {
         mappedCmd[row.feed_key][timeStr] = parseInt(row.total_cmds);
      }
    });

    cmdData.labels.forEach(label => {
      cmdData.datasets['button-fan'].push(mappedCmd['button-fan'][label] || 0);
      cmdData.datasets['button-door'].push(mappedCmd['button-door'][label] || 0);
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        faceStats,
        commandStats: cmdData
      }
    });
  } catch (error) {
    console.error('Lỗi truy vấn Analytics Access:', error);
    return NextResponse.json({ success: false, message: 'Lỗi Database' }, { status: 500 });
  }
}
