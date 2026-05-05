'use client';

import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsPage() {
  const [range, setRange] = useState('7d');
  const [sensorData, setSensorData] = useState<any>(null);
  const [accessData, setAccessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [range]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [resSensors, resAccess] = await Promise.all([
        fetch(`/api/analytics/sensors?range=${range}`),
        fetch('/api/analytics/access')
      ]);
      const dataSensors = await resSensors.json();
      const dataAccess = await resAccess.json();
      
      if (dataSensors.success) setSensorData(dataSensors.data);
      else setError(dataSensors.message || 'Lỗi tải dữ liệu sensor');
      
      if (dataAccess.success) setAccessData(dataAccess.data);
    } catch (e) {
      console.error(e);
      setError('Không thể kết nối API');
    } finally {
      setLoading(false);
    }
  };

  // ====== Chart Configs ======

  const lineChartData = {
    labels: sensorData?.labels || [],
    datasets: [
      {
        label: 'Nhiệt độ (°C)',
        data: sensorData?.datasets?.['sensor-temp'] || [],
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.08)',
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointBackgroundColor: '#f97316',
        borderWidth: 2,
      },
      {
        label: 'Độ ẩm (%)',
        data: sensorData?.datasets?.['sensor-humid'] || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointBackgroundColor: '#3b82f6',
        borderWidth: 2,
      },
    ]
  };

  const lightChartData = {
    labels: sensorData?.labels || [],
    datasets: [
      {
        label: 'Ánh sáng (lux)',
        data: sensorData?.datasets?.['sensor-light'] || [],
        borderColor: '#eab308',
        backgroundColor: 'rgba(234, 179, 8, 0.08)',
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointBackgroundColor: '#eab308',
        borderWidth: 2,
      }
    ]
  };

  const validCount = accessData?.faceStats?.Valid || 0;
  const deniedCount = accessData?.faceStats?.Stranger || 0;
  const totalAccess = validCount + deniedCount;

  const doughnutData = {
    labels: ['Hợp lệ', 'Từ chối'],
    datasets: [{
      data: [validCount, deniedCount],
      backgroundColor: ['#22c55e', '#ef4444'],
      borderColor: ['rgba(34,197,94,0.3)', 'rgba(239,68,68,0.3)'],
      borderWidth: 2,
      hoverOffset: 8,
    }]
  };

  const barData = {
    labels: accessData?.commandStats?.labels || [],
    datasets: [
      {
        label: 'Door',
        data: accessData?.commandStats?.datasets?.['button-door'] || [],
        backgroundColor: 'rgba(245, 158, 11, 0.7)',
        borderColor: '#f59e0b',
        borderWidth: 1,
        borderRadius: 6,
      },
      {
        label: 'Light',
        data: accessData?.commandStats?.datasets?.['button-light'] || [],
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 6,
      },
      {
        label: 'Fan',
        data: accessData?.commandStats?.datasets?.['fan'] || [],
        backgroundColor: 'rgba(6, 182, 212, 0.7)',
        borderColor: '#06b6d4',
        borderWidth: 1,
        borderRadius: 6,
      },
    ]
  };

  const darkGridColor = 'rgba(148, 163, 184, 0.08)';
  const tickColor = '#64748b';

  const lineOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: { color: '#94a3b8', usePointStyle: true, pointStyle: 'circle', padding: 20, font: { size: 12 } }
      },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(99,102,241,0.3)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      x: { grid: { color: darkGridColor }, ticks: { color: tickColor, maxTicksLimit: 12, font: { size: 11 } } },
      y: { grid: { color: darkGridColor }, ticks: { color: tickColor, font: { size: 11 } } }
    }
  };

  const pieOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#94a3b8', usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12 } }
      },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(99,102,241,0.3)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      }
    }
  };

  const barOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: { color: '#94a3b8', usePointStyle: true, pointStyle: 'rect', padding: 20, font: { size: 12 } }
      },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(99,102,241,0.3)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      x: { grid: { color: darkGridColor }, ticks: { color: tickColor, font: { size: 11 } }, stacked: false },
      y: { grid: { color: darkGridColor }, ticks: { color: tickColor, font: { size: 11 }, stepSize: 1 }, beginAtZero: true }
    }
  };

  const rangeOptions = [
    { key: '24h', label: '24 Giờ' },
    { key: '7d', label: '7 Ngày' },
    { key: '30d', label: '30 Ngày' },
  ];

  return (
    <AppShell
      title="Data Analytics"
      subtitle="Phân tích lịch sử môi trường và tần suất hoạt động hệ thống"
    >
      {/* Range selector */}
      <section className="section-block">
        <div className="analytics-range-bar">
          {rangeOptions.map(opt => (
            <button
              key={opt.key}
              className={`analytics-range-btn ${range === opt.key ? 'is-active' : ''}`}
              onClick={() => setRange(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <section className="section-block">
          <div className="analytics-loading">
            <div className="analytics-loading-spinner" />
            <span>Đang tải dữ liệu biểu đồ...</span>
          </div>
        </section>
      ) : error ? (
        <section className="section-block">
          <div className="analytics-error">{error}</div>
        </section>
      ) : (
        <>
          {/* Main Line Chart — Temp & Humidity */}
          <section className="section-block">
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div>
                  <h2 className="analytics-card-title">🌡️ Nhiệt độ & Độ ẩm</h2>
                  <p className="analytics-card-caption">Biến động theo thời gian</p>
                </div>
                <span className="analytics-card-badge">
                  {sensorData?.labels?.length || 0} điểm dữ liệu
                </span>
              </div>
              <div className="analytics-chart-container analytics-chart-lg">
                <Line data={lineChartData} options={lineOptions} />
              </div>
            </div>
          </section>

          {/* Light Chart */}
          <section className="section-block">
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div>
                  <h2 className="analytics-card-title">💡 Ánh sáng</h2>
                  <p className="analytics-card-caption">Mức sáng môi trường</p>
                </div>
              </div>
              <div className="analytics-chart-container analytics-chart-md">
                <Line data={lightChartData} options={lineOptions} />
              </div>
            </div>
          </section>

          {/* Bottom row: Doughnut + Bar */}
          <section className="section-block">
            <div className="analytics-bottom-grid">
              {/* Doughnut */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <div>
                    <h2 className="analytics-card-title">🛡️ Face AI Stats</h2>
                    <p className="analytics-card-caption">Tỷ lệ mở cửa hợp lệ (30 ngày)</p>
                  </div>
                </div>
                <div className="analytics-doughnut-wrap">
                  <div className="analytics-chart-container analytics-chart-sm">
                    <Doughnut data={doughnutData} options={pieOptions} />
                  </div>
                  <div className="analytics-doughnut-stats">
                    <div className="analytics-stat-item">
                      <span className="analytics-stat-dot" style={{ background: '#22c55e' }} />
                      <span>Hợp lệ</span>
                      <strong>{validCount}</strong>
                    </div>
                    <div className="analytics-stat-item">
                      <span className="analytics-stat-dot" style={{ background: '#ef4444' }} />
                      <span>Từ chối</span>
                      <strong>{deniedCount}</strong>
                    </div>
                    <div className="analytics-stat-item analytics-stat-total">
                      <span>Tổng</span>
                      <strong>{totalAccess}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bar */}
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <div>
                    <h2 className="analytics-card-title">⚡ Device Activity</h2>
                    <p className="analytics-card-caption">Số lệnh theo ngày (7 ngày)</p>
                  </div>
                </div>
                <div className="analytics-chart-container analytics-chart-sm">
                  <Bar data={barData} options={barOptions} />
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
