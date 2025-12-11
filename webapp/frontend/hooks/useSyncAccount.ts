import { useMutation, useQueryClient } from '@tanstack/react-query';
import { emailAccountsClient } from '@/utils/email-accounts-client';

export function useSyncAccount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (accountId: string) => emailAccountsClient.syncAccount(accountId),
        onSuccess: (data, accountId) => {
            // Invalidate conversations cache for this account
            // Invalidate means that cache labeled ['conversations', 'account-123'] is now STALE. 
            // RQ will throw it away and automatically re-fetch fresh data from the backend ✨
            queryClient.invalidateQueries({
                queryKey: ['conversations', accountId],
            });

            // Also invalidate without account filter (for "all emails" view)
            queryClient.invalidateQueries({
                queryKey: ['conversations', undefined],
            });
        },
    });
}