"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import SyncOutlookButton from "@/components/ui/SyncOutlookButton";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { UserMenu } from "@/components/auth/user-menu";


interface Conversation {
  conversation_id: string | null;
  subject: string;
  message_count: number;
  most_recent_email_id: number;
  most_recent_date: string;
  participants: string[];
  preview_text: string | null;
  classification?: "ignore" | "notify" | "respond";
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

  if (loading) return <p className="p-6 text-stone-400">Loading conversations...</p>;
  if (error) return <p className="p-6 text-red-400">{error}</p>;

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation Bar */}
      <nav className="bg-stone-900 border-b border-stone-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">AI Email Coach</h1>
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

        {conversations.length === 0 ? (
          <p className="text-gray-400">No conversations found.</p>
        ) : (
          <div className="grid gap-4">
            {conversations.map((conversation) => (
              <Link
                href={`/emails/${conversation.most_recent_email_id}`}
                key={conversation.conversation_id || conversation.most_recent_email_id}
              >
                <Card
                  className="bg-stone-900 border-stone-800 p-4 hover:bg-stone-800 transition-colors duration-200"
                >
                  <CardHeader className="flex flex-row justify-between items-start p-0">
                    <CardTitle className="text-lg font-semibold text-white flex-1 pr-4">
                      {conversation.subject}
                    </CardTitle>
                    <div className="flex gap-2 items-center shrink-0">
                      <span className="text-xs text-stone-400">
                        {new Date(conversation.most_recent_date).toLocaleString()}
                      </span>
                      {conversation.message_count > 1 && (
                        <Badge className="bg-blue-600 text-white text-xs">
                          {conversation.message_count} messages
                        </Badge>
                      )}
                      <Badge
                        className={`${getBadgeColor(conversation.classification)} uppercase text-xs`}
                      >
                        {conversation.classification || "TBD"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 mt-3">
                    <p className="text-sm text-stone-400">
                      <strong className="text-stone-300">Participants:</strong>{" "}
                      {conversation.participants.slice(0, 3).join(", ")}
                      {conversation.participants.length > 3 && ` +${conversation.participants.length - 3} more`}
                    </p>
                    <p className="text-sm mt-2 line-clamp-3 text-stone-300">
                      {cleanEmailPreview(conversation.preview_text || "")}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
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