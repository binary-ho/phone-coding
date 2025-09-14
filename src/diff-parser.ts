export interface DiffLine {
  path: string;
  lineNumber: number;
  content: string;
  type: 'added' | 'removed' | 'context';
}

export type DiffLines = DiffLine[];

export const parseDiffLines = (diffString: string): DiffLines => {
  const lines = diffString.split('\n');
  const diffLines: DiffLine[] = [];
  let currentPath = '';
  let newLineNumber = 0;
  let oldLineNumber = 0;

  for (const line of lines) {
    // --- a/file.ts (이전 파일 정보)
    // +++ b/file.ts (새 파일 정보)
    if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
      // 파일 경로가 시작되는 +++ 라인에서 경로를 추출합니다.
      if (line.startsWith('+++ b/')) {
        currentPath = line.substring(6);
      }
      continue;
    }

    // @@ -oldLine,oldCount +newLine,newCount @@ (변경점 시작 위치 정보)
    if (line.startsWith('@@')) {
      // hunk 헤더에서 새로운 파일의 시작 줄 번호를 추출합니다.
      const match = line.match(/\+([0-9]+)/);
      if (match && match[1]) {
        newLineNumber = parseInt(match[1], 10);
        oldLineNumber = parseInt(line.match(/-([0-9]+)/)?.[1] || '0', 10);
      }
      continue;
    }

    if (!currentPath) {
      continue; // 파일 경로가 아직 없으면 건너뜁니다.
    }

    const type = line[0];
    const content = line.substring(1);

    switch (type) {
      case '+':
        diffLines.push({
          path: currentPath,
          lineNumber: newLineNumber,
          content: content,
          type: 'added',
        });
        newLineNumber++;
        break;
      case '-':
        diffLines.push({
          path: currentPath,
          lineNumber: oldLineNumber, // 제거된 라인은 이전 파일 기준
          content: content,
          type: 'removed',
        });
        oldLineNumber++;
        break;
      case ' ': // context 라인
        diffLines.push({
          path: currentPath,
          lineNumber: newLineNumber,
          content: content,
          type: 'context',
        });
        newLineNumber++;
        oldLineNumber++;
        break;
      default:
        // diff의 다른 라인들은 무시 (예: \ No newline at end of file)
        break;
    }
  }

  return diffLines;
};