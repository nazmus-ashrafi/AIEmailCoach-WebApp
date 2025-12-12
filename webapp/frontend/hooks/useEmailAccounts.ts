/**
 * React Query hook for fetching email accounts
 */

import { useQuery } from "@tanstack/react-query";
import { emailAccountsClient } from "@/utils/email-accounts-client";
import type { EmailAccount } from "@/types/email-account";

export function useEmailAccounts() {
    return useQuery<EmailAccount[], Error>({
        queryKey: ["accounts"],
        queryFn: async () => {
            const data = await emailAccountsClient.getAccounts();
            return data.accounts; // Extract just the accounts array
        },
        staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
        retry: 2, // Retry failed requests twice
    });
}
