import Link from "next/link";
import ClassifyIsland from "./ClassifyIsland";
import { EmailThreadList } from "@/components/emails/EmailThreadList";

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

  // Fetch all emails for the thread list
  const allEmailsRes = await fetch(`http://localhost:8000/api/emails/`, {
    cache: "no-store",
  });

  let allEmails: Email[] = [];
  if (allEmailsRes.ok) {
    allEmails = await allEmailsRes.json();
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <Link
        href="/emails"
        className="text-stone-400 hover:text-stone-200 mb-6 inline-block"
      >
        ← Back to Inbox
      </Link>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Email thread list */}
        <div className="lg:col-span-1">
          <EmailThreadList emails={allEmails} currentEmailId={email.id} />
        </div>

        {/* Right column: Email detail */}
        <div className="lg:col-span-2">
          <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl">
            <h1 className="text-2xl text-white mb-2">{email.subject}</h1>
            <p className="text-sm text-stone-400 mb-1">
              <strong className="text-stone-300">From:</strong> {email.author}
            </p>
            <p className="text-sm text-stone-400 mb-4">
              <strong className="text-stone-300">To:</strong> {email.to}
            </p>

            {/* --- Render Email Body --- */}
            {email.email_thread_html ? (
              <div
                className="text-stone-200 mb-6"
                dangerouslySetInnerHTML={{ __html: email.email_thread_html }}
              />
            ) : (
              <div className="text-stone-200 whitespace-pre-line mb-6">
                {email.email_thread_text}
              </div>
            )}

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