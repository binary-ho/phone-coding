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
    
    // 변경 내용 파싱 - GitHub API diff 기준
    if (line.startsWith('+') && !line.startsWith('+++')) {
      result.push({
        path: currentPath,
        lineNumber: newLineNumber, // GitHub API가 제공하는 새 파일 라인 번호
        content: line.substring(1),
        type: 'added'
      });
      newLineNumber++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      oldLineNumber++;
    } else if (line.startsWith(' ')) {
      result.push({
        path: currentPath,
        lineNumber: newLineNumber, // GitHub API 기준 새 파일 라인 번호
        content: line.substring(1),
        type: 'context'
      });
      oldLineNumber++;
      newLineNumber++;
    }
  }

  return result;
};