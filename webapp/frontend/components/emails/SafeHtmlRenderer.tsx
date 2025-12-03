"use client";

import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { AlertCircle } from "lucide-react";

interface SafeHtmlRendererProps {
    html: string;
    className?: string;
    fallbackText?: string;
}

export function SafeHtmlRenderer({ html, className = "", fallbackText }: SafeHtmlRendererProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (contentRef.current && html) {
            try {
                // Validate HTML input
                if (typeof html !== 'string' || html.trim().length === 0) {
                    throw new Error("Invalid HTML content");
                }

                // Configure DOMPurify to allow safe HTML elements
                const cleanHtml = DOMPurify.sanitize(html, {
                    ALLOWED_TAGS: [
                        'p', 'br', 'div', 'span', 'a', 'b', 'i', 'u', 'strong', 'em',
                        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                        'ul', 'ol', 'li',
                        'blockquote', 'pre', 'code',
                        'table', 'thead', 'tbody', 'tr', 'td', 'th',
                        'img', 'hr'
                    ],
                    ALLOWED_ATTR: [
                        'href', 'title', 'alt', 'src', 'width', 'height',
                        'class', 'id', 'style', 'target', 'rel'
                    ],
                    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
                    KEEP_CONTENT: true,
                });

                // Check if sanitization removed everything
                if (!cleanHtml || cleanHtml.trim().length === 0) {
                    console.warn("HTML content was completely sanitized (possibly malicious)");
                    if (fallbackText) {
                        contentRef.current.innerHTML = `<p class="text-stone-300">${DOMPurify.sanitize(fallbackText)}</p>`;
                    } else {
                        setError("Content could not be displayed safely");
                    }
                    return;
                }

                contentRef.current.innerHTML = cleanHtml;
                setError(null);
            } catch (err) {
                console.error("Error sanitizing HTML:", err);
                setError(err instanceof Error ? err.message : "Unknown error");

                // Try to display fallback text if available
                if (fallbackText && contentRef.current) {
                    contentRef.current.innerHTML = `<p class="text-stone-300">${DOMPurify.sanitize(fallbackText)}</p>`;
                }
            }
        }
    }, [html, fallbackText]);

    if (error && !fallbackText) {
        return (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-red-400">Error rendering email content</p>
                    <p className="text-xs text-red-300/70 mt-1">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={contentRef}
            className={`email-html-content text-sm text-stone-300 leading-relaxed ${className}`}
        />
    );
}
