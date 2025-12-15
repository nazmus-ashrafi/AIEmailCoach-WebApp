/**
 * React Query hook for fetching email accounts
 */

import { useQuery } from "@tanstack/react-query";
import { emailAccountsClient } from "@/utils/email-accounts-client";
import type { EmailAccount } from "@/types/email-account";
import { useAuth } from "@/components/auth/auth-context";

export function useEmailAccounts() {
    const { user } = useAuth();

    return useQuery<EmailAccount[], Error>({
        queryKey: ["accounts", user?.id], // Include user ID to prevent cache sharing between users
        queryFn: async () => {
            const data = await emailAccountsClient.getAccounts();
            return data.accounts; // Extract just the accounts array
        },
        staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
        retry: 2, // Retry failed requests twice
        enabled: !!user, // Only run query when user is authenticated
    });
}
