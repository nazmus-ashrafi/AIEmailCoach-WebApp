/**
 * Utility functions for email processing
 */

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
