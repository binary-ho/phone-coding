import {ImportanceLevel} from "./line-comment";
import {unescapeCommentContent} from "./jsonResponseCleanser";

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
        const comments = parsed.line_comments || [];
        
        // JSON 파싱 후 각 comment의 내용에서 escape 문자들을 원래 형태로 되돌림
        return comments.map(comment => ({
            ...comment,
            comment: unescapeCommentContent(comment.comment)
        }));
    } catch (error) {
        console.error('Failed to parse AI response as JSON:', error);
        return [] as PullRequestReviewLineComments;
    }
}