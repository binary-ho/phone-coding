import {LineComment, LineComments, ImportanceLevel} from './line-comment';
import { DiffLine } from './diff-parser';

interface AILineComment {
  filename: string;
  line_number: number;
  comment: string;
  importance: ImportanceLevel;
}

interface AIResponse {
  line_comments: AILineComment[];
}

export const parseLineCommentReviewForLineComments = (
  aiResponse: string,
  diffLines: DiffLine[]
): LineComments => {
  try {
    const parsedResponse: AIResponse = JSON.parse(aiResponse);
    return parseLineCommentsFromJSON(parsedResponse, diffLines);
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error);
    // Fallback to legacy regex parsing
    const matches: RegExpExecArray[] = [...aiResponse.matchAll(LINE_COMMENT_REGEX)];
    return parseLineCommentsLegacy(matches, diffLines);
  }
};

const parseLineCommentsFromJSON = (aiResponse: AIResponse, diffLines: DiffLine[]): LineComments => {
  return aiResponse.line_comments
    .filter(comment =>  comment.importance !== ImportanceLevel.LOW_PRIORITY)
    .filter(comment => isReviewLineInDiff(diffLines, comment.filename, comment.line_number))
    .map(comment => {
      return {
        path: comment.filename,
        line: comment.line_number,
        side: 'RIGHT',
        body: comment.comment.trim(),
        importance: comment.importance
      } as LineComment;
    });
};

const LINE_COMMENT_REGEX = /^-?\s*(.+):(\d+):\s*(.+)$/gm;

const parseLineCommentsLegacy = (matches: RegExpExecArray[], diffLines: DiffLine[]): LineComments => {
  const lineComments: LineComment[] = [];

  for (const matchLine of matches) {
    const [fullMatch, path, lineNumberString, comment] = matchLine;
    const lineNumber = parseInt(lineNumberString);

    if (isReviewLineInDiff(diffLines, path, lineNumber)) {
      const cleanedComment = removePriorityTag(comment);
      lineComments.push({ path, line: lineNumber, side: 'RIGHT', body: cleanedComment });
    }
  }

  return lineComments as LineComments;
}

const removePriorityTag = (comment: string): string => {
  return comment.trim()
    // 맨 끝 (PRIORITY) 형태
    .replace(/\s*\([A-Z_]+PRIORITY\)\s*$/, '')
    // 맨 끝 `PRIORITY` 형태 (백틱)
    .replace(/\s*`[A-Z_]+PRIORITY`\s*$/, '')
    // 맨 앞 이모지 + PRIORITY 형태 (🟡 MEDIUM_PRIORITY)
    .replace(/^[\u{1F300}-\u{1F9FF}]?\s*[A-Z_]+PRIORITY\s*/u, '')
    // 맨 앞 파일명:라인번호: 형태 (이미 regex로 분리되었지만 혹시 모를 케이스)
    .replace(/^[^:]+:\d+:\s*/, '');
}

const isReviewLineInDiff = (diffLines: DiffLine[], path: string, lineNumber: number): boolean => {
  const find = diffLines.find(diffLine =>
      diffLine.path === path && diffLine.lineNumber === lineNumber
  );
  return find !== undefined;
}