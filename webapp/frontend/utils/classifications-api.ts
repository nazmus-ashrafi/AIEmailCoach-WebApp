/**
 * API client functions for classification operations
 */

import { ClassificationResponse, GenerateDraftResponse } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function classifyEmail(emailId: number): Promise<ClassificationResponse> {
    const response = await fetch(
        `${API_BASE_URL}/api/emails/classify_email?email_id=${emailId}`,
        { method: "POST" }
    );

    if (!response.ok) {
        throw new Error(`Failed to classify email: ${response.status}`);
    }

    return response.json();
}

export async function generateDraft(emailId: number): Promise<GenerateDraftResponse> {
    const response = await fetch(
        `${API_BASE_URL}/api/emails/${emailId}/generate_draft`,
        { method: "POST" }
    );

    if (!response.ok) {
        throw new Error(`Failed to generate draft: ${response.status}`);
    }

    return response.json();
}
