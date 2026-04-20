import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('alars_token');
    const storedUser = localStorage.getItem('alars_user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      // Set default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const response = await axios.post(`${API_BASE}/auth/login`, { username, password });
    const { token, user } = response.data;
    
    localStorage.setItem('alars_token', token);
    localStorage.setItem('alars_user', JSON.stringify(user));
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('alars_token');
    localStorage.removeItem('alars_user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
