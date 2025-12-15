/**
 * API client functions for conversation operations
 */

import { Conversation } from "@/types/api";
import { apiClient } from "./api-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchConversations(accountId?: string): Promise<Conversation[]> {
    const endpoint = accountId
        ? `/api/emails/conversations?account_id=${accountId}`
        : `/api/emails/conversations`;

    return apiClient<Conversation[]>(endpoint, {
        requiresAuth: true,
    });
}

export async function fetchConversation(emailId: number): Promise<Conversation> {
    return apiClient<Conversation>(`/api/emails/${emailId}`, {
        requiresAuth: true,
    });
}
