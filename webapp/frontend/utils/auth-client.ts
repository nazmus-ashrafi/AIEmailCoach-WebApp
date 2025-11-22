/**
 * Authentication API client
 */

/**
 File Purpose: The Authentication Specialist
This file is the middleman between the app's frontend and the backend's auth endpoints. It has two main jobs:

1) Token Management - Store, retrieve, and delete the JWT token
2) Auth API Calls - Handle login, register, profile operations with proper formatting
 */

import { api } from './api-client';
import type {
    User,
    AuthTokens,
    LoginCredentials,
    RegisterData,
    UpdateProfileData,
    ChangePasswordData,
} from '@/types/auth';

const TOKEN_KEY = 'auth_token';

/**
 * Token management
- facade pattern - a simple interface that hides the complexity of token storage.
 */
export const tokenManager = {
    get: (): string | null => {
        // server-side rendering (Server (Node.js) - Has no window object)
        // null is returned to prevent errors (its a safe exit)
        if (typeof window === 'undefined') return null;
        // client-side rendering (Client (Browser) - Has window object)
        // Returns actual token from localStorage
        return localStorage.getItem(TOKEN_KEY);
    },


    // token: string = JWT token string from the backend
    set: (token: string): void => {
        if (typeof window !== 'undefined') {
            // On server: Silently does nothing (safe)
            // On browser: Stores the token
            localStorage.setItem(TOKEN_KEY, token);
        }
    },

    remove: (): void => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(TOKEN_KEY);
        }
    },

    exists: (): boolean => {
        return tokenManager.get() !== null;
    },
};

/**
 * Auth API endpoints
 */
export const authClient = {
    /**
     * Register a new user
     */
    // await as API call takes time
    register: async (data: RegisterData): Promise<void> => {
        await api.post('/api/auth/register', data);
    },

    /**
     * Login with email and password
     * Returns JWT token
      {
        access_token: 'eyJhbG...',
        token_type: 'bearer'
      }
     */
    login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
        // OAuth2 Password Flow - OAuth2 password flow requires form data
        const formData = new URLSearchParams();
        formData.append('username', credentials.email);
        formData.append('password', credentials.password);
        formData.append('grant_type', 'password');

        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/token`, // URL needs to be put in .env file, when production
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'Login failed');
        }

        const tokens: AuthTokens = await response.json();

        // Store Access token
        tokenManager.set(tokens.access_token);

        return tokens;
    },

    /**
     * Get current user info
     */
    getCurrentUser: async (): Promise<User> => {
        return api.get<User>('/api/users/me', true);
    },

    /**
     * Update user profile
     */
    updateProfile: async (data: UpdateProfileData): Promise<User> => {
        return api.put<User>('/api/users/me', data, true);
    },

    /**
     * Change password
     */
    changePassword: async (data: ChangePasswordData): Promise<void> => {
        await api.put('/api/users/me/password', data, true);
    },

    /**
     * Delete user account
     */
    deleteAccount: async (): Promise<void> => {
        await api.delete('/api/users/me', true);
        tokenManager.remove();
    },

    /**
     * Logout - clear token
     */
    logout: (): void => {
        tokenManager.remove();
    },
};
