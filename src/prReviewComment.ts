import {ImportanceLevel} from "./line-comment";

export type PullRequestReviewLineComments = PullRequestReviewLineComment[];

export interface PullRequestReviewLineComment {
    filename: string;
    line_number: number;
    comment: string;
    importance: ImportanceLevel;
}

export const parsePullRequestReviewLineComments = (text: string): PullRequestReviewLineComments => {
    try {
        return JSON.parse(text) as PullRequestReviewLineComments;
    } catch (error) {
        console.error('Failed to parse AI response as JSON:', error);
        return [] as PullRequestReviewLineComments;
    }
}