"use client";

import { useState } from "react";

export default function SyncOutlookButton({ onFinished }: { onFinished: () => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setMessage(null);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_BASE_URL}/api/emails/sync_outlook`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Sync failed");
      }

      setMessage(`Synced: ${data.created_in_db} new emails`);
      onFinished(); // tell parent page to refresh inbox
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6">
      <button
        onClick={handleSync}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-stone-700 text-white hover:bg-stone-600 disabled:opacity-50"
      >
        {loading ? "Syncing…" : "Sync Outlook"}
      </button>

      {message && (
        <p className="mt-2 text-sm text-stone-300">
          {message}
        </p>
      )}
    </div>
  );
}