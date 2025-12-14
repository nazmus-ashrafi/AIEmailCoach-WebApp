/**
 * Email Accounts API Client
 * 
 * API methods for managing email accounts and OAuth2 flow.
 */

import { apiClient } from './api-client';
import type { EmailAccountList } from '@/types/email-account';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const emailAccountsClient = {
    /**
     * Get all email accounts for the current user
     */
    getAccounts: async (): Promise<EmailAccountList> => {
        return apiClient<EmailAccountList>('/api/email-accounts/', {
            requiresAuth: true,
        });
    },

    /**
     * Delete an email account
     */
    deleteAccount: async (accountId: string): Promise<{ message: string }> => {
        return apiClient<{ message: string }>(`/api/email-accounts/${accountId}`, {
            method: 'DELETE',
            requiresAuth: true,
        });
    },

    /**
     * Trigger sync for an email account
     */
    syncAccount: async (accountId: string): Promise<{ status: string; inserted: number; updated: number; deleted: number }> => {
        return apiClient<{ status: string; inserted: number; updated: number; deleted: number }>(`/api/emails/sync_outlook/${accountId}`, {
            method: 'POST',
            requiresAuth: true,
        });
    },

    /**
     * Get OAuth2 authorization URL (initiates OAuth flow)
     * This redirects to backend which then redirects to Microsoft
     */
    getOAuthUrl: (): string => {
        return `${API_BASE_URL}/api/email-accounts/oauth/authorize`;
    },
};
