import * as github from '@actions/github';

const COMMENT_TAG = '<!-- gemini-reviewer -->';

export const findPreviousComment = async (
  octokit: ReturnType<typeof github.getOctokit>,
  repo: { owner: string; repo: string },
  issue_number: number
) => {
  const { data: currentUser } = await octokit.rest.users.getAuthenticated();
  const botUsername = currentUser.login;

  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    ...repo,
    issue_number,
  });

  return comments.find(
    comment =>
      comment.user?.login === botUsername && comment.body?.includes(COMMENT_TAG)
  );
};

export const postOrUpdateComment = async (
  octokit: ReturnType<typeof github.getOctokit>,
  repo: { owner: string; repo: string },
  issue_number: number,
  body: string
) => {
  const previousComment = await findPreviousComment(octokit, repo, issue_number);
  const commentBody = `${body}\n\n${COMMENT_TAG}`;

  if (previousComment) {
    await octokit.rest.issues.updateComment({
      ...repo,
      comment_id: previousComment.id,
      body: commentBody,
    });
  } else {
    await octokit.rest.issues.createComment({
      ...repo,
      issue_number,
      body: commentBody,
    });
  }
};
