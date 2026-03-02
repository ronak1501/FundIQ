import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('mf_user');
        return stored ? JSON.parse(stored) : null;
    });
    const [loading, setLoading] = useState(false);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('mf_token', data.token);
        localStorage.setItem('mf_user', JSON.stringify(data.user));
        setUser(data.user);
        return data;
    };

    const register = async (name, email, password, riskProfile) => {
        const { data } = await api.post('/auth/register', { name, email, password, riskProfile });
        localStorage.setItem('mf_token', data.token);
        localStorage.setItem('mf_user', JSON.stringify(data.user));
        setUser(data.user);
        return data;
    };

    const logout = () => {
        localStorage.removeItem('mf_token');
        localStorage.removeItem('mf_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
