/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('dashq_user');
    if (storedUser) {
      try { return JSON.parse(storedUser); } catch {}
    }
    return {
      name: 'Invitado',
      username: 'invitado',
      email: '',
      phone: '',
      role: 'Invitado',
      permissions: { read: true, write: false, rename: false, copy: false, move: false, tag: false, delete: false, print: false }
    };
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('dashq_auth') === 'true' || sessionStorage.getItem('dashq_auth') === 'true';
  });

  // Keep effect just in case we need to sync across tabs later, but state is now sync
  useEffect(() => {
    // empty effect
  }, []);

  const updateUser = (newUserData) => {
    const updated = { ...user, ...newUserData };
    setUser(updated);
    localStorage.setItem('dashq_user', JSON.stringify(updated));
  };

  const login = (userData, rememberMe) => {
    updateUser(userData);
    setIsAuthenticated(true);
    if (rememberMe) {
      localStorage.setItem('dashq_auth', 'true');
    } else {
      sessionStorage.setItem('dashq_auth', 'true');
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('dashq_auth');
    sessionStorage.removeItem('dashq_auth');
  };

  return (
    <AuthContext.Provider value={{ user, updateUser, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
