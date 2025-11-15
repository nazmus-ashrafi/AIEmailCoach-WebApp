import Link from "next/link";
import ClassifyIsland from "./ClassifyIsland";

interface Email {
  id: number;
  author: string;
  to: string;
  subject: string;
  email_thread_text: string;
  email_thread_html: string;
  classification?: "ignore" | "notify" | "respond";
}

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch the email from backend
  const res = await fetch(`http://localhost:8000/api/emails/${id}`, {
    cache: "no-store", // always fetch latest
  });

  if (!res.ok) {
    return (
      <div className="min-h-screen bg-black p-6 text-stone-400">
        <Link href="/emails" className="text-stone-400 hover:text-stone-200">
          ← Back to Inbox
        </Link>
        <p className="mt-6 text-red-400">Email not found.</p>
      </div>
    );
  }

  const email: Email = await res.json();

  return (
    <div className="min-h-screen bg-black p-6">
      <Link
        href="/emails"
        className="text-stone-400 hover:text-stone-200 mb-6 inline-block"
      >
        ← Back to Inbox
      </Link>

      <div className="bg-stone-900 border-stone-800 p-6 rounded-2xl">
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

        {/* --- Interactive “island” for classification / draft --- */}
        <ClassifyIsland
          emailId={email.id}
          initialClassification={email.classification}
        />
      </div>
    </div>
  );
}