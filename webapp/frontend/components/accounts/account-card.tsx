"use client";

/**
 * Account Card Component
 * 
 * Displays individual email account with sync and delete actions.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { EmailAccount } from '@/types/email-account';
import { emailAccountsClient } from '@/utils/email-accounts-client';

interface AccountCardProps {
    account: EmailAccount;
    onDelete: () => void;
    onSync: () => void;
}

export function AccountCard({ account, onDelete, onSync }: AccountCardProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await emailAccountsClient.deleteAccount(account.id);
            onDelete();
        } catch (error: any) {
            alert(error.message || 'Failed to delete account');
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await emailAccountsClient.syncAccount(account.id);
            onSync(); // Notify parent component of sync completion (does a console log in the parent component)
        } catch (error: any) {
            alert(error.message || 'Failed to sync account');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleViewInbox = () => {
        router.push(`/emails?account_id=${account.id}`);
    };

    const getProviderIcon = () => {
        switch (account.provider) {
            case 'outlook':
                return (
                    // Outlook SVG Icon
                    <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.5 12.3c0 .2 0 .4-.1.6-.1.2-.2.4-.4.5l-10.8 6.2c-.2.1-.4.2-.6.2s-.4-.1-.6-.2L.2 13.4c-.1-.1-.2-.3-.2-.5V11c0-.2.1-.4.2-.5l10.8-6.2c.2-.1.4-.2.6-.2s.4.1.6.2l10.8 6.2c.2.1.3.3.4.5.1.2.1.4.1.6v.7zM12 4.5L3.5 9.5 12 14.5l8.5-5L12 4.5zm9.5 6.2l-8.9 5.1v9.7l8.9-5.1v-9.7z" />
                    </svg>
                );
            case 'google':
                return (
                    // Gmail SVG Icon
                    <svg className="w-8 h-8" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-8 h-8 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                );
        }
    };

    return (
        <Card className="bg-stone-900 border-stone-800">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handleViewInbox}
                    >
                        {getProviderIcon()}
                        <div>
                            <CardTitle className="text-lg text-white">{account.email_address}</CardTitle>
                            <p className="text-sm text-stone-400 capitalize">{account.provider}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleViewInbox}
                            size="sm"
                            className="bg-blue-700 hover:bg-blue-600 text-white"
                        >
                            View Inbox
                        </Button>

                        <Button
                            onClick={handleSync}
                            disabled={isSyncing}
                            size="sm"
                            className="bg-stone-700 hover:bg-stone-600 text-white"
                        >
                            {isSyncing ? 'Syncing...' : 'Sync'}
                        </Button>

                        {!showDeleteConfirm ? (
                            <Button
                                onClick={() => setShowDeleteConfirm(true)}
                                size="sm"
                                className="bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800"
                            >
                                Delete
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    size="sm"
                                    className="bg-red-900 hover:bg-red-800 text-white"
                                >
                                    {isDeleting ? 'Deleting...' : 'Confirm'}
                                </Button>
                                <Button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    size="sm"
                                    className="bg-stone-700 hover:bg-stone-600 text-white"
                                >
                                    Cancel
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                <div className="text-sm text-stone-500">
                    <p>Connected: {new Date(account.created_at).toLocaleDateString()}</p>
                </div>
            </CardContent>
        </Card>
    );
}
