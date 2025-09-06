export interface DiffLine {
  path: string;
  lineNumber: number;
  content: string;
  type: 'added' | 'removed' | 'context';
}

export const parseDiff = (diff: string): DiffLine[] => {
  const lines = diff.split('\n');
  const result: DiffLine[] = [];
  let currentPath = '';
  let lineNumber = 0;

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
      const match = line.match(/@@ -\d+,?\d* \+(\d+),?\d* @@/);
      if (match) {
        lineNumber = parseInt(match[1]);
      }
    }
    
    // 변경 내용 파싱
    if (line.startsWith('+') && !line.startsWith('+++')) {
      result.push({
        path: currentPath,
        lineNumber: lineNumber,
        content: line.substring(1),
        type: 'added'
      });
      lineNumber++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      result.push({
        path: currentPath,
        lineNumber: lineNumber,
        content: line.substring(1),
        type: 'removed'
      });
    } else if (!line.startsWith('@@') && !line.startsWith('diff')) {
      lineNumber++;
    }
  }

  return result;
};