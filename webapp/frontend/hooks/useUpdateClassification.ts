/**
 * React Query mutation hook for updating email classification
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { classifyEmail, generateDraft } from "@/utils/classifications-api";
import { ClassificationResponse, GenerateDraftResponse } from "@/types/api";

type ClassificationAction = "classify" | "generate_draft";

interface UseUpdateClassificationParams {
    emailId: number;
    action: ClassificationAction;
}

export function useUpdateClassification() {
    const queryClient = useQueryClient();

    return useMutation<
        ClassificationResponse | GenerateDraftResponse,
        Error,
        UseUpdateClassificationParams
    >({
        mutationFn: async ({ emailId, action }) => {
            if (action === "classify") {
                return classifyEmail(emailId);
            } else {
                return generateDraft(emailId);
            }
        },
        onSuccess: () => {
            // Invalidate conversations cache to trigger refetch in ConversationSidebar
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
    });
}
