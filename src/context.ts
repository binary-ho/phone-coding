import * as github from '@actions/github';
import * as exec from '@actions/exec';
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

export const getPullRequestDiff = async (baseSha: string, headSha: string): Promise<string> => {
  let diff = '';
  const options = {
    listeners: {
      stdout: (data: Buffer) => {
        diff += data.toString();
      },
    },
  };

  // fetch-depth: 0 is required for git diff to work correctly.
  await exec.exec(`git diff --no-color ${baseSha}..${headSha}`, [], options);

  return diff;
};
