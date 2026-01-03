"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SyncOutlookButton from "@/components/ui/SyncOutlookButton";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { UserMenu } from "@/components/auth/user-menu";
import ConversationList from "@/components/emails/ConversationList";
import { cleanEmailPreview, getBadgeColor } from "@/utils/email-utils";
import { useConversations } from "@/hooks/useConversations";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-context";


function EmailsPageContent() {
  const searchParams = useSearchParams();
  const accountId = searchParams.get('account_id') || undefined;
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Use React Query hook instead of manual fetch
  const { data: conversations = [], isLoading: loading, error } = useConversations(accountId);

  function refreshAfterSync() {
    // Invalidate and refetch conversations using React Query
    queryClient.invalidateQueries({
      queryKey: ["conversations", accountId, user?.id]
    });
  }

  if (loading) return <p className="p-6 text-stone-400">Loading conversations...</p>;
  if (error) return <p className="p-6 text-red-400">Failed to fetch conversations.</p>;


  return (
    <div className="min-h-screen bg-black">
      {/* Navigation Bar */}
      <nav className="bg-stone-900 border-b border-stone-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-2xl font-bold text-white">
            <img src="/logo.png" alt="ProfEmail Logo" className="w-8 h-8" />
            ProfEmail
          </a>
          <UserMenu />
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">
            {accountId ? "Account Inbox" : "All Emails"}
          </h2>
          {accountId && (
            <Link
              href="/emails"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              ← View All Emails
            </Link>
          )}
        </div>

        {/* Sync Button */}
        {/* <SyncOutlookButton onFinished={refreshAfterSync} /> */}

        <ConversationList
          conversations={conversations}
          getBadgeColor={getBadgeColor}
          cleanEmailPreview={cleanEmailPreview}
        />
      </div>
    </div>
  );
}

export default function EmailsPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="p-6 text-stone-400">Loading...</div>
      }>
        <EmailsPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}