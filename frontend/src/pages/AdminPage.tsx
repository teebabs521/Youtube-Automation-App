import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { Header } from '../components/Layout/Header';
import { Sidebar } from '../components/Layout/Sidebar';
import { setUsers, setStats } from '../store/slices/adminSlice';
import { adminAPI } from '../services/api';
import '../styles/Admin.css';

export const AdminPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { users, stats } = useAppSelector((state) => state.admin);

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await adminAPI.getUsers();
      dispatch(setUsers(response.data));
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await adminAPI.getStats();
      dispatch(setStats(response.data));
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (window.confirm('Delete this user?')) {
      try {
        await adminAPI.deleteUser(id);
        loadUsers();
      } catch (error) {
        alert('Failed to delete user');
      }
    }
  };

  return (
    <div className="admin-panel">
      <Header />
      <div className="admin-content">
        <Sidebar />
        <main className="main-content">
          <section className="stats">
            <div className="stat-card">
              <h3>Total Users</h3>
              <p>{stats.totalUsers}</p>
            </div>
            <div className="stat-card">
              <h3>Total Videos</h3>
              <p>{stats.totalVideos}</p>
            </div>
            <div className="stat-card">
              <h3>Posted Videos</h3>
              <p>{stats.postedVideos}</p>
            </div>
          </section>

          <section className="users-section">
            <h2>Users</h2>
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.name}</td>
                    <td>{user.role}</td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
