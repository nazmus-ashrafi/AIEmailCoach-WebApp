"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import ConversationSearchBar from "@/components/emails/ConversationSearchBar";
import ConversationSidebar from "@/components/emails/ConversationSidebar";
import { UserMenu } from "@/components/auth/user-menu";
import { SyncAccountButton } from "@/components/ui/SyncAccountButton";




export default function EmailsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [searchTerm, setSearchTerm] = useState("");
    const pathname = usePathname();
    const searchParams = useSearchParams();

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

    // Extract account_id from URL search params
    const accountId = searchParams.get('account_id') || undefined;

    // On detail pages, show the full layout with sidebar
    return (
        <div className="min-h-screen bg-black">
            {/* Navigation Bar - PERSISTENT */}
            <nav className="bg-stone-900 border-b border-stone-800 px-6 py-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">ProfEmail</h1>
                    <UserMenu />
                </div>
            </nav>

            {/* Main Content Area */}
            <div className="p-6">
                {/* Back to Inbox link */}
                {/* <Link
                    href="/emails"
                    className="text-stone-400 hover:text-stone-200 mb-6 inline-block"
                >
                    ← Back to Inbox
                </Link> */}


                {/* Two-column layout - lg:grid-cols-2 */}

                {/* Left side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left column: Search + Sidebar (PERSISTENT) */}
                    <div className="lg:col-span-1">
                        <div className="flex flex-col gap-4">
                            <ConversationSearchBar
                                onSearchChange={setSearchTerm}
                                placeholder="Search Inbox..."
                            />
                            {/* Sync Button */}
                            <SyncAccountButton accountId={accountId} />

                            <ConversationSidebar
                                accountId={accountId}
                                searchTerm={searchTerm}
                                selectedEmailId={selectedEmailId}
                            />
                        </div>
                    </div>

                    {/* Right side */}
                    {/* Right column: Page content (CHANGES) */}
                    <div className="lg:col-span-1">
                        {children}  {/* This is where page.tsx renders */}
                    </div>
                </div>
            </div>
        </div>
    );
}