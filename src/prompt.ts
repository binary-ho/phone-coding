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
