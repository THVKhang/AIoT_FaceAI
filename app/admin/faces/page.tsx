'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AppShell from '../../components/AppShell';

const STREAM_URL = process.env.NEXT_PUBLIC_STREAM_URL || 'http://localhost:5001';

type CameraMode = 'off' | 'stream' | 'webcam';

export default function AdminFaces() {
  const [faces, setFaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>('off');
  const [streamCacheBuster, setStreamCacheBuster] = useState(Date.now());
  const [isSending, setIsSending] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { fetchFaces(); }, []);

  // Cleanup webcam on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

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
    } catch (e) {
      console.error(e);
      alert('Lỗi cập nhật / xóa dữ liệu');
    }
  };

  const handleRename = (id: number, status: string, currentName: string) => {
    const newName = window.prompt('Nhập tên mới cho người dùng này:', currentName);
    if (newName !== null && newName.trim() !== '') {
      handleClassify(id, status, newName.trim());
    }
  };

  // ==================== CAMERA CONTROLS ====================

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startWebcam = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setCameraMode('webcam');
      setStatusMsg('Webcam đang hoạt động');
    } catch (err) {
      console.error('Webcam error:', err);
      setStatusMsg('Không thể truy cập webcam. Hãy cấp quyền camera.');
      setCameraMode('off');
    }
  }, []);

  const handleStartCamera = async () => {
    if (isSending) return;
    setIsSending(true);
    setStatusMsg('Đang kết nối...');
    setCapturedImage(null);

    try {
      // 1. Try connecting to local Python MJPEG stream
      let streamAvailable = false;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${STREAM_URL}/cmd/on`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) streamAvailable = true;
      } catch {
        console.warn('Python stream not available, falling back to browser webcam...');
      }

      if (streamAvailable) {
        // Use MJPEG stream from Python service
        setStreamCacheBuster(Date.now());
        setCameraMode('stream');
        setStatusMsg('Stream từ Python service');
      } else {
        // Fallback: Use browser webcam
        await startWebcam();
      }
    } catch (e) {
      console.error(e);
      setStatusMsg('Lỗi khi bật camera');
    } finally {
      setIsSending(false);
    }
  };

  const handleStopCamera = async () => {
    if (isSending) return;
    setIsSending(true);

    try {
      if (cameraMode === 'stream') {
        // Try to stop the Python stream
        try {
          await fetch(`${STREAM_URL}/cmd/off`);
        } catch { /* ignore */ }
      }
      stopWebcam();
      setCameraMode('off');
      setCapturedImage(null);
      setStatusMsg('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const handleRegisterFace = async () => {
    if (isSending) return;
    setIsSending(true);
    setStatusMsg('Đang đăng ký khuôn mặt...');

    try {
      if (cameraMode === 'stream') {
        // Use Python service for registration
        try {
          const res = await fetch(`${STREAM_URL}/cmd/register`);
          if (res.ok) {
            setStatusMsg('Đã gửi lệnh đăng ký qua Python service');
            setTimeout(fetchFaces, 3000);
            return;
          }
        } catch { /* fallthrough */ }
        // Fallback to MQTT
        await fetch('/api/commands', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feed_key: 'faceai-cmd', value: 'register' })
        });
        setStatusMsg('Đã gửi lệnh đăng ký qua MQTT');
        setTimeout(fetchFaces, 3000);
      } else if (cameraMode === 'webcam') {
        // Capture from webcam and send to identify API
        const imageBlob = captureWebcamFrame();
        if (!imageBlob) {
          setStatusMsg('Không thể chụp ảnh từ webcam');
          return;
        }

        const formData = new FormData();
        formData.append('file', imageBlob, 'webcam-capture.jpg');

        const res = await fetch('/api/faces/identify-or-register', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (data.success) {
          setStatusMsg(data.message || 'Đã gửi ảnh để nhận diện');
          setCapturedImage(URL.createObjectURL(imageBlob));
          setTimeout(fetchFaces, 1500);
        } else {
          setStatusMsg(data.error || 'Lỗi khi xử lý ảnh');
        }
      } else {
        setStatusMsg('Hãy bật camera trước');
      }
    } catch (e) {
      console.error(e);
      setStatusMsg('Lỗi hệ thống khi đăng ký');
    } finally {
      setIsSending(false);
    }
  };

  const captureWebcamFrame = (): Blob | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    // Convert canvas to blob synchronously via toDataURL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const byteString = atob(dataUrl.split(',')[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    return new Blob([uint8Array], { type: 'image/jpeg' });
  };

  const handleCaptureSnapshot = async () => {
    if (cameraMode !== 'webcam') return;
    const blob = captureWebcamFrame();
    if (blob) {
      setCapturedImage(URL.createObjectURL(blob));
      setStatusMsg('Đã chụp ảnh từ webcam');
    }
  };

  const sendDoorCommand = async (value: string) => {
    if (isSending) return;
    setIsSending(true);
    try {
      await fetch('/api/commands', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feed_key: 'button-door', value })
      });
    } catch (e) {
      console.error(e);
      alert('Lỗi gửi lệnh cửa.');
    } finally {
      setIsSending(false);
    }
  };

  const pendingFaces = faces.filter(f => f.status === 'Pending');
  const registeredFaces = faces.filter(f => f.status !== 'Pending');

  const cameraActive = cameraMode !== 'off';
  const modeLabel = cameraMode === 'stream'
    ? 'Stream: Python Service'
    : cameraMode === 'webcam'
      ? 'Webcam: Browser Camera'
      : 'Offline';

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
          <span className="faceai-monitor-meta">{modeLabel}</span>
        </div>

        <div className="faceai-monitor-viewport">
          {cameraMode === 'stream' ? (
            <img src={`${STREAM_URL}/video_feed?t=${streamCacheBuster}`} alt="Live Camera Feed" />
          ) : cameraMode === 'webcam' ? (
            <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  maxWidth: '100%',
                  maxHeight: '460px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          ) : (
            <div className="faceai-monitor-placeholder">
              <div className="faceai-monitor-placeholder-icon">📹</div>
              <div className="faceai-monitor-placeholder-title">Camera đang tắt</div>
              <div className="faceai-monitor-placeholder-text">
                Nhấn &quot;Bật Camera&quot; bên dưới để bắt đầu stream video.
                <br />
                <span style={{ fontSize: '13px', opacity: 0.7, marginTop: '8px', display: 'inline-block' }}>
                  Tự động dùng webcam trình duyệt nếu không có Python service.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Status message bar */}
        {statusMsg && (
          <div style={{
            padding: '8px 16px',
            fontSize: '13px',
            color: '#94a3b8',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: cameraActive ? '#22c55e' : '#64748b' }} />
            {statusMsg}
          </div>
        )}

        {/* Captured snapshot preview */}
        {capturedImage && (
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <img
              src={capturedImage}
              alt="Captured"
              style={{
                width: 80, height: 80,
                borderRadius: '10px',
                objectFit: 'cover',
                border: '2px solid rgba(91,97,245,0.3)',
              }}
            />
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Ảnh vừa chụp từ webcam</span>
          </div>
        )}

        <div className="faceai-actions-bar">
          <div className="faceai-actions-group">
            {!cameraActive ? (
              <button
                className="faceai-btn faceai-btn-primary"
                disabled={isSending}
                onClick={handleStartCamera}
              >
                ▶ Bật Camera
              </button>
            ) : (
              <button
                className="faceai-btn faceai-btn-danger"
                disabled={isSending}
                onClick={handleStopCamera}
              >
                ■ Tắt Camera
              </button>
            )}
            {cameraMode === 'webcam' && (
              <button
                className="faceai-btn faceai-btn-ghost"
                style={{ borderColor: 'var(--vf-primary, #5B61F5)', color: 'var(--vf-primary, #5B61F5)' }}
                disabled={isSending}
                onClick={handleCaptureSnapshot}
              >
                📸 Chụp ảnh
              </button>
            )}
            <button
              className="faceai-btn faceai-btn-success"
              disabled={isSending}
              onClick={handleRegisterFace}
            >
              + Đăng ký khuôn mặt
            </button>
            <button
              className="faceai-btn faceai-btn-ghost"
              style={{ marginLeft: 8, borderColor: 'var(--vf-primary, #5B61F5)', color: 'var(--vf-primary, #5B61F5)' }}
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
                      className="faceai-table-action"
                      style={{ color: 'var(--vf-primary, #5B61F5)', marginRight: '8px' }}
                      onClick={() => handleRename(face.id, face.status, face.name)}
                    >
                      Đổi tên
                    </button>
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
