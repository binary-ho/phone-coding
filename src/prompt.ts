export const buildPrompt = (
  prTitle: string,
  prBody: string,
  diff: string,
  mode: 'review' | 'summarize'
): string => {
  if (mode === 'summarize') {
    return `
      Please provide a summary of the following pull request.
      The pull request title is "${prTitle}".
      The pull request body is:
      ---
      ${prBody}
      ---
      The diff is:
      --- DIFF ---
      ${diff}
      --- END DIFF ---
    `;
  }

  return `
    Please review the following pull request.
    The pull request title is "${prTitle}".
    The pull request body is:
    ---
    ${prBody}
    ---
    The diff is:
    --- DIFF ---
    ${diff}
    --- END DIFF ---
  `;
};

export const buildPromptWithLineComments = (
  prTitle: string,
  prBody: string,
  diff: string,
  mode: 'review' | 'summarize'
): string => {
  if (mode === 'review') {
    return `
당신은 숙련된 코드 리뷰어입니다. 다음 Pull Request를 검토해주세요.

**중요: 특정 라인에 대한 코멘트는 다음 형식으로 작성해주세요:**
파일명:라인번호: 코멘트 내용

예시:
src/example.ts:42: 이 함수는 null 체크가 필요합니다.
src/utils.ts:15: 이 로직은 더 효율적으로 작성할 수 있습니다.

**PR 제목:** ${prTitle}

**PR 설명:**
${prBody}

**변경 사항:**
\`\`\`diff
${diff}
\`\`\`

전체적인 리뷰 요약과 함께 개선이 필요한 특정 라인들에 대해 위 형식으로 코멘트해주세요.
`;
  }
  
  // summarize 모드는 기존과 동일
  return buildPrompt(prTitle, prBody, diff, mode);
};
