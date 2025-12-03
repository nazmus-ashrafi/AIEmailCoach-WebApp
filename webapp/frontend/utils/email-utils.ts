/**
 * Utility functions for email processing
 */

interface Email {
    subject?: string;
    email_thread_text?: string;
    email_thread_html?: string;
}

export function cleanEmailPreview(text: string): string {
    return text
        .replace(/\s+/g, " ")        // compress whitespace
        .replace(/^From:.*?$/gmi, "") // remove headers
        .replace(/^To:.*?$/gmi, "")
        .replace(/^Date:.*?$/gmi, "")
        .replace(/^Subject:.*?$/gmi, "")
        .trim();
}

export function getBadgeColor(classification?: string): string {
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
}

/**
 * Detects if an email is a forwarded message
 */
export function isForwardedEmail(email: Email): boolean {
    // Check subject line for forward indicators
    const subject = email.subject?.toLowerCase() || "";
    const hasForwardSubject = subject.startsWith("fwd:") ||
        subject.startsWith("fw:") ||
        subject.includes("[fwd:");

    // Check if HTML contains forwarded message indicators
    const html = email.email_thread_html || "";
    const hasForwardedMessageDiv = html.includes("forwarded message") ||
        html.includes("forwarded-message") ||
        html.includes("gmail_quote") ||
        html.includes("outlook_quote");

    return hasForwardSubject || hasForwardedMessageDiv;
}

/**
 * Determines if email should be rendered as HTML
 */
export function shouldRenderAsHtml(email: Email): boolean {
    const hasHtml = !!email.email_thread_html && email.email_thread_html.trim().length > 0;

    if (!hasHtml) {
        return false;
    }

    // If it's a forwarded email with HTML, render as HTML
    if (isForwardedEmail(email)) {
        return true;
    }

    // Check if HTML content is significantly different from text
    // (indicates rich formatting or nested messages)
    const htmlLength = email.email_thread_html?.length || 0;
    const textLength = email.email_thread_text?.length || 0;

    // If HTML is more than 50% larger, it likely contains structure worth preserving
    if (htmlLength > textLength * 1.5) {
        return true;
    }

    return false;
}
