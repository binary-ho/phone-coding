import * as github from '@actions/github';
import {PullRequestReviewLineComments} from "./prReviewComment";

export enum ImportanceLevel {
  CRITICAL = 'CRITICAL',
  HIGH_PRIORITY = 'HIGH_PRIORITY',
  MEDIUM_PRIORITY = 'MEDIUM_PRIORITY',
  LOW_PRIORITY = 'LOW_PRIORITY',
}

interface ImportanceMeta {
  emoji: string;
  label: string;
  description: string;
}

export const IMPORTANCE: Record<ImportanceLevel, ImportanceMeta> = {
  [ImportanceLevel.CRITICAL]: {
    emoji: '🔴',
    label: 'CRITICAL',
    description: 'Must fix before merging (e.g. bugs, Runtime Errors, security Issues, Syntax Error)'
  },
  [ImportanceLevel.HIGH_PRIORITY]: {
    emoji: '🟠',
    label: 'HIGH_PRIORITY',
    description: 'Should fix before merging (e.g. coding convention with codebase, potential bugs)'
  },
  [ImportanceLevel.MEDIUM_PRIORITY]: {
    emoji: '🟡',
    label: 'MEDIUM_PRIORITY',
    description: 'Can fix before or after merging (e.g. naming convention, OOP principle, code structure)'
  },
  [ImportanceLevel.LOW_PRIORITY]: {
    emoji: '🟢',
    label: 'LOW_PRIORITY',
    description: 'Optional improvement (e.g. documentation, code comments)'
  }
};

export type GithubLineComments = GithubLineComment[];

export interface GithubLineComment {
  path: string;
  line: number;
  side: 'LEFT' | 'RIGHT';
  body: string;
}

export const convertToGithubLineComments = (pullRequestReviewLineComments: PullRequestReviewLineComments): GithubLineComments =>
  pullRequestReviewLineComments.map(comment => {
    return {
      path: comment.filename,
      line: comment.line_number,
      side: 'RIGHT',
      body: addImportanceInComment(comment.comment, comment.importance),
    } as GithubLineComment;
  });

const addImportanceInComment = (commentBody: string, importanceLevel?: ImportanceLevel): string => {
  if (!importanceLevel) {
    return commentBody;
  }

  const meta = IMPORTANCE[importanceLevel];
  return `${meta.emoji} ${meta.label}\n\n${commentBody}`;
};

export interface ReviewData {
  body: string;
  comments: GithubLineComment[];
}

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