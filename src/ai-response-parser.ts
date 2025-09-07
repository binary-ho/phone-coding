import { LineComment } from './line-comment';
import { DiffLine } from './diff-parser';

const LINE_COMMENT_REGEX = /^-?\s*(.+):(\d+):\s*(.+)$/gm;

export interface ParsedAIResponse {
  generalComment: string;
  lineComments: LineComment[];
}

export const parseLineCommentReviewForLineComments = (
  aiResponse: string,
  diffLines: DiffLine[]
): ParsedAIResponse => {
  // AI 응답에서 라인별 코멘트 추출
  // 예상 형식: "파일명:라인번호: 코멘트 내용" 또는 "- 파일명:라인번호: 코멘트 내용"
  const lineComments: LineComment[] = [];
  let generalComment = aiResponse;

  const matches = [...aiResponse.matchAll(LINE_COMMENT_REGEX)];
  for (const match of matches) {
    const [fullMatch, path, lineStr, comment] = match;
    const line = parseInt(lineStr);

    const fileExistsInDiff = diffLines.some(dl => dl.path === path);
    if (fileExistsInDiff) {
      lineComments.push({
        path,
        line,
        side: 'RIGHT',
        body: comment.trim()
      });
    }
  }

  return {
    generalComment: generalComment.trim(),
    lineComments
  };
};