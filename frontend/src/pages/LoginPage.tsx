import React, { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setUser, setToken } from '../store/slices/authSlice';
import { authAPI } from '../services/api';
import '../styles/Login.css';

export const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { token } = useAppSelector((state) => state.auth);
  
  const [error, setError] = useState<string | null>(null);
  const [deniedEmail, setDeniedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Clear expired tokens on mount
  useEffect(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  // Check localStorage on initial load
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    if (savedToken && !token) {
      dispatch(setToken(savedToken));
      const savedUser = localStorage.getItem('authUser');
      if (savedUser) {
        dispatch(setUser(JSON.parse(savedUser)));
      }
    }
  }, [dispatch, token]);

  // Navigate only when token changes (after login)
  useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError(null);
    setDeniedEmail(null);

    try {
      const response = await authAPI.loginWithGoogle(credentialResponse.credential);
      const { user, token: accessToken } = response.data;

      // Clear old tokens first
      localStorage.removeItem('token');

      // Save new tokens
      localStorage.setItem('authToken', accessToken);
      localStorage.setItem('authUser', JSON.stringify(user));
      localStorage.setItem('token', accessToken);

      // Update Redux
      dispatch(setUser(user));
      dispatch(setToken(accessToken));
    } catch (error: any) {
      console.error('Login failed:', error);

      if (error.response?.status === 403) {
        // Access denied - email not in whitelist
        setError(error.response.data.message || 'Your email is not authorized to use this application.');
        setDeniedEmail(error.response.data.email || null);
      } else if (error.response?.status === 401) {
        setError('Authentication failed. Please try again.');
      } else if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error('Google Login Failed');
    setError('Google login failed. Please try again.');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🎬 YouTube AutoPost</h1>
          <p>Automate your video posting across multiple channels</p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid #ff6b6b',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            <div style={{ 
              color: '#ff6b6b', 
              fontSize: '14px',
              marginBottom: deniedEmail ? '10px' : '0',
            }}>
              ⚠️ {error}
            </div>
            
            {deniedEmail && (
              <div style={{
                color: '#888',
                fontSize: '12px',
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                padding: '8px',
                borderRadius: '4px',
                marginTop: '10px',
              }}>
                Email: {deniedEmail}
              </div>
            )}
            
            <div style={{
              color: '#888',
              fontSize: '12px',
              marginTop: '10px',
            }}>
              Please contact the administrator to request access.
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#0096ff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ color: '#888', marginTop: '15px', fontSize: '14px' }}>
              Signing in...
            </p>
          </div>
        ) : (
          <div className="login-button-container">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_black"
              size="large"
              text="signin_with"
              shape="rectangular"
              width="300"
            />
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
        }}>
          <p style={{ color: '#666', fontSize: '12px', margin: 0 }}>
            Only authorized users can access this application.
          </p>
          <p style={{ color: '#555', fontSize: '11px', marginTop: '5px' }}>
            Contact the administrator on info@diversitytech.com.ng if you need access.
          </p>
        </div>
      </div>

      {/* CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default LoginPage;