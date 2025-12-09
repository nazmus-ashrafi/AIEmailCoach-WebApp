/**
 * React Query hook for fetching conversations
 */

import { useQuery } from "@tanstack/react-query";
import { fetchConversations } from "@/utils/conversations-api";
import { Conversation } from "@/types/api";

export function useConversations(accountId?: string) {
    return useQuery<Conversation[], Error>({
        queryKey: ["conversations", accountId],
        queryFn: () => fetchConversations(accountId),
    });
}
