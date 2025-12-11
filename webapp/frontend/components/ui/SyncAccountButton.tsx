"use client";
import { useEffect } from 'react';
import { useSyncAccount } from '@/hooks/useSyncAccount'; // custom hook
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';

interface SyncAccountButtonProps {
    accountId?: string; // Optional - may be undefined if no account selected
}

export function SyncAccountButton({ accountId }: SyncAccountButtonProps) {
    const { mutate: syncAccount, isPending, isError, isSuccess, data, reset } = useSyncAccount();

    // Auto-dismiss success/error messages after 5 seconds
    useEffect(() => {
        if (isSuccess || isError) {
            const timer = setTimeout(() => {
                reset(); // Clear mutation state
            }, 5000);

            return () => clearTimeout(timer); // Cleanup on unmount
        }
    }, [isSuccess, isError, reset]);

    const handleSync = () => {
        if (!accountId) {
            alert('No account selected. Please select an account first.');
            return;
        }
        syncAccount(accountId);
    };
    return (
        <div className="flex flex-col gap-2">
            <Button
                onClick={handleSync}
                disabled={isPending || !accountId}
                title={!accountId ? "Select an account to sync" : "Sync this account"}
                className="w-full bg-stone-700 hover:bg-stone-600 text-white"
            >
                {isPending ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                    </>
                ) : (
                    <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync Account
                    </>
                )}
            </Button>
            {isSuccess && data && (
                <p className="text-xs text-green-400">
                    ✓ Synced: {data.inserted} new, {data.updated} updated, {data.deleted} deleted
                </p>
            )}
            {isError && (
                <p className="text-xs text-red-400">
                    ✗ Sync failed. Please try again.
                </p>
            )}
        </div>
    );
}