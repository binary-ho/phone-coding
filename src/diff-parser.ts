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
    if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
      if (line.startsWith('+++ b/')) {
        currentPath = line.substring(6);
      }
      continue;
    }

    if (line.startsWith('@@')) {
      const match = line.match(/\+([0-9]+)/);
      if (match?.[1]) {
        newLineNumber = parseInt(match[1], 10);
      }
      const oldMatch = line.match(/-([0-9]+)/);
      if (oldMatch?.[1]) {
        oldLineNumber = parseInt(oldMatch[1], 10);
      }
      continue;
    }

    if (!currentPath) {
      continue;
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

      case '-':
        // oldLineNumber 카운트는 유지해야 다음 context 라인 번호 정확
        oldLineNumber++;
        break;

      default:
        break;
    }
  }

  return diffLines;
};