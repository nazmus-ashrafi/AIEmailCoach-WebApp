"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Email {
    id: number;
    author: string;
    to: string;
    subject: string;
    email_thread_text: string;
    email_thread_html: string;
    classification?: "ignore" | "notify" | "respond";
    created_at?: string;
}

interface EmailThreadListProps {
    emails: Email[];
    currentEmailId?: number;
}

function cleanEmailPreview(text: string) {
    return text
        .replace(/\s+/g, " ")        // compress whitespace
        .replace(/^From:.*?$/gmi, "") // remove headers
        .replace(/^To:.*?$/gmi, "")
        .replace(/^Date:.*?$/gmi, "")
        .replace(/^Subject:.*?$/gmi, "")
        .trim();
}

const getBadgeColor = (classification?: string) => {
    switch (classification) {
        case "respond":
            return "bg-stone-700 text-stone-200";
        case "notify":
            return "bg-stone-600 text-stone-200";
        case "ignore":
            return "bg-stone-800 text-stone-400";
        default:
            return "bg-stone-700 text-stone-300";
    }
};

export function EmailThreadList({ emails, currentEmailId }: EmailThreadListProps) {
    return (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-stone-800">
                <h2 className="text-lg font-semibold text-white">Email Threads</h2>
                <p className="text-sm text-stone-400">{emails.length} emails</p>
            </div>

            <ScrollArea className="h-[600px]">
                <div className="p-4 space-y-3">
                    {emails.length === 0 ? (
                        <p className="text-stone-400 text-center py-8">No emails found.</p>
                    ) : (
                        emails.map((email) => (
                            <Link href={`/emails/${email.id}`} key={email.id}>
                                <Card
                                    className={`bg-stone-800 border-stone-700 hover:bg-stone-750 transition-all duration-200 ${currentEmailId === email.id
                                        ? "ring-2 ring-blue-500 bg-stone-750"
                                        : ""
                                        }`}
                                >
                                    <CardHeader className="p-4 pb-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <CardTitle className="text-sm font-semibold text-white line-clamp-1 flex-1">
                                                {email.subject}
                                            </CardTitle>
                                            <Badge
                                                className={`${getBadgeColor(email.classification)} uppercase text-xs shrink-0`}
                                            >
                                                {email.classification || "TBD"}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <p className="text-xs text-stone-400 mb-1">
                                            <strong className="text-stone-300">From:</strong> {email.author}
                                        </p>
                                        <p className="text-xs text-stone-500 mb-2">
                                            {email.created_at
                                                ? new Date(email.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })
                                                : 'No date'
                                            }
                                        </p>
                                        <p className="text-xs text-stone-400 line-clamp-2">
                                            {cleanEmailPreview(email.email_thread_text)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
