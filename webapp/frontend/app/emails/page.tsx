"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import SyncOutlookButton from "@/components/ui/SyncOutlookButton";

interface Email {
  id: number;
  author: string;
  to: string;
  subject: string;
  email_thread_text: string;
  email_thread_html: string;
  classification?: "ignore" | "notify" | "respond";
  created_at?: string;
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

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function refreshAfterSync() {
    setLoading(true);
    setError(null);

    fetch("http://localhost:8000/api/emails/")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to refresh after sync");
        return res.json();
      })
      .then((data) => {
        setEmails(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setError("Failed to refresh emails after sync.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    async function fetchEmails() {
      try {
        const res = await fetch("http://localhost:8000/api/emails/");
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const data = await res.json();
        setEmails(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error(err);
        setError("Failed to fetch emails.");
      } finally {
        setLoading(false);
      }
    }
    fetchEmails();
  }, []);

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

  if (loading) return <p className="p-6 text-stone-400">Loading emails...</p>;
  if (error) return <p className="p-6 text-red-400">{error}</p>;

  return (
    <div className="min-h-screen bg-black p-6">
      <h1 className="text-3xl font-bold mb-6 text-white">Inbox</h1>

      {/* Sync Button */}
      <SyncOutlookButton onFinished={refreshAfterSync} />

      {emails.length === 0 ? (
        <p className="text-gray-400">No emails found.</p>
      ) : (
        <div className="grid gap-4">
          {emails.map((email) => (
            <Link href={`/emails/${email.id}`} key={email.id}>
              <Card
                key={email.id}
                className="bg-stone-900 border-stone-800 p-4 hover:bg-stone-800 transition-colors duration-200"
              >
                <CardHeader className="flex flex-row justify-between items-start p-0">
                  <CardTitle className="text-lg font-semibold text-white flex-1 pr-4">
                    {email.subject}
                  </CardTitle>
                  <span className="text-xs text-stone-400">
                    {new Date(email.created_at || "").toLocaleString()}
                  </span>
                  <Badge
                    className={`${getBadgeColor(email.classification)} uppercase text-xs shrink-0`}
                  >
                    {email.classification || "TBD"}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 mt-3">
                  <p className="text-sm text-stone-400">
                    <strong className="text-stone-300">From:</strong> {email.author}
                  </p>
                  <p className="text-sm text-stone-400">
                    <strong className="text-stone-300">To:</strong> {email.to}
                  </p>
                  <p className="text-sm mt-2 line-clamp-3 text-stone-300">
                    {cleanEmailPreview(email.email_thread_text)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}