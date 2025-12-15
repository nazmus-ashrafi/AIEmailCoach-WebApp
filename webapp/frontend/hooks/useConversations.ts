/**
 * React Query hook for fetching conversations
 */

import { useQuery } from "@tanstack/react-query";
import { fetchConversations } from "@/utils/conversations-api";
import { Conversation } from "@/types/api";
import { useAuth } from "@/components/auth/auth-context";

export function useConversations(accountId?: string) {
    const { user } = useAuth();

    return useQuery<Conversation[], Error>({
        queryKey: ["conversations", accountId, user?.id], // Include user ID to prevent cache sharing
        queryFn: () => fetchConversations(accountId),
        enabled: !!user, // Only run when authenticated
    });
}
