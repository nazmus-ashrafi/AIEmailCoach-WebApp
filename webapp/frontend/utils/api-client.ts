/**
 * Base API client with authentication token injection
 * Base HTTP client that auto-injects auth tokens into requests. All API calls go through here.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
    requiresAuth?: boolean;
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
    // SSR-safe token retrieval
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
}

/**
 * Base fetch wrapper with auth token injection and error handling
 */
export async function apiClient<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const { requiresAuth = false, headers = {}, ...restOptions } = options;

    const config: RequestInit = {
        ...restOptions,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    };

    // Add auth token if required
    if (requiresAuth) {
        const token = getAuthToken();
        if (token) {
            config.headers = {
                ...config.headers,
                Authorization: `Bearer ${token}`,
            };
        }
    }

    const url = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, config);

        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401 && requiresAuth) {
            // Clear invalid token
            if (typeof window !== 'undefined') {
                localStorage.removeItem('auth_token');
            }
            // Redirect to login
            if (typeof window !== 'undefined') {
                window.location.href = '/auth/login';
            }
            throw new Error('Unauthorized - please login again');
        }

        // Handle other errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.detail || errorData.message || `HTTP ${response.status}`
            );
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return {} as T;
        }

        return await response.json();
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Network error - please try again');
    }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
    get: <T>(endpoint: string, requiresAuth = false) =>
        apiClient<T>(endpoint, { method: 'GET', requiresAuth }),

    post: <T>(endpoint: string, data?: any, requiresAuth = false) =>
        apiClient<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
            requiresAuth,
        }),

    put: <T>(endpoint: string, data?: any, requiresAuth = false) =>
        apiClient<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
            requiresAuth,
        }),

    delete: <T>(endpoint: string, requiresAuth = false) =>
        apiClient<T>(endpoint, { method: 'DELETE', requiresAuth }),
};
