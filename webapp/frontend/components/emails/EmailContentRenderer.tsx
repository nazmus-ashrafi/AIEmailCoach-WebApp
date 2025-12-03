"use client";

import { SafeHtmlRenderer } from "./SafeHtmlRenderer";
import { shouldRenderAsHtml, isForwardedEmail } from "@/utils/email-utils";
import { FileCode } from "lucide-react";

interface Email {
    id: number;
    author: string;
    to: string;
    subject: string;
    email_thread_text?: string;
    email_thread_html?: string;
    message_id?: string;
    conversation_id?: string;
    received_at?: string;
    created_at?: string;
}

interface EmailContentRendererProps {
    email: Email;
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

export function EmailContentRenderer({ email }: EmailContentRendererProps) {
    const renderAsHtml = shouldRenderAsHtml(email);
    const isForwarded = isForwardedEmail(email);

    if (renderAsHtml && email.email_thread_html) {
        return (
            <div>
                {/* Visual indicator for HTML content */}
                {isForwarded && (
                    <div className="px-4 pt-4 pb-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
                            <FileCode className="h-3 w-3 text-amber-400" />
                            <span className="text-xs text-amber-400 font-medium">Forwarded Chain</span>
                        </div>
                    </div>
                )}

                <div className="p-4">
                    <SafeHtmlRenderer
                        html={email.email_thread_html}
                        fallbackText={email.email_thread_text}
                        className="leading-relaxed"
                    />
                </div>
            </div>
        );
    }

    // Default: render as clean text
    return (
        <div className="p-4">
            <div className="text-sm text-stone-300 leading-relaxed whitespace-pre-wrap">
                {cleanEmailContent(email.email_thread_text || "No content")}
            </div>
        </div>
    );
}
