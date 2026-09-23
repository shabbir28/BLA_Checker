import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('bla_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('bla_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          setUser(res.data.user);
        } catch (err) {
          console.error('[AUTH] Token validation failed:', err);
          localStorage.removeItem('bla_token');
          localStorage.removeItem('bla_user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }

    loadUser();

    const handleLogoutEvent = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => window.removeEventListener('auth:logout', handleLogoutEvent);
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem('bla_token', receivedToken);
    localStorage.setItem('bla_user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const register = async (email, password, name) => {
    const res = await authApi.register({ email, password, name });
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem('bla_token', receivedToken);
    localStorage.setItem('bla_user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const logout = () => {
    localStorage.removeItem('bla_token');
    localStorage.removeItem('bla_user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      setUser(res.data.user);
      localStorage.setItem('bla_user', JSON.stringify(res.data.user));
    } catch (e) {
      console.error('[AUTH] Failed to refresh user profile:', e);
    }
  };

  const value = {
    user,
    token,
    loading,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
