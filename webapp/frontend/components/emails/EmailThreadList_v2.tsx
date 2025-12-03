"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Loader2, Mail, Clock, User } from "lucide-react";
import { EmailContentRenderer } from "./EmailContentRenderer";

interface Email {
    id: number;
    author: string;
    to: string;
    subject: string;
    email_thread_text: string;
    email_thread_html: string;
    message_id?: string;
    conversation_id?: string;
    received_at?: string;
    created_at?: string;
}

interface EmailThreadListProps {
    emailId: number;
}

function formatDateTime(dateString?: string) {
    if (!dateString) return "No date";

    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    // If less than 24 hours ago, show relative time
    if (diffInHours < 24) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Otherwise show date
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit'
    });
}

function cleanEmailContent(text: string) {
    return text
        .replace(/\s+/g, " ")        // compress whitespace
        .replace(/^From:.*?$/gmi, "") // remove headers
        .replace(/^To:.*?$/gmi, "")
        .replace(/^Date:.*?$/gmi, "")
        .replace(/^Subject:.*?$/gmi, "")
        .trim();
}

export function EmailThreadList({ emailId }: EmailThreadListProps) {
    const [thread, setThread] = useState<Email[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchThread() {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`http://localhost:8000/api/emails/${emailId}/thread`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch thread: ${response.statusText}`);
                }

                const data = await response.json();
                setThread(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load thread");
                console.error("Error fetching thread:", err);
            } finally {
                setLoading(false);
            }
        }

        if (emailId) {
            fetchThread();
        }
    }, [emailId]);

    if (loading) {
        return (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-stone-800">
                    <h2 className="text-lg font-semibold text-white">Email Thread</h2>
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
                    <h2 className="text-lg font-semibold text-white">Email Thread</h2>
                </div>
                <div className="p-8 text-center">
                    <p className="text-red-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-stone-800">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Thread
                </h2>
                <p className="text-sm text-stone-400 mt-1">
                    {thread.length} {thread.length === 1 ? "message" : "messages"}
                </p>
            </div>

            <ScrollArea className="h-[600px]">
                <div className="p-4 space-y-4">
                    {thread.length === 0 ? (
                        <p className="text-stone-400 text-center py-8">No messages in this thread.</p>
                    ) : (
                        thread.map((email, index) => {
                            const isCurrentEmail = email.id === emailId;

                            return (
                                <Card
                                    key={email.id}
                                    className={`
                                        bg-stone-800 border-stone-700 
                                        transition-all duration-300
                                        hover:bg-stone-750 hover:border-stone-600
                                        ${isCurrentEmail ? "ring-2 ring-blue-500 bg-stone-750" : ""}
                                    `}
                                >
                                    {/* Email Header */}
                                    <div className="p-4 border-b border-stone-700/50">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <User className="h-4 w-4 text-stone-400 shrink-0" />
                                                    <p className="text-sm font-semibold text-white truncate">
                                                        {email.author}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-stone-500 truncate">
                                                    To: {email.to}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-1.5 text-xs text-stone-400 shrink-0">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span>{formatDateTime(email.received_at || email.created_at)}</span>
                                            </div>
                                        </div>

                                        {index === 0 && (
                                            <h3 className="text-sm font-medium text-stone-200 mt-3">
                                                {email.subject}
                                            </h3>
                                        )}
                                    </div>

                                    {/* Email Content */}
                                    <EmailContentRenderer email={email} />

                                    {/* Current Email Indicator */}
                                    {isCurrentEmail && (
                                        <div className="px-4 pb-3">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full">
                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                                <span className="text-xs text-blue-400 font-medium">Current Email</span>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
