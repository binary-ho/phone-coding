import {LineComment, LineComments} from './line-comment';
import { DiffLine } from './diff-parser';

const LINE_COMMENT_REGEX = /^-?\s*(.+):(\d+):\s*(.+)$/gm;

export const parseLineCommentReviewForLineComments = (
  aiResponse: string,
  diffLines: DiffLine[]
): LineComments => {
  // AI 응답에서 라인별 코멘트 추출
  // 예상 형식: "파일명:라인번호: 코멘트 내용" 또는 "- 파일명:라인번호: 코멘트 내용"
  const matches = [...aiResponse.matchAll(LINE_COMMENT_REGEX)];
  return parseLineComments(matches, diffLines);
};

const parseLineComments = (matches: RegExpExecArray[], diffLines: DiffLine[]): LineComments => {
  const lineComments: LineComment[] = [];

  for (const matchLine of matches) {
    const [fullMatch, path, lineNumberString, comment] = matchLine;
    const isDiffInChanges = diffLines.some(dl => dl.path === path);
    if (isDiffInChanges) {
      const lineNumber = parseInt(lineNumberString);
      lineComments.push({ path, line: lineNumber, side: 'RIGHT', body: comment.trim() });
    }
  }

  return lineComments as LineComments;
}