import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../hooks/redux';
import { Header } from '../components/Layout/Header';
import { Sidebar } from '../components/Layout/Sidebar';
import { adminAPI } from '../services/api';
import '../styles/Admin.css';

interface AllowedEmail {
  id: number;
  email: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  added_by_name: string | null;
  has_account: number;
}

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

interface Stats {
  users: number;
  videos: number;
  channels: number;
  allowedEmails: number;
  videosByStatus: Record<string, number>;
}

export const AdminPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [newEmail, setNewEmail] = useState('');
  const [newEmailNotes, setNewEmailNotes] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [emailsRes, usersRes, statsRes] = await Promise.all([
        adminAPI.getAllowedEmails(),
        adminAPI.getUsers(),
        adminAPI.getStats(),
      ]);
      
      setAllowedEmails(emailsRes.data);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail.trim()) {
      setError('Email is required');
      return;
    }

    setAddingEmail(true);
    setError(null);

    try {
      await adminAPI.addAllowedEmail(newEmail.trim(), newEmailNotes.trim() || undefined);
      setSuccess('✓ Email added to whitelist');
      setNewEmail('');
      setNewEmailNotes('');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add email');
    } finally {
      setAddingEmail(false);
    }
  };

  const handleToggleEmail = async (id: number) => {
    try {
      await adminAPI.toggleAllowedEmail(id);
      await loadData();
      setSuccess('✓ Email status updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle email');
    }
  };

  const handleDeleteEmail = async (id: number, email: string) => {
    if (!window.confirm(`Remove "${email}" from whitelist?\n\nThis will prevent them from logging in.`)) {
      return;
    }

    try {
      await adminAPI.deleteAllowedEmail(id);
      await loadData();
      setSuccess('✓ Email removed from whitelist');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete email');
    }
  };

  const handleDeleteUser = async (id: number, email: string) => {
    if (!window.confirm(`Delete user "${email}"?\n\n⚠️ This will delete ALL their data including videos, channels, and schedules.`)) {
      return;
    }

    try {
      await adminAPI.deleteUser(id);
      await loadData();
      setSuccess('✓ User deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <Header />
        <div className="admin-content">
          <Sidebar />
          <main className="main-content">
            <p>Loading...</p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <Header />
      <div className="admin-content">
        <Sidebar />
        <main className="main-content">
          <h1>🔐 Admin Dashboard</h1>

          {error && (
            <div style={{
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid #ff6b6b',
              color: '#ff6b6b',
              padding: '10px 15px',
              borderRadius: '6px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              backgroundColor: 'rgba(0, 255, 0, 0.1)',
              border: '1px solid #00ff00',
              color: '#00ff00',
              padding: '10px 15px',
              borderRadius: '6px',
              marginBottom: '20px',
            }}>
              {success}
            </div>
          )}

          {/* Stats Section */}
          {stats && (
            <section style={{ marginBottom: '40px' }}>
              <h2>📊 Statistics</h2>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{
                  backgroundColor: 'rgba(0, 150, 255, 0.1)',
                  border: '1px solid rgba(0, 150, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '15px 25px',
                  minWidth: '120px',
                }}>
                  <div style={{ color: '#0096ff', fontSize: '24px', fontWeight: 'bold' }}>
                    {stats.allowedEmails}
                  </div>
                  <div style={{ color: '#999', fontSize: '13px' }}>Allowed Emails</div>
                </div>
                
                <div style={{
                  backgroundColor: 'rgba(0, 255, 0, 0.1)',
                  border: '1px solid rgba(0, 255, 0, 0.3)',
                  borderRadius: '8px',
                  padding: '15px 25px',
                  minWidth: '120px',
                }}>
                  <div style={{ color: '#00ff00', fontSize: '24px', fontWeight: 'bold' }}>
                    {stats.users}
                  </div>
                  <div style={{ color: '#999', fontSize: '13px' }}>Active Users</div>
                </div>
                
                <div style={{
                  backgroundColor: 'rgba(255, 165, 0, 0.1)',
                  border: '1px solid rgba(255, 165, 0, 0.3)',
                  borderRadius: '8px',
                  padding: '15px 25px',
                  minWidth: '120px',
                }}>
                  <div style={{ color: '#FFA500', fontSize: '24px', fontWeight: 'bold' }}>
                    {stats.videos}
                  </div>
                  <div style={{ color: '#999', fontSize: '13px' }}>Total Videos</div>
                </div>
                
                <div style={{
                  backgroundColor: 'rgba(128, 128, 128, 0.1)',
                  border: '1px solid rgba(128, 128, 128, 0.3)',
                  borderRadius: '8px',
                  padding: '15px 25px',
                  minWidth: '120px',
                }}>
                  <div style={{ color: '#aaa', fontSize: '24px', fontWeight: 'bold' }}>
                    {stats.channels}
                  </div>
                  <div style={{ color: '#999', fontSize: '13px' }}>Source Channels</div>
                </div>
              </div>
            </section>
          )}

          {/* Add Email Section */}
          <section style={{ marginBottom: '40px' }}>
            <h2>✉️ Add Allowed Email</h2>
            <form onSubmit={handleAddEmail} style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '20px',
            }}>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  style={{
                    flex: 2,
                    minWidth: '200px',
                    padding: '10px 15px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
                <input
                  type="text"
                  value={newEmailNotes}
                  onChange={(e) => setNewEmailNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  style={{
                    flex: 2,
                    minWidth: '200px',
                    padding: '10px 15px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
                <button
                  type="submit"
                  disabled={addingEmail}
                  style={{
                    padding: '10px 25px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#0096ff',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: addingEmail ? 'not-allowed' : 'pointer',
                    opacity: addingEmail ? 0.6 : 1,
                  }}
                >
                  {addingEmail ? 'Adding...' : '+ Add Email'}
                </button>
              </div>
            </form>
          </section>

          {/* Allowed Emails List */}
          <section style={{ marginBottom: '40px' }}>
            <h2>📋 Allowed Emails ({allowedEmails.length})</h2>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}>
              {allowedEmails.length === 0 ? (
                <p style={{ padding: '20px', color: '#999', textAlign: 'center' }}>
                  No emails in whitelist. Add one above.
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                      <th style={{ padding: '12px 15px', textAlign: 'left', color: '#888' }}>Email</th>
                      <th style={{ padding: '12px 15px', textAlign: 'left', color: '#888' }}>Notes</th>
                      <th style={{ padding: '12px 15px', textAlign: 'center', color: '#888' }}>Status</th>
                      <th style={{ padding: '12px 15px', textAlign: 'center', color: '#888' }}>Has Account</th>
                      <th style={{ padding: '12px 15px', textAlign: 'right', color: '#888' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allowedEmails.map((item) => (
                      <tr 
                        key={item.id}
                        style={{ 
                          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                          opacity: item.is_active ? 1 : 0.5,
                        }}
                      >
                        <td style={{ padding: '12px 15px' }}>
                          <span style={{ fontFamily: 'monospace' }}>{item.email}</span>
                        </td>
                        <td style={{ padding: '12px 15px', color: '#888' }}>
                          {item.notes || '-'}
                        </td>
                        <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: item.is_active 
                              ? 'rgba(0, 255, 0, 0.2)' 
                              : 'rgba(255, 0, 0, 0.2)',
                            color: item.is_active ? '#00ff00' : '#ff6b6b',
                          }}>
                            {item.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                          {item.has_account > 0 ? '✅' : '❌'}
                        </td>
                        <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleToggleEmail(item.id)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '4px',
                              border: '1px solid #FFA500',
                              backgroundColor: 'transparent',
                              color: '#FFA500',
                              cursor: 'pointer',
                              marginRight: '8px',
                              fontSize: '12px',
                            }}
                          >
                            {item.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDeleteEmail(item.id, item.email)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '4px',
                              border: '1px solid #ff6b6b',
                              backgroundColor: 'transparent',
                              color: '#ff6b6b',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Users List */}
          <section>
            <h2>👥 Registered Users ({users.length})</h2>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}>
              {users.length === 0 ? (
                <p style={{ padding: '20px', color: '#999', textAlign: 'center' }}>
                  No users registered yet.
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                      <th style={{ padding: '12px 15px', textAlign: 'left', color: '#888' }}>Name</th>
                      <th style={{ padding: '12px 15px', textAlign: 'left', color: '#888' }}>Email</th>
                      <th style={{ padding: '12px 15px', textAlign: 'center', color: '#888' }}>Role</th>
                      <th style={{ padding: '12px 15px', textAlign: 'left', color: '#888' }}>Joined</th>
                      <th style={{ padding: '12px 15px', textAlign: 'right', color: '#888' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr 
                        key={u.id}
                        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}
                      >
                        <td style={{ padding: '12px 15px' }}>{u.name}</td>
                        <td style={{ padding: '12px 15px', fontFamily: 'monospace' }}>{u.email}</td>
                        <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: u.role === 'admin' 
                              ? 'rgba(255, 0, 255, 0.2)' 
                              : 'rgba(0, 150, 255, 0.2)',
                            color: u.role === 'admin' ? '#ff00ff' : '#0096ff',
                          }}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 15px', color: '#888' }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                          {u.id !== user?.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '4px',
                                border: '1px solid #ff6b6b',
                                backgroundColor: 'transparent',
                                color: '#ff6b6b',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminPage;