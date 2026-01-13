import React from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import '../../styles/Layout.css';

export const Sidebar: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { sidebarOpen } = useAppSelector((state) => state.ui);

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      <nav>
        <ul>
          <li>
            <Link to="/">📊 Dashboard</Link>
          </li>
          <li>
            <Link to="/videos">🎬 Videos</Link>
          </li>
          <li>
            <Link to="/schedules">⏰ Schedules</Link>
          </li>
          {user?.role === 'admin' && (
            <li>
              <Link to="/admin">⚙️ Admin</Link>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
