import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

export const YouTubeCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing YouTube authorization...');

  useEffect(() => {
    const handleCallback = async () => {
      const error = searchParams.get('error');
      const success = searchParams.get('success');
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');
      const expiryDate = searchParams.get('expiryDate');

      if (error) {
        setStatus('error');
        setMessage(`Authorization failed: ${error}`);
        // Close popup after delay
        setTimeout(() => window.close(), 3000);
        return;
      }

      if (success === 'true' && accessToken) {
        try {
          // Store tokens via API
          await api.post('/youtube/store-tokens', {
            accessToken,
            refreshToken,
            expiryDate: expiryDate ? parseInt(expiryDate) : null,
          });

          setStatus('success');
          setMessage('YouTube authorized successfully! This window will close...');
          
          // Close popup after short delay
          setTimeout(() => window.close(), 2000);
        } catch (err) {
          console.error('Failed to store tokens:', err);
          setStatus('error');
          setMessage('Failed to store tokens. Please try again.');
          setTimeout(() => window.close(), 3000);
        }
      } else {
        setStatus('error');
        setMessage('Invalid callback. Please try again.');
        setTimeout(() => window.close(), 3000);
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#1a1a2e',
      color: 'white',
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '20px',
    }}>
      {status === 'loading' && (
        <>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '20px',
            animation: 'spin 1s linear infinite',
          }}>
            ⏳
          </div>
          <h2>Processing...</h2>
          <p style={{ color: '#aaa' }}>{message}</p>
        </>
      )}
      
      {status === 'success' && (
        <>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ color: '#4caf50' }}>Success!</h2>
          <p style={{ color: '#aaa' }}>{message}</p>
        </>
      )}
      
      {status === 'error' && (
        <>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>❌</div>
          <h2 style={{ color: '#f44336' }}>Error</h2>
          <p style={{ color: '#aaa' }}>{message}</p>
          <button
            onClick={() => window.close()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#ff0000',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Close Window
          </button>
        </>
      )}

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default YouTubeCallback;