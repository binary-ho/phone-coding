import * as github from '@actions/github';
import {PullRequestContext} from "./pull-request-context";

export const getPullRequestContext = async (
  octokit: ReturnType<typeof github.getOctokit>
): Promise<PullRequestContext> => {
  const { context } = github;
  const { payload, repo, issue } = context;

  // If the event is not a pull request, return undefined to allow for graceful exit.
  if (!payload.pull_request) {
    return undefined;
  }

  const { number } = payload.pull_request;
  const { data: pr } = await octokit.rest.pulls.get({
    ...repo,
    pull_number: number,
  });

  return {
    repo,
    pr: {
      number: issue.number,
      title: pr.title,
      body: pr.body || '',
      base_sha: pr.base.sha,
      head_sha: pr.head.sha,
    },
  } as PullRequestContext;
};

export const getPullRequestDiff = async (
  octokit: ReturnType<typeof github.getOctokit>,
  repo: { owner: string; repo: string },
  pullNumber: number
): Promise<string> => {
  const { data } = await octokit.rest.pulls.get({
    ...repo,
    pull_number: pullNumber,
    mediaType: { format: 'diff' },
  });
  
  return data as unknown as string;
};
