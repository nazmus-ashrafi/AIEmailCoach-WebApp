"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
// import ClassifyIsland from "./ClassifyIsland"; // Original LangGraph blocking version
import ClassifyIsland from "./ClassifyIsland_Streaming"; // New LangChain streaming version
import { EmailThreadList } from "@/components/emails/EmailThreadList_v2";
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
  email_account_id?: string; // UUID of the email account
}

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEmail() {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const emailRes = await fetch(`${API_BASE_URL}/api/emails/${id}`, {
          cache: "no-store",
        });

        if (!emailRes.ok) {
          throw new Error("Email not found");
        }

        const data: Email = await emailRes.json();
        setEmail(data);

        // Update URL with account_id if not already present
        if (data.email_account_id && !searchParams.get('account_id')) {
          const newSearchParams = new URLSearchParams(searchParams.toString());
          newSearchParams.set('account_id', data.email_account_id);
          router.replace(`/emails/${id}?${newSearchParams.toString()}`, { scroll: false });
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to fetch email");
      } finally {
        setLoading(false);
      }
    }

    fetchEmail();
  }, [id, router, searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400">{error || "Email not found."}</p>
      </div>
    );
  }

  return (
    // Left side ----
    // Left side (webapp/frontend/app/emails/layout.tsx) is wrapping this page 
    // Left side (Conversation List) was lifted up to the layout.tsx file because I do not want it to be re-rendered on every email detail page load
    // as that refreshes the conversation list and looses the scroll position

    // Right side ----
    <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl">
      <h1 className="text-2xl text-white mb-2">{email.subject}</h1>
      <p className="text-sm text-stone-400 mb-1">
        <strong className="text-stone-300">From:</strong> {email.author}
      </p>
      <p className="text-sm text-stone-400 mb-6">
        <strong className="text-stone-300">To:</strong> {email.to}
      </p>

      {/* --- Interactive "island" for classification / draft --- */}
      <div className="mb-6">
        <ClassifyIsland
          emailId={email.id}
          initialClassification={email.classification}
        />
      </div>

      {/* --- Render Email Thread --- */}
      <EmailThreadList emailId={email.id} />
    </div>
  );
}