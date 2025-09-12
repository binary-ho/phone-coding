import * as github from '@actions/github';

export type LineComments = LineComment[];

export enum ImportanceLevel {
  CRITICAL = 'CRITICAL',
  HIGH_PRIORITY = 'HIGH_PRIORITY',
  MEDIUM_PRIORITY = 'MEDIUM_PRIORITY',
  LOW_PRIORITY = 'LOW_PRIORITY',
}

export interface LineComment {
  path: string;
  line: number;
  side: 'LEFT' | 'RIGHT';
  body: string;
  importance?: ImportanceLevel;
}

export interface ReviewData {
  body: string;
  comments: LineComment[];
}

export const createLineComments = async (
  octokit: ReturnType<typeof github.getOctokit>,
  repo: { owner: string; repo: string },
  pull_number: number,
  lineComments: LineComments,
) => {
  return await octokit.rest.pulls.createReview({
    ...repo,
    pull_number,
    event: 'COMMENT',
    comments: lineComments,
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

export const isNoSummaryReviewContent = async (
    octokit: ReturnType<typeof github.getOctokit>,
    repo: { owner: string; repo: string },
    pull_number: number
) => {
  const isExist = !!(await findExistingReview(octokit, repo, pull_number));
  return !isExist;
}