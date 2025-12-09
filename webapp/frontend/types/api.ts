/**
 * TypeScript types for API responses
 */

export interface Email {
    id: number;
    author: string;
    to: string;
    subject: string;
    email_thread_text: string;
    email_thread_html: string;
    classification?: "ignore" | "notify" | "respond";
    created_at?: string;
}

export interface Conversation {
    conversation_id?: string;
    most_recent_email_id: string;
    subject: string;
    most_recent_date: string;
    account_email: string;
    message_count: number;
    classification?: "ignore" | "notify" | "respond";
    participants: string[];
    preview_text?: string;
}

export interface ClassificationResponse {
    classification: "ignore" | "notify" | "respond";
    reasoning: string;
    ai_draft?: string;
}

export interface GenerateDraftResponse {
    classification: "ignore" | "notify" | "respond";
    reasoning: string;
    ai_draft: string;
}
