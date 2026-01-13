import React, { useEffect } from 'react';
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

  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const response = await authAPI.loginWithGoogle(credentialResponse.credential);
      dispatch(setUser(response.data.user));
      dispatch(setToken(response.data.accessToken));
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>YouTube AutoPost</h1>
        <p>Automate your video posting across multiple channels</p>
        <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => console.log('Login Failed')} />
      </div>
    </div>
  );
};

export default LoginPage;
