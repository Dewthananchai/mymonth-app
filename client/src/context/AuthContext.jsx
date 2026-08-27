import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('mymonth_token'));
  const [room, setRoom] = useState(null);
  const [roomMembers, setRoomMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load user profile if token exists
  useEffect(() => {
    if (token) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await api.get('/auth/me');
      setUser(data.user);
      setRoom(data.room);
      setRoomMembers(data.roomMembers || []);
    } catch (err) {
      console.error('Failed to load profile:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, room_code) => {
    const data = await api.post('/auth/login', { email, password, room_code });
    localStorage.setItem('mymonth_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const googleLogin = async (info) => {
    const data = await api.post('/auth/google-login', info);
    localStorage.setItem('mymonth_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (formData) => {
    const data = await api.post('/auth/register', formData);
    localStorage.setItem('mymonth_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const joinRoom = async (room_code) => {
    const data = await api.post('/auth/join-room', { room_code });
    localStorage.setItem('mymonth_token', data.token);
    setToken(data.token);
    setUser(data.user);
    await loadProfile();
    return data;
  };

  const updateProfile = async (updates) => {
    const data = await api.put('/auth/profile', updates);
    setUser(data.user);
    await loadProfile();
    return data;
  };

  const logout = () => {
    localStorage.removeItem('mymonth_token');
    setToken(null);
    setUser(null);
    setRoom(null);
    setRoomMembers([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        room,
        roomMembers,
        setRoomMembers,
        loading,
        login,
        googleLogin,
        register,
        joinRoom,
        updateProfile,
        logout,
        refreshProfile: loadProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
