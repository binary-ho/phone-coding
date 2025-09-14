export type PullRequestContext = {
  repo: { owner: string; repo: string };
  pr: { number: number; title: string; body: string; base_sha: string; head_sha: string },
}