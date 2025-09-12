import * as github from '@actions/github';

export type LineComments = LineComment[];

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

export const IMPORTANCE_META: Record<ImportanceLevel, ImportanceMeta> = {
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

export interface LineComment {
  path: string;
  line: number;
  side: 'LEFT' | 'RIGHT';
  body: string;
  importance?: ImportanceLevel;
}

export const formatCommentWithImportance = (comment: LineComment): string => {
  if (!comment.importance) {
    return comment.body;
  }
  
  const meta = IMPORTANCE_META[comment.importance];
  return `- 중요도: ${meta.emoji} ${meta.label}\n\n-----------------------\n\n${comment.body}`;
};

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
  // 중요도가 포함된 형식으로 댓글 포맷팅
  const formattedComments = lineComments.map(comment => ({
    ...comment,
    body: formatCommentWithImportance(comment)
  }));

  return await octokit.rest.pulls.createReview({
    ...repo,
    pull_number,
    event: 'COMMENT',
    comments: formattedComments,
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