import { LineComment } from './line-comment';
import { DiffLine } from './diff-parser';

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
  const lineCommentRegex = /^-?\s*(.+):(\d+):\s*(.+)$/gm;
  const lineComments: LineComment[] = [];
  let generalComment = aiResponse;

  let match;
  while ((match = lineCommentRegex.exec(aiResponse)) !== null) {
    const [fullMatch, path, lineStr, comment] = match;
    const line = parseInt(lineStr);
    
    // diff에서 해당 라인이 존재하는지 확인
    const diffLine = diffLines.find(dl => 
      dl.path === path && dl.lineNumber === line
    );
    
    if (diffLine) {
      lineComments.push({
        path,
        line,
        side: 'RIGHT',
        body: comment.trim()
      });
      
      // 일반 코멘트에서 라인 코멘트 제거
      generalComment = generalComment.replace(fullMatch, '');
    }
  }

  return {
    generalComment: generalComment.trim(),
    lineComments
  };
};