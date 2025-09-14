export interface DiffLine {
  path: string;
  lineNumber: number;
  content: string;
  type: 'added' | 'removed' | 'context';
}

export type DiffLines = DiffLine[];

export const parseDiffLines = (diff: string): DiffLines => {
  const lines = diff.split('\n');
  const result: DiffLines = [];
  let currentPath = '';
  let oldLineNumber = 0;
  let newLineNumber = 0;

  for (const line of lines) {
    // 파일 경로 파싱
    if (line.startsWith('diff --git')) {
      const match = line.match(/diff --git a\/(.*) b\/(.*)/);
      if (match) {
        currentPath = match[2];
      }
    }
    
    // 라인 번호 파싱
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        oldLineNumber = parseInt(match[1]);
        newLineNumber = parseInt(match[2]);
      }
    }
    
    // 변경 내용 파싱
    if (line.startsWith('+') && !line.startsWith('+++')) {
      result.push({
        path: currentPath,
        lineNumber: newLineNumber,
        content: line.substring(1),
        type: 'added'
      });
      newLineNumber++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      result.push({
        path: currentPath,
        lineNumber: newLineNumber, // AI는 새 파일 기준으로 코멘트하므로 newLineNumber 사용
        content: line.substring(1),
        type: 'removed'
      });
      oldLineNumber++;
    } else if (line.startsWith(' ')) {
      // 컨텍스트 라인 - 라인 번호만 추적하고 결과에는 포함하지 않음
      oldLineNumber++;
      newLineNumber++;
    }
  }

  return result;
};