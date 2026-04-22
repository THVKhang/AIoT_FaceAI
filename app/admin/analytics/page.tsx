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
  const [sensorData, setSensorData] = useState(null);
  const [accessData, setAccessData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [range]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSensors, resAccess] = await Promise.all([
        fetch(`/api/analytics/sensors?range=${range}`),
        fetch('/api/analytics/access')
      ]);
      const dataSensors = await resSensors.json();
      const dataAccess = await resAccess.json();
      
      if (dataSensors.success) setSensorData(dataSensors.data);
      if (dataAccess.success) setAccessData(dataAccess.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const lineChartData = {
    labels: sensorData?.labels || [],
    datasets: [
      {
        label: 'Temperature (°C)',
        data: sensorData?.datasets['sensor-temp'] || [],
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 0,
      },
      {
        label: 'Humidity (%)',
        data: sensorData?.datasets['sensor-humid'] || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 0,
      }
    ]
  };

  const doughnutData = {
    labels: ['Valid Access', 'Stranger / Denied'],
    datasets: [
      {
        data: [
          accessData?.faceStats?.Valid || 0,
          accessData?.faceStats?.Stranger || 0
        ],
        backgroundColor: ['#22c55e', '#ef4444'],
        borderWidth: 0,
      }
    ]
  };

  const barData = {
    labels: accessData?.commandStats?.labels || [],
    datasets: [
      {
        label: 'Fan Commands',
        data: accessData?.commandStats?.datasets['button-fan'] || [],
        backgroundColor: '#06b6d4',
        borderRadius: 4,
      },
      {
        label: 'Door Commands',
        data: accessData?.commandStats?.datasets['button-door'] || [],
        backgroundColor: '#f59e0b',
        borderRadius: 4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8' }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { color: '#94a3b8', maxTicksLimit: 10 }
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { color: '#94a3b8' }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#94a3b8' }
      }
    },
    cutout: '70%'
  };

  return (
    <AppShell
      title="Data Analytics"
      subtitle="Phân tích lịch sử môi trường và tần suất hoạt động hệ thống"
    >
      <div className="faceai-actions-bar" style={{ marginBottom: 24, justifyContent: 'flex-start', gap: 12 }}>
        <button 
          className={`faceai-btn ${range === '24h' ? 'faceai-btn-primary' : 'faceai-btn-ghost'}`}
          onClick={() => setRange('24h')}
        >
          24 Giờ Qua
        </button>
        <button 
          className={`faceai-btn ${range === '7d' ? 'faceai-btn-primary' : 'faceai-btn-ghost'}`}
          onClick={() => setRange('7d')}
        >
          7 Ngày Qua
        </button>
        <button 
          className={`faceai-btn ${range === '30d' ? 'faceai-btn-primary' : 'faceai-btn-ghost'}`}
          onClick={() => setRange('30d')}
        >
          30 Ngày Qua
        </button>
      </div>

      {loading ? (
        <div className="faceai-empty">Đang tải dữ liệu biểu đồ...</div>
      ) : (
        <div className="analytics-grid">
          
          {/* Main Line Chart */}
          <div className="faceai-section" style={{ gridColumn: '1 / -1' }}>
            <div className="faceai-section-header">
              <h2 className="faceai-section-title">🌡️ Môi trường</h2>
              <span className="faceai-section-caption">Biến động Nhiệt độ và Độ ẩm</span>
            </div>
            <div style={{ height: 400, width: '100%', padding: '16px 0' }}>
              <Line data={lineChartData} options={chartOptions} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {/* Doughnut Chart */}
            <div className="faceai-section">
              <div className="faceai-section-header">
                <h2 className="faceai-section-title">🛡️ Face AI Stats</h2>
                <span className="faceai-section-caption">Tỷ lệ mở cửa hợp lệ (30 ngày)</span>
              </div>
              <div style={{ height: 300, width: '100%', padding: '16px 0' }}>
                <Doughnut data={doughnutData} options={pieOptions} />
              </div>
            </div>

            {/* Bar Chart */}
            <div className="faceai-section">
              <div className="faceai-section-header">
                <h2 className="faceai-section-title">⚡ Device Activity</h2>
                <span className="faceai-section-caption">Tần suất thiết bị (7 ngày)</span>
              </div>
              <div style={{ height: 300, width: '100%', padding: '16px 0' }}>
                <Bar data={barData} options={chartOptions} />
              </div>
            </div>
          </div>

        </div>
      )}
    </AppShell>
  );
}
