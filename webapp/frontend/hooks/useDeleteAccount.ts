/**
 * React Query hook for deleting an email account
 */

import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { emailAccountsClient } from "@/utils/email-accounts-client";


export function useDeleteAccount() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (accountId: string) =>
            emailAccountsClient.deleteAccount(accountId),

        onSuccess: (data, deletedAccountId) => {
            // 1. Invalidate the accounts list for all users (uses wildcard to match any user ID)
            // Invalidate means that cache labeled ['accounts', userId] is now STALE. 
            // RQ will throw it away and automatically re-fetch fresh data from the backend ✨
            queryClient.invalidateQueries({
                queryKey: ["accounts"] // This will match ["accounts", userId] for any userId
            });

            // 2. Invalidate ALL conversations for the deleted account
            // Mark the cache as stale and signal to React Query that this data is invalid.
            // This ensures any components currently using this data are notified of the change.
            queryClient.invalidateQueries({
                queryKey: ["conversations", deletedAccountId]
            });

            // 3. Remove conversations from cache entirely (more aggressive)
            // Completely purge the deleted account's conversations from memory.
            // This prevents any future access attempts and ensures the data is truly gone (will not work because the account is gone).
            // Together with step 2, this provides both notification (invalidate) and cleanup (remove).
            queryClient.removeQueries({
                queryKey: ["conversations", deletedAccountId]
            });

            // 4. Invalidate all conversations (if user was viewing "all accounts")
            // Invalidate means that cache labeled ['conversations', undefined] is now STALE. 
            queryClient.invalidateQueries({
                queryKey: ["conversations", undefined]
            });
        },
    });
}