// This should not be a component rendered in the client side, ie. this should be a server side component (Runs entirely server-side).
// Email details page is mostly Static or read-only content, as of now.
// We reserve "use client" for components that need client interactivity (buttons, forms, toggles, modals, etc.).
// Server components have Excellent SEO (SSR HTML), Faster performance (no client-side JS), API key/DB-safe (runs server-side)
// We should keep large dependencies on the server (like interactive buttons), not ship it to client to be rendered there

import Link from "next/link";
import ClassifyIsland from "./ClassifyIsland";


interface Email {
  id: number;
  author: string;
  to: string;
  subject: string;
  email_thread: string;
  classification?: "ignore" | "notify" | "respond";
}

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Must await the params Promise in Next.js 15
//  In Next.js 15, params and searchParams are now Promises that must be awaited before use.
  const { id } = await params;

  // Using "await fetch()" to fetch data in a server component
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
        <div className="text-stone-200 whitespace-pre-line">{email.email_thread}</div>

          {/* Interactive “island” — client component for classify action */}
         <ClassifyIsland
          emailId={email.id}
          initialClassification={email.classification}
        />
      </div>
    </div>
  );
}