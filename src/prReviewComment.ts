import {ImportanceLevel} from "./line-comment";

export type PullRequestReviewLineComments = PullRequestReviewLineComment[];

export interface PullRequestReviewLineComment {
    filename: string;
    line_number: number;
    comment: string;
    importance: ImportanceLevel;
}

interface JsonAIResponse {
    line_comments: PullRequestReviewLineComment[];
}

export const parsePullRequestReviewLineComments = (text: string): PullRequestReviewLineComments => {
    try {
        const parsed = JSON.parse(text) as JsonAIResponse;
        return parsed.line_comments || [];
    } catch (error) {
        console.error('Failed to parse AI response as JSON:', error);
        return [] as PullRequestReviewLineComments;
    }
}