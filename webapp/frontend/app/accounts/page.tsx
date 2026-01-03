"use client";

/**
 * Email Accounts Management Page
 * 
 * Main dashboard for managing connected email accounts.
 */

import { ProtectedRoute } from '@/components/auth/protected-route';
import { UserMenu } from '@/components/auth/user-menu';
import { ConnectAccountButton } from '@/components/accounts/connect-account-button';
import { AccountCard } from '@/components/accounts/account-card';
import { useEmailAccounts } from '@/hooks/useEmailAccounts';

function AccountsPageContent() {
    // React Query handles all state management, loading, errors, and refetching automatically
    const { data: accounts = [], isLoading, error } = useEmailAccounts();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black">
                <nav className="bg-stone-900 border-b border-stone-800 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <a href="/" className="flex items-center gap-2 text-2xl font-bold text-white">
                            <img src="/logo.png" alt="ProfEmail Logo" className="w-8 h-8" />
                            ProfEmail
                        </a>
                        <UserMenu />
                    </div>
                </nav>
                <div className="p-6">
                    <p className="text-stone-400">Loading accounts...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black">
                <nav className="bg-stone-900 border-b border-stone-800 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <a href="/" className="flex items-center gap-2 text-2xl font-bold text-white">
                            <img src="/logo.png" alt="ProfEmail Logo" className="w-8 h-8" />
                            ProfEmail
                        </a>
                        <UserMenu />
                    </div>
                </nav>
                <div className="p-6">
                    <p className="text-red-400">{error?.message || 'Failed to load email accounts'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            {/* Navigation Bar */}
            <nav className="bg-stone-900 border-b border-stone-800 px-6 py-4">
                <div className="flex items-center justify-between">
                    <a href="/" className="flex items-center gap-2 text-2xl font-bold text-white">
                        <img src="/logo.png" alt="ProfEmail Logo" className="w-8 h-8" />
                        ProfEmail
                    </a>
                    <UserMenu />
                </div>
            </nav>

            {/* Main Content */}
            <div className="p-6 max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-white">Email Accounts</h2>
                        <p className="text-stone-400 mt-1">
                            Manage your connected email accounts
                        </p>
                    </div>
                    <ConnectAccountButton />
                </div>

                {/* Accounts List */}
                {accounts.length === 0 ? (
                    <div className="bg-stone-900 border border-stone-800 rounded-lg p-12 text-center">
                        <svg
                            className="mx-auto w-16 h-16 text-stone-600 mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                        </svg>
                        <h3 className="text-xl font-semibold text-stone-300 mb-2">
                            No email accounts connected yet
                        </h3>
                        <p className="text-stone-500 mb-6">
                            Connect your Outlook or Gmail account to get started
                        </p>
                        <ConnectAccountButton />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {accounts.map((account) => (
                            <AccountCard
                                key={account.id}
                                account={account}
                                onDelete={() => { }} // No-op: React Query auto-invalidates via useDeleteAccount
                                onSync={() => { }} // No-op: React Query auto-invalidates via useSyncAccount
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AccountsPage() {
    return (
        <ProtectedRoute>
            <AccountsPageContent />
        </ProtectedRoute>
    );
}
