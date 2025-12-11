"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import ConversationList, { Conversation } from "@/components/emails/ConversationList";
import { cleanEmailPreview, getBadgeColor, searchConversation } from "@/utils/email-utils";
import { useConversations } from "@/hooks/useConversations";

interface ConversationSidebarProps {
    accountId?: string;
    selectedEmailId?: number;
    searchTerm?: string; // searchTerm is used to filter conversations
}

export default function ConversationSidebar({ accountId, selectedEmailId, searchTerm }: ConversationSidebarProps) {
    const { data: conversations = [], isLoading: loading, error } = useConversations(accountId);

    if (loading) {
        return (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-stone-800">
                    <h2 className="text-lg font-semibold text-white">Conversations</h2>
                </div>
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-stone-800">
                    <h2 className="text-lg font-semibold text-white">Conversations</h2>
                </div>
                <div className="p-8 text-center">
                    <p className="text-red-400">{error.message || "Failed to fetch conversations."}</p>
                </div>
            </div>
        );
    }



    // Filter conversations by subject if searchTerm is provided
    const filteredConversations = searchTerm
        ? conversations.filter((conv) =>
            searchConversation(conv, searchTerm)
        )
        : conversations;

    return (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-stone-800">
                <h2 className="text-lg font-semibold text-white">Conversations</h2>
                <p className="text-sm text-stone-400 mt-1">
                    {filteredConversations.length} {filteredConversations.length === 1 ? "conversation" : "conversations"}
                    {searchTerm && ` (filtered from ${conversations.length})`}
                </p>
            </div>

            {/* ScrollArea used to keep sidebar height fixed and match EmailThreadList design for consistency */}
            <ScrollArea className="h-[600px]">
                <div className="p-4">
                    <ConversationList
                        conversations={filteredConversations}
                        getBadgeColor={getBadgeColor}
                        cleanEmailPreview={cleanEmailPreview}
                        selectedEmailId={selectedEmailId}
                        accountId={accountId}
                    />
                </div>
            </ScrollArea>
        </div>
    );
}
