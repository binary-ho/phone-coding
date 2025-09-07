import {LineComment, LineComments} from './line-comment';
import { DiffLine } from './diff-parser';

// "파일명:라인번호: 코멘트 내용" 또는 "- 파일명:라인번호: 코멘트 내용"
const LINE_COMMENT_REGEX = /^-?\s*(.+):(\d+):\s*(.+)$/gm;

export const parseLineCommentReviewForLineComments = (
  aiResponse: string,
  diffLines: DiffLine[]
): LineComments => {
  const matches: RegExpExecArray[] = [...aiResponse.matchAll(LINE_COMMENT_REGEX)];
  return parseLineComments(matches, diffLines);
};

const parseLineComments = (matches: RegExpExecArray[], diffLines: DiffLine[]): LineComments => {
  const lineComments: LineComment[] = [];

  for (const matchLine of matches) {
    const [fullMatch, path, lineNumberString, comment] = matchLine;
    const lineNumber = parseInt(lineNumberString);

    if (isReviewLineInDiff(diffLines, path, lineNumber)) {
      lineComments.push({ path, line: lineNumber, side: 'RIGHT', body: comment.trim() });
    }
  }

  return lineComments as LineComments;
}

const isReviewLineInDiff = (diffLines: DiffLine[], path: string, lineNumber: number): boolean => {
  const find = diffLines.find(diffLine =>
      diffLine.path === path && diffLine.lineNumber === lineNumber
  );
  return find !== undefined;
}
