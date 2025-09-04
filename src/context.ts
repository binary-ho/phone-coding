import * as github from '@actions/github';
import * as exec from '@actions/exec';

export const getPrContext = async (
  octokit: ReturnType<typeof github.getOctokit>
) => {
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
  };
};

export const getPrDiff = async (baseSha: string, headSha: string): Promise<string> => {
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
