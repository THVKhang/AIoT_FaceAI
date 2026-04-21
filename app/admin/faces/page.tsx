'use client';

import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';

export default function AdminFaces() {
  const [faces, setFaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchFaces();
  }, []);

  const fetchFaces = async () => {
    try {
      const res = await fetch('/api/faces/all');
      const data = await res.json();
      if (data.users) {
        setFaces(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch faces', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClassify = async (id: number, status: string, name: string) => {
    try {
      const res = await fetch('/api/faces/classify', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, name }),
      });
      if (res.ok) {
        fetchFaces();
      }
    } catch (error) {
      console.error('Failed to classify', error);
      alert('Đã xảy ra lỗi hệ thống');
    }
  };

  const toggleFaceAI = async (status: boolean) => {
    if (isSending) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feed_key: 'faceai-cmd', value: status ? 'on' : 'off' })
      });
      if (!res.ok) {
        const errorText = await res.text();
        alert('Lỗi: ' + errorText);
        return;
      }
      setCameraActive(status);
      alert(`Đã gửi lệnh ${status ? 'Bật' : 'Tắt'} Face AI`);
    } catch (e) {
      console.error(e);
      alert('Đã xảy ra lỗi hệ thống');
    } finally {
      setIsSending(false);
    }
  };

  const startRegistration = async () => {
    if (isSending) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feed_key: 'faceai-cmd', value: 'register' })
      });
      if (!res.ok) {
        alert('Lỗi: ' + await res.text());
        return;
      }
      alert('Đã gửi lệnh bắt đầu quét Đăng ký (2 giây)');
    } catch (e) {
      console.error(e);
      alert('Đã xảy ra lỗi hệ thống');
    } finally {
      setIsSending(false);
    }
  };

  const pendingFaces = faces.filter(f => f.status === 'Pending');
  const registeredFaces = faces.filter(f => f.status !== 'Pending');

  return (
    <AppShell
      title="Face AI Management"
      subtitle="Phê duyệt khuôn mặt lạ và quản lý người dùng đã đăng ký"
      actions={
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            disabled={isSending}
            onClick={() => toggleFaceAI(true)}
            style={{ 
              padding: '8px 20px', borderRadius: '8px', 
              background: isSending ? '#9ca3af' : '#2563eb', 
              color: '#fff', border: 'none', cursor: isSending ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            Bật Camera
          </button>
          <button 
            disabled={isSending}
            onClick={() => toggleFaceAI(false)}
            style={{ 
              padding: '8px 20px', borderRadius: '8px', 
              background: isSending ? '#d1d5db' : '#fff', 
              color: '#1f2937', border: '1px solid #d1d5db', cursor: isSending ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold', fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            Tắt Camera
          </button>
          <button 
            disabled={isSending}
            onClick={startRegistration}
            style={{ 
              padding: '8px 20px', borderRadius: '8px', 
              background: isSending ? '#9ca3af' : '#10b981', 
              color: '#fff', border: 'none', cursor: isSending ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            Bắt đầu Đăng ký
          </button>
        </div>
      }
    >
      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
            Pending Approvals ({pendingFaces.length})
          </h2>
        </div>

        {loading ? (
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            Đang tải dữ liệu...
          </div>
        ) : pendingFaces.length === 0 ? (
          <div style={{ background: '#fff', padding: '32px', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#6b7280', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            Không có khuôn mặt nào đang chờ duyệt.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {pendingFaces.map((face) => (
              <div key={face.id} style={{ 
                background: '#fff', padding: '20px', borderRadius: '12px', 
                border: '1px solid #e5e7eb', boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                display: 'flex', flexDirection: 'column', gap: '16px' 
              }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <img 
                    src={face.image_url} 
                    alt="Pending Face" 
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #ef4444' }} 
                  />
                  <div>
                    <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>
                      ⚠️ STRANGER DETECTED
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>Face ID: #{face.id}</div>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                      {new Date(face.created_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
                
                <input 
                  id={`name-${face.id}`}
                  defaultValue={face.name !== 'Unknown' ? face.name : ''}
                  placeholder="Nhập tên người dùng..."
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '6px', 
                    border: '1px solid #d1d5db', fontSize: '14px', outline: 'none'
                  }}
                />
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => handleClassify(face.id, 'Invalid', (document.getElementById(`name-${face.id}`) as HTMLInputElement).value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Từ chối
                  </button>
                  <button 
                    onClick={() => handleClassify(face.id, 'Valid', (document.getElementById(`name-${face.id}`) as HTMLInputElement).value || 'Unknown')}
                    style={{ flex: 1, padding: '10px', borderRadius: '6px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Phê duyệt
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
            Registered Users ({registeredFaces.length})
          </h2>
        </div>

        <div style={{ 
          background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflowX: 'auto' 
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '16px 24px', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profile</th>
                <th style={{ padding: '16px 24px', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name & Status</th>
                <th style={{ padding: '16px 24px', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registered Date</th>
                <th style={{ padding: '16px 24px', fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ divideY: '1px solid #e5e7eb' }}>
              {registeredFaces.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                    Chưa có người dùng nào được duyệt.
                  </td>
                </tr>
              ) : registeredFaces.map((face) => (
                <tr key={face.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <img 
                      src={face.image_url} 
                      alt="Profile" 
                      style={{ 
                        width: '48px', height: '48px', objectFit: 'cover', borderRadius: '50%',
                        opacity: face.status === 'Invalid' ? 0.5 : 1,
                        filter: face.status === 'Invalid' ? 'grayscale(100%)' : 'none',
                        border: '1px solid #e5e7eb'
                      }} 
                    />
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1f2937' }}>{face.name}</div>
                    <div style={{ 
                      display: 'inline-block', marginTop: '6px', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold',
                      background: face.status === 'Valid' ? '#d1fae5' : '#fee2e2',
                      color: face.status === 'Valid' ? '#059669' : '#dc2626'
                    }}>
                      {face.status === 'Valid' ? 'APPROVED' : 'REJECTED'}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#4b5563', fontSize: '0.9rem' }}>
                    {new Date(face.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleClassify(face.id, face.status === 'Valid' ? 'Invalid' : 'Valid', face.name)}
                      style={{ 
                        padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem',
                        background: face.status === 'Valid' ? '#fff' : '#eff6ff',
                        color: face.status === 'Valid' ? '#ef4444' : '#2563eb',
                        border: face.status === 'Valid' ? '1px solid #fca5a5' : '1px solid #bfdbfe'
                      }}
                    >
                      {face.status === 'Valid' ? 'Revoke Access' : 'Restore Access'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
