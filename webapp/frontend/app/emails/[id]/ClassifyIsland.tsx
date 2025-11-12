"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { Loader2 } from "lucide-react"; // spinner icon

interface Props {
  emailId: number;
  initialClassification?: string;
}

export default function ClassifyIsland({ emailId, initialClassification }: Props) {
  const [classification, setClassification] = useState(initialClassification);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClassify = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/emails/classify_email?email_id=${emailId}`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setClassification(data.classification);
      setReasoning(data.reasoning);
    } catch (err: any) {
      console.error(err);
      setError("Failed to classify email.");
    } finally {
      setLoading(false);
    }
  };

  // Strongly typed color map
  type ClassificationType = "respond" | "notify" | "ignore" | undefined;

  const classificationColors: Record<Exclude<ClassificationType, undefined>, string> = {
    respond: "text-green-400",
    notify: "text-amber-400",
    ignore: "text-stone-400",
  };

  const classificationColor =
    (classification
      ? classificationColors[classification as keyof typeof classificationColors]
      : undefined) || "text-stone-300";

  return (
    <div className="mt-8 flex flex-col items-center text-center">
      <button
        onClick={handleClassify}
        disabled={loading}
        className="px-6 py-3 text-lg font-semibold rounded-xl bg-stone-700 text-white hover:bg-stone-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md"
      >
        {loading && <Loader2 className="h-5 w-5 animate-spin" />}
        {loading
          ? "Classifying..."
          : classification
          ? "Reclassify Email"
          : "Classify Email"}
      </button>

      {error && <p className="text-red-400 mt-3">{error}</p>}

      {classification && (
        <div className="mt-6 w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl p-5 text-left">
          <p className="text-lg font-bold mb-2">
            Classification:{" "}
            {/* TODO: Add colors: currently not working */}
            <span className={`${classificationColor} capitalize`}>
              {classification}
            </span>
            {/* <span
                className={
                    classification === "respond"
                    ? "capitalize font-bold text-green-400"
                    : classification === "notify"
                    ? "capitalize font-bold text-amber-400"
                    : classification === "ignore"
                    ? "capitalize font-bold text-stone-400"
                    : "capitalize font-bold text-stone-300"
                }
                >
                {classification}
            </span> */}
          </p>
          {reasoning && (
            <div className="mt-3 text-stone-300 leading-relaxed text-base">
              <p className="font-semibold text-stone-200 mb-1">Reasoning:</p>
              <p className="whitespace-pre-line">{reasoning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}