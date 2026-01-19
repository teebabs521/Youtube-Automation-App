import React from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { toggleTheme, toggleSidebar } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import '../../styles/Layout.css';

export const Header: React.FC = () => {
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector((state) => state.ui);
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    dispatch(logout());
    window.location.href = '/login';
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="sidebar-toggle" onClick={() => dispatch(toggleSidebar())}>
          ☰
        </button>
        <h1>YouTube AutoPost</h1>
      </div>
      <div className="header-right">
        <button className="theme-toggle" onClick={() => dispatch(toggleTheme())}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <div className="user-menu">
          <span>{user?.name}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
};

export default Header;