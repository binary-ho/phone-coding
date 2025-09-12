import {LineComment, LineComments} from './line-comment';
import { DiffLine } from './diff-parser';
import * as core from '@actions/core';

// Enhanced regex to handle various formatting styles
const LINE_COMMENT_REGEX = /^[-•\d.\s]*(.+):(\d+):\s*(.+)$/gm;

export const parseLineCommentReviewForLineComments = (
  aiResponse: string,
  diffLines: DiffLine[]
): LineComments => {
  core.info(`[DEBUG] Parsing AI response for line comments. Response length: ${aiResponse.length}`);
  
  const matches: RegExpExecArray[] = [...aiResponse.matchAll(LINE_COMMENT_REGEX)];
  core.info(`[DEBUG] Found ${matches.length} potential line comment matches`);
  
  if (matches.length === 0) {
    core.info(`[DEBUG] No line comment patterns found. AI Response: ${aiResponse.substring(0, 200)}...`);
  }
  
  return parseLineComments(matches, diffLines);
};

const parseLineComments = (matches: RegExpExecArray[], diffLines: DiffLine[]): LineComments => {
  const lineComments: LineComment[] = [];

  for (const matchLine of matches) {
    const [fullMatch, rawPath, lineNumberString, comment] = matchLine;
    
    // Clean the file path by removing any remaining formatting characters
    const cleanPath = rawPath.trim()
      .replace(/^[-•\d.\s]+/, '') // Remove leading formatting
      .replace(/^\s+/, '') // Remove leading whitespace
      .trim();
    
    const lineNumber = parseInt(lineNumberString);
    
    core.info(`[DEBUG] Processing line comment: "${cleanPath}:${lineNumber}"`);
    
    if (isReviewLineInDiff(diffLines, cleanPath, lineNumber)) {
      lineComments.push({ path: cleanPath, line: lineNumber, side: 'RIGHT', body: comment.trim() });
      core.info(`[DEBUG] ✅ Added line comment for ${cleanPath}:${lineNumber}`);
    } else {
      core.info(`[DEBUG] ❌ Skipped line comment for ${cleanPath}:${lineNumber} - not found in diff`);
      core.info(`[DEBUG] Available diff paths: ${diffLines.map(d => d.path).join(', ')}`);
    }
  }

  core.info(`[DEBUG] Total line comments created: ${lineComments.length}`);
  return lineComments as LineComments;
}

const isReviewLineInDiff = (diffLines: DiffLine[], path: string, lineNumber: number): boolean => {
  const find = diffLines.find(diffLine =>
      diffLine.path === path && diffLine.lineNumber === lineNumber
  );
  return find !== undefined;
}
