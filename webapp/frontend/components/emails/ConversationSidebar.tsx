"use client";

import { useEffect, useState } from "react";
import ConversationList, { Conversation } from "@/components/emails/ConversationList";
import { cleanEmailPreview, getBadgeColor } from "@/utils/email-utils";

interface ConversationSidebarProps {
    accountId?: string;
}

export default function ConversationSidebar({ accountId }: ConversationSidebarProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchConversations() {
            try {
                const url = accountId
                    ? `http://localhost:8000/api/emails/conversations?account_id=${accountId}`
                    : "http://localhost:8000/api/emails/conversations";

                const res = await fetch(url, { cache: "no-store" });
                if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
                const data = await res.json();
                setConversations(Array.isArray(data) ? data : []);
            } catch (err: any) {
                console.error(err);
                setError("Failed to fetch conversations.");
            } finally {
                setLoading(false);
            }
        }
        fetchConversations();
    }, [accountId]);

    if (loading) {
        return <p className="text-stone-400 text-sm">Loading conversations...</p>;
    }

    if (error) {
        return <p className="text-red-400 text-sm">{error}</p>;
    }

    return (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Conversations</h2>
            <ConversationList
                conversations={conversations}
                getBadgeColor={getBadgeColor}
                cleanEmailPreview={cleanEmailPreview}
            />
        </div>
    );
}
