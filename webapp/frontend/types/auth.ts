/**
 * Authentication type definitions
 */

export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    created_at: string;
    updated_at: string;
}

export interface AuthTokens {
    access_token: string;
    token_type: string;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
}

export interface UpdateProfileData {
    first_name?: string;
    last_name?: string;
    email?: string;
}

export interface ChangePasswordData {
    current_password: string;
    new_password: string;
    new_password_confirm: string;
}
