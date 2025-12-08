"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import ConversationSearchBar from "@/components/emails/ConversationSearchBar";
import ConversationSidebar from "@/components/emails/ConversationSidebar";
import { UserMenu } from "@/components/auth/user-menu";

export default function EmailsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const pathname = usePathname();

    // Check if we're on a detail page (e.g., /emails/123) vs inbox (/emails)
    const isDetailPage = pathname !== "/emails";

    // If on inbox page, just render children without sidebar
    if (!isDetailPage) {
        return <>{children}</>;
    }

    // Extract email ID from pathname (e.g., /emails/123 -> 123)
    const selectedEmailId = isDetailPage
        ? parseInt(pathname.split("/").pop() || "0", 10)
        : undefined;

    // On detail pages, show the full layout with sidebar
    return (
        <div className="min-h-screen bg-black">
            {/* Navigation Bar - PERSISTENT */}
            <nav className="bg-stone-900 border-b border-stone-800 px-6 py-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">AI Email Coach</h1>
                    <UserMenu />
                </div>
            </nav>

            {/* Main Content Area */}
            <div className="p-6">
                {/* Back to Inbox link */}
                <Link
                    href="/emails"
                    className="text-stone-400 hover:text-stone-200 mb-6 inline-block"
                >
                    ← Back to Inbox
                </Link>

                {/* Two-column layout - lg:grid-cols-2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left column: Search + Sidebar (PERSISTENT) */}
                    <div className="lg:col-span-1">
                        <div className="flex flex-col gap-4">
                            <ConversationSearchBar
                                onSearchChange={setSearchTerm}
                                placeholder="Search by subject..."
                            />
                            <ConversationSidebar
                                searchTerm={searchTerm}
                                selectedEmailId={selectedEmailId}
                            />
                        </div>
                    </div>

                    {/* Right column: Page content (CHANGES) */}
                    <div className="lg:col-span-1">
                        {children}  {/* This is where page.tsx renders */}
                    </div>
                </div>
            </div>
        </div>
    );
}