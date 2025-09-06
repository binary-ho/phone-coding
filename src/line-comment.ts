import * as github from '@actions/github';

export interface LineComment {
  path: string;
  line: number;
  side: 'LEFT' | 'RIGHT';
  body: string;
}

export interface ReviewData {
  body: string;
  comments: LineComment[];
}

export const createLineComments = async (
  octokit: ReturnType<typeof github.getOctokit>,
  repo: { owner: string; repo: string },
  pull_number: number,
  reviewData: ReviewData
) => {
  return await octokit.rest.pulls.createReview({
    ...repo,
    pull_number,
    body: reviewData.body,
    event: 'COMMENT',
    comments: reviewData.comments,
  });
};

export const findExistingReview = async (
  octokit: ReturnType<typeof github.getOctokit>,
  repo: { owner: string; repo: string },
  pull_number: number
) => {
  const { data: currentUser } = await octokit.rest.users.getAuthenticated();
  const botUsername = currentUser.login;

  const { data: reviews } = await octokit.rest.pulls.listReviews({
    ...repo,
    pull_number,
  });

  return reviews.find(
    review => review.user?.login === botUsername && 
              review.body?.includes('<!-- gemini-line-reviewer -->')
  );
};