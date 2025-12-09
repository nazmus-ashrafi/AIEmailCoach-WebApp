/**
 * API client functions for conversation operations
 */

import { Conversation } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchConversations(accountId?: string): Promise<Conversation[]> {
    const url = accountId
        ? `${API_BASE_URL}/api/emails/conversations?account_id=${accountId}`
        : `${API_BASE_URL}/api/emails/conversations`;

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

export async function fetchConversation(emailId: number): Promise<Conversation> {
    const response = await fetch(
        `${API_BASE_URL}/api/emails/${emailId}`,
        { cache: "no-store" }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.status}`);
    }

    return response.json();
}
