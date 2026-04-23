'use client';

import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';

const STREAM_URL = process.env.NEXT_PUBLIC_STREAM_URL || 'http://localhost:5001';

export default function AdminFaces() {
  const [faces, setFaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [streamCacheBuster, setStreamCacheBuster] = useState(Date.now());
  const [isSending, setIsSending] = useState(false);

  useEffect(() => { fetchFaces(); }, []);

  const fetchFaces = async () => {
    try {
      const res = await fetch('/api/faces/all');
      const data = await res.json();
      if (data.users) setFaces(data.users);
    } catch (e) { console.error('Fetch error', e); }
    finally { setLoading(false); }
  };

  const handleClassify = async (id: number, status: string, name: string) => {
    try {
      const res = await fetch('/api/faces/classify', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, name }),
      });
      if (res.ok) fetchFaces();
    } catch (e) { console.error(e); alert('Lỗi hệ thống'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn khuôn mặt này khỏi hệ thống?')) return;
    try {
      const res = await fetch('/api/faces/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchFaces();
    } catch (e) { console.error(e); alert('Lỗi hệ thống'); }
  };

  const sendCommand = async (value: string) => {
    if (isSending) return;
    setIsSending(true);
    try {
      // 1. Try calling Python service directly (instant, no MQTT delay)
      const cmdMap: Record<string, string> = { on: '/cmd/on', off: '/cmd/off', register: '/cmd/register' };
      const endpoint = cmdMap[value];
      
      let directSuccess = false;
      if (endpoint) {
        try {
          const res = await fetch(`${STREAM_URL}${endpoint}`);
          if (res.ok) directSuccess = true;
        } catch (e) {
          console.warn('Direct HTTP to Python service failed, falling back to MQTT...', e);
        }
      }
      
      // 2. If direct fails (e.g. deployed on Vercel), send via MQTT
      if (!directSuccess) {
        await fetch('/api/commands', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feed_key: 'faceai-cmd', value })
        });
      }
      
      if (value === 'on' || value === 'register') {
        setStreamCacheBuster(Date.now());
        setCameraActive(true);
      }
      if (value === 'off') setCameraActive(false);
    } catch (e) { 
      console.error(e); 
      alert('Lỗi hệ thống khi gửi lệnh.'); 
    }
    finally { setIsSending(false); }
  };

  const sendDoorCommand = async (value: string) => {
    if (isSending) return;
    setIsSending(true);
    try {
      await fetch('/api/commands', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feed_key: 'button-door', value })
      });
      // Optionally alert or just let it be silent
    } catch (e) {
      console.error(e);
      alert('Lỗi gửi lệnh cửa.');
    } finally {
      setIsSending(false);
    }
  };

  const pendingFaces = faces.filter(f => f.status === 'Pending');
  const registeredFaces = faces.filter(f => f.status !== 'Pending');

  return (
    <AppShell
      title="Face AI Management"
      subtitle="Nhận diện khuôn mặt, đăng ký user mới và phê duyệt quyền truy cập"
    >
      {/* ========== CAMERA MONITOR ========== */}
      <div className="faceai-monitor">
        <div className="faceai-monitor-header">
          <div className="faceai-monitor-label">
            <div className={`faceai-live-dot ${cameraActive ? 'is-active' : ''}`} />
            <span className="faceai-monitor-tag">Live Camera Feed</span>
          </div>
          <span className="faceai-monitor-meta">
            {cameraActive ? `Stream: localhost:5001` : 'Offline'}
          </span>
        </div>

        <div className="faceai-monitor-viewport">
          {cameraActive ? (
            <img src={`${STREAM_URL}/video_feed?t=${streamCacheBuster}`} alt="Live Camera Feed" />
          ) : (
            <div className="faceai-monitor-placeholder">
              <div className="faceai-monitor-placeholder-icon">📹</div>
              <div className="faceai-monitor-placeholder-title">Camera đang tắt</div>
              <div className="faceai-monitor-placeholder-text">
                Nhấn "Bật Camera" bên dưới để bắt đầu stream video từ thiết bị.
              </div>
            </div>
          )}
        </div>

        <div className="faceai-actions-bar">
          <div className="faceai-actions-group">
            {!cameraActive ? (
              <button
                className="faceai-btn faceai-btn-primary"
                disabled={isSending}
                onClick={() => sendCommand('on')}
              >
                ▶ Bật Camera
              </button>
            ) : (
              <button
                className="faceai-btn faceai-btn-danger"
                disabled={isSending}
                onClick={() => sendCommand('off')}
              >
                ■ Tắt Camera
              </button>
            )}
            <button
              className="faceai-btn faceai-btn-success"
              disabled={isSending}
              onClick={() => sendCommand('register')}
            >
              + Đăng ký khuôn mặt
            </button>
            <button
              className="faceai-btn faceai-btn-ghost"
              style={{ marginLeft: 8, borderColor: '#3b82f6', color: '#3b82f6' }}
              disabled={isSending}
              onClick={() => sendDoorCommand('1')}
            >
              🔓 Mở Cửa
            </button>
            <button
              className="faceai-btn faceai-btn-ghost"
              style={{ marginLeft: 8 }}
              disabled={isSending}
              onClick={() => sendDoorCommand('0')}
            >
              🔒 Đóng Cửa
            </button>
          </div>
          <button
            className="faceai-btn faceai-btn-ghost"
            onClick={fetchFaces}
          >
            ↻ Refresh Data
          </button>
        </div>
      </div>

      {/* ========== PENDING APPROVALS ========== */}
      <div className="faceai-section">
        <div className="faceai-section-header">
          <h2 className="faceai-section-title">
            Pending Approvals
            {pendingFaces.length > 0 && (
              <span className="faceai-badge-count">{pendingFaces.length}</span>
            )}
          </h2>
          <span className="faceai-section-caption">
            Khuôn mặt lạ vừa được camera phát hiện
          </span>
        </div>

        {loading ? (
          <div className="faceai-empty">Đang tải dữ liệu...</div>
        ) : pendingFaces.length === 0 ? (
          <div className="faceai-empty">
            <div className="faceai-empty-icon">✅</div>
            Không có khuôn mặt nào đang chờ duyệt.
          </div>
        ) : (
          <div className="faceai-pending-grid">
            {pendingFaces.map((face) => (
              <div key={face.id} className="faceai-pending-card">
                <div className="faceai-pending-top">
                  <img
                    src={face.image_url}
                    alt="Detected face"
                    className="faceai-pending-thumb"
                  />
                  <div className="faceai-pending-info">
                    <div className="faceai-pending-alert">⚠ Stranger Detected</div>
                    <div className="faceai-pending-id">Face ID #{face.id}</div>
                    <div className="faceai-pending-time">
                      {new Date(face.created_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>

                <input
                  id={`name-${face.id}`}
                  className="faceai-pending-input"
                  placeholder="Nhập tên người dùng..."
                  defaultValue={face.name !== 'Unknown' ? face.name : ''}
                />

                <div className="faceai-pending-actions">
                  <button
                    className="faceai-reject-btn"
                    onClick={() => handleClassify(
                      face.id, 'Invalid',
                      (document.getElementById(`name-${face.id}`) as HTMLInputElement).value
                    )}
                  >
                    Từ chối
                  </button>
                  <button
                    className="faceai-approve-btn"
                    onClick={() => handleClassify(
                      face.id, 'Valid',
                      (document.getElementById(`name-${face.id}`) as HTMLInputElement).value || 'Unknown'
                    )}
                  >
                    Phê duyệt
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== REGISTERED USERS ========== */}
      <div className="faceai-section">
        <div className="faceai-section-header">
          <h2 className="faceai-section-title">Registered Users</h2>
          <span className="faceai-section-caption">
            Tổng cộng {registeredFaces.length} người dùng
          </span>
        </div>

        <div className="faceai-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="faceai-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Name &amp; Status</th>
                <th>Registered</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {registeredFaces.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '36px 22px', color: '#64748b' }}>
                    Chưa có người dùng nào được duyệt.
                  </td>
                </tr>
              ) : registeredFaces.map((face) => (
                <tr key={face.id}>
                  <td>
                    <img
                      src={face.image_url}
                      alt={face.name}
                      className={`faceai-user-avatar ${face.status === 'Invalid' ? 'is-revoked' : ''}`}
                    />
                  </td>
                  <td>
                    <div className="faceai-user-name">{face.name}</div>
                    <div className={`faceai-status-chip ${face.status === 'Valid' ? 'approved' : 'rejected'}`}>
                      {face.status === 'Valid' ? 'APPROVED' : 'REJECTED'}
                    </div>
                  </td>
                  <td style={{ color: '#64748b', fontSize: '14px' }}>
                    {new Date(face.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={`faceai-table-action ${face.status === 'Valid' ? 'revoke' : 'restore'}`}
                      onClick={() => handleClassify(face.id, face.status === 'Valid' ? 'Invalid' : 'Valid', face.name)}
                    >
                      {face.status === 'Valid' ? 'Revoke' : 'Restore'}
                    </button>
                    <button
                      className="faceai-table-action"
                      style={{ color: '#ef4444', marginLeft: '8px', padding: '4px 8px' }}
                      title="Xóa vĩnh viễn"
                      onClick={() => handleDelete(face.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
