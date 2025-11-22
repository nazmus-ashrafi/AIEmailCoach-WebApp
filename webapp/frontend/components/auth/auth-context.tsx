"use client";

/**
 * Authentication Context - Global auth state management
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authClient, tokenManager } from '@/utils/auth-client';
import type { User, AuthState, LoginCredentials, RegisterData } from '@/types/auth';

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = user !== null;

    /**
     * Load user from token on mount
     */
    useEffect(() => {
        async function loadUser() {
            if (!tokenManager.exists()) {
                setIsLoading(false);
                return;
            }

            try {
                const userData = await authClient.getCurrentUser();
                setUser(userData);
            } catch (error) {
                console.error('Failed to load user:', error);
                tokenManager.remove();
            } finally {
                setIsLoading(false);
            }
        }

        loadUser();
    }, []);

    /**
     * Login user
     */
    const login = useCallback(async (credentials: LoginCredentials) => {
        setIsLoading(true);
        try {
            await authClient.login(credentials);
            const userData = await authClient.getCurrentUser();
            setUser(userData);
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
        setIsLoading(false);
    }, []);

    /**
     * Register new user and auto-login
     */
    const register = useCallback(async (data: RegisterData) => {
        setIsLoading(true);
        try {
            await authClient.register(data);
            // Auto-login after registration
            await login({ email: data.email, password: data.password });
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    }, [login]);

    /**
     * Logout user
     */
    const logout = useCallback(() => {
        authClient.logout();
        setUser(null);
    }, []);

    /**
     * Refresh user data
     */
    const refreshUser = useCallback(async () => {
        if (!tokenManager.exists()) return;

        try {
            const userData = await authClient.getCurrentUser();
            setUser(userData);
        } catch (error) {
            console.error('Failed to refresh user:', error);
            logout();
        }
    }, [logout]);

    const value: AuthContextType = {
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
