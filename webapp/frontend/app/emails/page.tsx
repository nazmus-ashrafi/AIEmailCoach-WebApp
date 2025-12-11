"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import SyncOutlookButton from "@/components/ui/SyncOutlookButton";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { UserMenu } from "@/components/auth/user-menu";
import ConversationList, { Conversation } from "@/components/emails/ConversationList";
import { cleanEmailPreview, getBadgeColor } from "@/utils/email-utils";


function EmailsPageContent() {
  const searchParams = useSearchParams();
  const accountId = searchParams.get('account_id');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function refreshAfterSync() {
    setLoading(true);
    setError(null);

    // Build URL with optional account_id parameter
    const url = accountId
      ? `http://localhost:8000/api/emails/conversations?account_id=${accountId}`
      : "http://localhost:8000/api/emails/conversations";

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to refresh after sync");
        return res.json();
      })
      .then((data) => {
        setConversations(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setError("Failed to refresh conversations after sync.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    async function fetchConversations() {
      try {
        // Build URL with optional account_id parameter
        const url = accountId
          ? `http://localhost:8000/api/emails/conversations?account_id=${accountId}`
          : "http://localhost:8000/api/emails/conversations";

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const data = await res.json();
        setConversations(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error(err);
        setError("Failed to fetch conversations.");
      } finally {
        setLoading(false);
      }
    }
    fetchConversations();
  }, [accountId]); // Re-fetch when accountId changes

  if (loading) return <p className="p-6 text-stone-400">Loading conversations...</p>;
  if (error) return <p className="p-6 text-red-400">{error}</p>;


  return (
    <div className="min-h-screen bg-black">
      {/* Navigation Bar */}
      <nav className="bg-stone-900 border-b border-stone-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">ProfEmail</h1>
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
        <SyncOutlookButton onFinished={refreshAfterSync} />

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
      <EmailsPageContent />
    </ProtectedRoute>
  );
}