import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = sessionStorage.getItem('hostel_token');
        const savedUser = sessionStorage.getItem('hostel_user');

        if (token && savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                const userObj = { ...parsedUser, token };
                setUser(userObj);
                // Background refresh to sync any DB updates (like verified phone)
                refreshUser(userObj).catch(console.error);
            } catch (err) {
                sessionStorage.removeItem('hostel_token');
                sessionStorage.removeItem('hostel_user');
            }
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        sessionStorage.setItem('hostel_token', userData.token);
        sessionStorage.setItem('hostel_user', JSON.stringify(userData));
        setUser(userData);

        // Role-based redirection
        if (userData.role?.toLowerCase() === 'warden') {
            navigate('/dashboard');
        } else if (userData.role?.toLowerCase() === 'admin') {
            navigate('/admin/dashboard');
        } else if (userData.role?.toLowerCase() === 'financial') {
            navigate('/financial/dashboard');
        } else if (userData.role?.toLowerCase() === 'security') {
            navigate('/security/dashboard');
        } else if (userData.role?.toLowerCase() === 'student') {
            navigate('/student');
        } else {
            navigate('/');
        }
    };

    const refreshUser = async (currentUser = user) => {
        const token = currentUser?.token || sessionStorage.getItem('hostel_token');
        if (!token) return;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await res.json();
            if (data.success) {
                const updatedUser = { ...data.data, token: token };
                sessionStorage.setItem('hostel_user', JSON.stringify(updatedUser));
                setUser(updatedUser);
            }
        } catch (err) {
            console.error('Error refreshing user:', err);
        }
    };

    const logout = () => {
        sessionStorage.clear();
        setUser(null);
        navigate('/');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, refreshUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
