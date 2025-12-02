import Link from "next/link";
import ClassifyIsland from "./ClassifyIsland";
import { EmailThreadList } from "@/components/emails/EmailThreadList_v2";
import ConversationSidebar from "@/components/emails/ConversationSidebar";

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

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch the specific email
  const emailRes = await fetch(`http://localhost:8000/api/emails/${id}`, {
    cache: "no-store",
  });

  if (!emailRes.ok) {
    return (
      <div className="min-h-screen bg-black p-6 text-stone-400">
        <Link href="/emails" className="text-stone-400 hover:text-stone-200">
          ← Back to Inbox
        </Link>
        <p className="mt-6 text-red-400">Email not found.</p>
      </div>
    );
  }

  const email: Email = await emailRes.json();

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
        {/* Left column: Conversation list sidebar */}
        <div className="lg:col-span-1">
          <ConversationSidebar selectedEmailId={email.id} />
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