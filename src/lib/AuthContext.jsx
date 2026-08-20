import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { appClient } from '@/api/appClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [isLoadingAuth, setLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const checkUserAuth = useCallback(async () => {
    setLoadingAuth(true);
    try {
      const current = await appClient.auth.me();
      setUser(current);
      setAuthenticated(true);
      setAuthError(null);
    } catch {
      setUser(null);
      setAuthenticated(false);
      setAuthError({ type: 'auth_required' });
    } finally {
      setLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => { checkUserAuth(); }, [checkUserAuth]);

  const logout = () => {
    appClient.auth.logout();
    setUser(null);
    setAuthenticated(false);
    setAuthError({ type: 'auth_required' });
  };

  return <AuthContext.Provider value={{
    user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings: false, authError,
    appPublicSettings: null, authChecked, logout, checkUserAuth,
    checkAppState: checkUserAuth,
  }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
