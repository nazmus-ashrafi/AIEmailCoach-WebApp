"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface Conversation {
    conversation_id?: string;
    most_recent_email_id: string;
    subject: string;
    most_recent_date: string;
    account_email: string;
    message_count: number;
    classification?: string;
    participants: string[];
    preview_text?: string;
}

interface Props {
    conversations: Conversation[];
    getBadgeColor: (classification?: string) => string;
    cleanEmailPreview: (text: string) => string;
}

export default function ConversationList({
    conversations,
    getBadgeColor,
    cleanEmailPreview,
}: Props) {
    if (!conversations || conversations.length === 0) {
        return <p className="text-gray-400">No conversations found.</p>;
    }

    return (
        <div className="grid gap-4">
            {conversations.map((conversation) => (
                <Link
                    href={`/emails/${conversation.most_recent_email_id}`}
                    key={conversation.conversation_id || conversation.most_recent_email_id}
                >
                    <Card className="bg-stone-900 border-stone-800 p-4 hover:bg-stone-800 transition-colors duration-200">
                        <CardHeader className="flex flex-row justify-between items-start p-0">
                            <CardTitle className="text-lg font-semibold text-white flex-1 pr-4">
                                {conversation.subject}
                            </CardTitle>

                            <div className="flex gap-2 items-center shrink-0">
                                <span className="text-xs text-stone-400">
                                    {new Date(conversation.most_recent_date).toLocaleString()}
                                </span>

                                <Badge className="bg-purple-600/20 text-purple-300 border border-purple-600/30 text-xs">
                                    {conversation.account_email}
                                </Badge>

                                {conversation.message_count > 1 && (
                                    <Badge className="bg-blue-600 text-white text-xs">
                                        {conversation.message_count} messages
                                    </Badge>
                                )}

                                <Badge
                                    className={`${getBadgeColor(conversation.classification)} uppercase text-xs`}
                                >
                                    {conversation.classification || "TBD"}
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0 mt-3">
                            <p className="text-sm text-stone-400">
                                <strong className="text-stone-300">Participants:</strong>{" "}
                                {conversation.participants.slice(0, 3).join(", ")}
                                {conversation.participants.length > 3 &&
                                    ` +${conversation.participants.length - 3} more`}
                            </p>

                            <p className="text-sm mt-2 line-clamp-3 text-stone-300">
                                {cleanEmailPreview(conversation.preview_text || "")}
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}