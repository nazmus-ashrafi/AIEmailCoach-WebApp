"use client";

/**
 * Connect Account Button Component
 * 
 * Button to initiate OAuth2 flow for connecting email accounts.
 */

import { Button } from '@/components/ui/button';
import { emailAccountsClient } from '@/utils/email-accounts-client';
import { tokenManager } from '@/utils/auth-client';

export function ConnectAccountButton() {
    const handleConnectOutlook = () => {
        // Ensure user is authenticated
        const token = tokenManager.get();
        if (!token) {
            alert('Please login first');
            return;
        }
        // Redirect to backend "OAuth authorize endpoint" with token (token is send in the URL)
        const oauthUrl = `${emailAccountsClient.getOAuthUrl()}?token=${encodeURIComponent(token)}`;
        // Triggers the Backend Route `/api/email-accounts/oauth/authorize`
        window.location.href = oauthUrl;
    };

    return (
        <Button
            onClick={handleConnectOutlook}
            className="bg-blue-600 hover:bg-blue-700 text-white"
        >
            <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
            >
                {/* svg logo */}
                <path d="M23.5 12.3c0 .2 0 .4-.1.6-.1.2-.2.4-.4.5l-10.8 6.2c-.2.1-.4.2-.6.2s-.4-.1-.6-.2L.2 13.4c-.1-.1-.2-.3-.2-.5V11c0-.2.1-.4.2-.5l10.8-6.2c.2-.1.4-.2.6-.2s.4.1.6.2l10.8 6.2c.2.1.3.3.4.5.1.2.1.4.1.6v.7zM12 4.5L3.5 9.5 12 14.5l8.5-5L12 4.5zm9.5 6.2l-8.9 5.1v9.7l8.9-5.1v-9.7z" />
            </svg>
            Connect Outlook Account
        </Button>
    );
}
