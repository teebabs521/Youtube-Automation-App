import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { setUser, setToken } from '../../store/slices/authSlice';

interface PrivateRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, adminOnly = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector((state) => state.auth);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Only run once on mount
    if (isInitialized) return;

    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('authUser');

    // If we have saved auth, restore it
    if (savedToken && savedUser) {
      try {
        dispatch(setToken(savedToken));
        dispatch(setUser(JSON.parse(savedUser)));
        setIsInitialized(true);
        return;
      } catch (error) {
        console.error('Failed to restore auth:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      }
    }

    setIsInitialized(true);
  }, []);

  // After initialization, check auth
  useEffect(() => {
    if (!isInitialized) return;

    const hasAuth = token || localStorage.getItem('authToken');

    if (!hasAuth && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [isInitialized, token, navigate, location.pathname]);

  // Check admin access
  useEffect(() => {
    if (isInitialized && adminOnly && user && user.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [isInitialized, adminOnly, user, navigate]);

  // Don't render anything until initialized
  if (!isInitialized) {
    return null;
  }

  // Check if user has access
  const hasAuth = token || localStorage.getItem('authToken');
  if (!hasAuth) {
    return null;
  }

  if (adminOnly && user && user.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
};

export default PrivateRoute;