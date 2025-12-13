"use client";

import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface Props {
    emailId: number;
    initialClassification?: string;
}

// Streaming event type
interface StreamEvent {
    id: string;
    type: 'thinking' | 'reasoning_chunk' | 'classification' | 'draft_start' | 'draft_chunk' | 'complete' | 'error';
    content: string;
    timestamp: Date;
}

export default function ClassifyIslandStreaming({ emailId, initialClassification }: Props) {
    // React Query client for cache invalidation
    const queryClient = useQueryClient();

    const [classification, setClassification] = useState(initialClassification);
    const [reasoning, setReasoning] = useState<string | null>(null);
    const [aiDraft, setAiDraft] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Streaming state
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingEvents, setStreamingEvents] = useState<StreamEvent[]>([]);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Cleanup EventSource on unmount
    // Critical for preventing memory leaks!
    // If user navigates away while streaming, this closes the connection
    // Prevents zombie connections that keep consuming resources
    useEffect(() => {
        return () => {
            eventSourceRef.current?.close();
        };
    }, []);

    // --- STREAMING CLASSIFY ---
    const handleClassifyStream = () => {
        setError(null);
        setIsStreaming(true);
        setStreamingEvents([]);
        setReasoning(''); // Reset reasoning for new classification
        setAiDraft(null); // Reset draft for new classification

        // An Browser's EventSource instance opens a persistent connection to an HTTP server, which sends events in text/event-stream format. 
        // The connection remains open until closed by calling EventSource.close().
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const eventSource = new EventSource(
            `${API_BASE_URL}/api/emails/classify_email_stream/${emailId}`
        );
        eventSourceRef.current = eventSource;

        // I set up 6 different event listeners, each handling a different event type from the backend

        // Event: thinking
        eventSource.addEventListener('thinking', (e) => {
            const data = JSON.parse(e.data);
            setStreamingEvents(prev => [...prev, {
                id: Date.now().toString(),
                type: 'thinking',
                content: data.message,
                timestamp: new Date()
            }]);
        });

        // Event: reasoning_chunk (real-time reasoning streaming)
        eventSource.addEventListener('reasoning_chunk', (e) => {
            const data = JSON.parse(e.data);
            setReasoning(prev => (prev || '') + data.chunk); // Appends each chunk. Creates the typing effect.
        });

        // Event: classification
        eventSource.addEventListener('classification', (e) => {
            const data = JSON.parse(e.data);
            setClassification(data.classification);
            // Don't overwrite reasoning - it's already been streamed!
            setStreamingEvents(prev => [...prev, {
                id: Date.now().toString(),
                type: 'classification',
                content: `✅ Classified as: ${data.classification}`,
                timestamp: new Date()
            }]);
        });

        // Event: draft_start
        eventSource.addEventListener('draft_start', (e) => {
            const data = JSON.parse(e.data);
            setStreamingEvents(prev => [...prev, {
                id: Date.now().toString(),
                type: 'draft_start',
                content: data.message,
                timestamp: new Date()
            }]);
        });

        // Event: draft_chunk
        eventSource.addEventListener('draft_chunk', (e) => {
            const data = JSON.parse(e.data);
            setAiDraft(prev => (prev || '') + data.chunk);
        });

        // Event: complete
        eventSource.addEventListener('complete', (e) => {
            const data = JSON.parse(e.data);
            setClassification(data.classification);
            setReasoning(data.reasoning);
            if (data.ai_draft) {
                setAiDraft(data.ai_draft);
            }
            setIsStreaming(false);
            eventSource.close();

            // Invalidate React Query cache to update conversation badges in sidebar
            queryClient.invalidateQueries({ queryKey: ["conversations"] });

            setStreamingEvents(prev => [...prev, {
                id: Date.now().toString(),
                type: 'complete',
                content: data.cached ? '✅ Loaded from cache' : '✅ Classification complete',
                timestamp: new Date()
            }]);
        });

        // Event: error
        eventSource.addEventListener('error', (e) => {
            console.error('EventSource error:', e);
            setError('Streaming failed. Please try again.');
            setIsStreaming(false);
            eventSource.close();
        });
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

    // Event icons
    const eventIcons = {
        thinking: '🤔',
        reasoning_chunk: '💭',
        classification: '📊',
        draft_start: '✍️',
        draft_chunk: '📝',
        complete: '✅',
        error: '❌'
    };

    return (
        <div className="mt-8 flex flex-col items-center text-center w-full">
            {/* Buttons Row */}
            <div className="flex flex-wrap justify-center gap-4">
                <button
                    onClick={handleClassifyStream}
                    disabled={isStreaming}
                    className="px-6 py-3 text-lg font-semibold rounded-xl bg-stone-700 text-white hover:bg-stone-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md"
                >
                    {isStreaming && <Loader2 className="h-5 w-5 animate-spin" />}
                    {isStreaming
                        ? "Classifying..."
                        : classification
                            ? "Reclassify Email"
                            : "Classify Email"}
                </button>
            </div>

            {error && <p className="text-red-400 mt-3">{error}</p>}

            {/* Streaming Agent Thoughts */}
            {isStreaming && (
                <div className="mt-6 w-full max-w-3xl bg-stone-900 border border-stone-700 rounded-xl p-5 shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        🤖 Agent Working...
                        <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                    </h3>

                    {/* Streaming reasoning text */}
                    {reasoning && (
                        <div className="mb-4 p-4 bg-stone-800/50 rounded-lg border border-stone-700">
                            <p className="text-sm font-semibold text-stone-300 mb-2">💭 Reasoning:</p>
                            <p className="text-sm text-stone-300 whitespace-pre-wrap">{reasoning}</p>
                        </div>
                    )}

                    {/* Event log */}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {streamingEvents.map(event => (
                            <div
                                key={event.id}
                                className="flex items-start gap-3 p-2 bg-stone-800/30 rounded-lg border border-stone-700/50 animate-fade-in"
                            >
                                <span className="text-lg">{eventIcons[event.type]}</span>
                                <div className="flex-1">
                                    <p className="text-xs text-stone-300">{event.content}</p>
                                    <span className="text-xs text-stone-500">
                                        {event.timestamp.toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
