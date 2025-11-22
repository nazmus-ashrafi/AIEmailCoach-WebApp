/**
 * Email Account TypeScript Types
 */

export interface EmailAccount {
    id: string;
    provider: 'outlook' | 'google' | 'imap';
    email_address: string;
    created_at: string;
    access_token_expires_at: string | null;
}

export interface EmailAccountList {
    accounts: EmailAccount[];
}

export interface OAuthCallbackParams {
    success?: string;
    error?: string;
    existing?: string;
}
