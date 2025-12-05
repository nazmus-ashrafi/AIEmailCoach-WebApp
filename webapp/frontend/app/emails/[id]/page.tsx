"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ClassifyIsland from "./ClassifyIsland";
import { EmailThreadList } from "@/components/emails/EmailThreadList_v2";
import ConversationSidebar from "@/components/emails/ConversationSidebar";
import ConversationSearchBar from "@/components/emails/ConversationSearchBar";
import { Loader2 } from "lucide-react";

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

export default function EmailDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchEmail() {
      try {
        const emailRes = await fetch(`http://localhost:8000/api/emails/${id}`, {
          cache: "no-store",
        });

        if (!emailRes.ok) {
          throw new Error("Email not found");
        }

        const data: Email = await emailRes.json();
        setEmail(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to fetch email");
      } finally {
        setLoading(false);
      }
    }

    fetchEmail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6 text-stone-400">
        <Link href="/emails" className="text-stone-400 hover:text-stone-200">
          ← Back to Inbox
        </Link>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        </div>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="min-h-screen bg-black p-6 text-stone-400">
        <Link href="/emails" className="text-stone-400 hover:text-stone-200">
          ← Back to Inbox
        </Link>
        <p className="mt-6 text-red-400">{error || "Email not found."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <Link
        href="/emails"
        className="text-stone-400 hover:text-stone-200 mb-6 inline-block"
      >
        ← Back to Inbox
      </Link>

      {/* Two-column layout - lg:grid-cols-2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Search bar + Conversation list sidebar */}
        <div className="lg:col-span-1">
          <div className="flex flex-col gap-4">
            <ConversationSearchBar
              onSearchChange={setSearchTerm}
              placeholder="Search by subject..."
            />
            <ConversationSidebar
              selectedEmailId={email.id}
              searchTerm={searchTerm}
            />
          </div>
        </div>

        {/* Right column: Email detail */}
        <div className="lg:col-span-1">
          <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl">
            <h1 className="text-2xl text-white mb-2">{email.subject}</h1>
            <p className="text-sm text-stone-400 mb-1">
              <strong className="text-stone-300">From:</strong> {email.author}
            </p>
            <p className="text-sm text-stone-400 mb-4">
              <strong className="text-stone-300">To:</strong> {email.to}
            </p>

            {/* --- Render Email Thread --- */}
            <div className="mb-6">
              <EmailThreadList emailId={email.id} />
            </div>

            {/* --- Interactive "island" for classification / draft --- */}
            <ClassifyIsland
              emailId={email.id}
              initialClassification={email.classification}
            />
          </div>
        </div>
      </div>
    </div>
  );
}