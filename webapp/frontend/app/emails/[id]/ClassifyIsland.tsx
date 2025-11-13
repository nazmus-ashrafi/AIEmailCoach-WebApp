"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { Loader2 } from "lucide-react";

interface Props {
  emailId: number;
  initialClassification?: string;
}

export default function ClassifyIsland({ emailId, initialClassification }: Props) {
  const [classification, setClassification] = useState(initialClassification);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [loadingClassify, setLoadingClassify] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- CLASSIFY EMAIL ---
  const handleClassify = async () => {
    setLoadingClassify(true);
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
      setAiDraft(data.ai_draft || null);
    } catch (err: any) {
      console.error(err);
      setError("Failed to classify email.");
    } finally {
      setLoadingClassify(false);
    }
  };

  // --- GENERATE DRAFT ---
  const handleGenerateDraft = async () => {
    setLoadingDraft(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/emails/${emailId}/generate_draft`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setClassification(data.classification);
      setReasoning(data.reasoning);
      setAiDraft(data.ai_draft || null);
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate draft.");
    } finally {
      setLoadingDraft(false);
    }
  };

  // --- Classification color mapping ---
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
    <div className="mt-8 flex flex-col items-center text-center w-full">
      {/* Buttons Row */}
      <div className="flex flex-wrap justify-center gap-4">
        <button
          onClick={handleClassify}
          disabled={loadingClassify}
          className="px-6 py-3 text-lg font-semibold rounded-xl bg-stone-700 text-white hover:bg-stone-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md"
        >
          {loadingClassify && <Loader2 className="h-5 w-5 animate-spin" />}
          {loadingClassify
            ? "Classifying..."
            : classification
            ? "Reclassify Email"
            : "Classify Email"}
        </button>

        <button
          onClick={handleGenerateDraft}
          disabled={loadingDraft}
          className="px-6 py-3 text-lg font-semibold rounded-xl bg-indigo-700 text-white hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md"
        >
          {loadingDraft && <Loader2 className="h-5 w-5 animate-spin" />}
          {loadingDraft ? "Generating..." : "Generate Draft"}
        </button>
      </div>

      {error && <p className="text-red-400 mt-3">{error}</p>}

      {/* Results Cubes */}
      {(classification || aiDraft) && (
        <div className="mt-6 flex flex-col md:flex-row gap-6 w-full max-w-5xl justify-center">
          {/* Classification cube */}
          {classification && (
            <div className="flex-1 bg-stone-900 border border-stone-800 rounded-2xl p-5 text-left shadow-md">
              <p className="text-lg font-bold mb-2">
                Classification:{" "}
                <span className={`${classificationColor} capitalize`}>
                  {classification}
                </span>
              </p>
              {reasoning && (
                <div className="mt-3 text-stone-300 leading-relaxed text-base">
                  <p className="font-semibold text-stone-200 mb-1">Reasoning:</p>
                  <p className="whitespace-pre-line">{reasoning}</p>
                </div>
              )}
            </div>
          )}

          {/* AI Draft cube */}
          {aiDraft && (
            <div className="flex-1 bg-stone-900 border border-stone-800 rounded-2xl p-5 text-left shadow-md">
              <p className="text-lg font-bold mb-2 text-indigo-400">AI Draft</p>
              <div className="text-stone-300 leading-relaxed text-base whitespace-pre-line">
                {aiDraft}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}