export type PullRequestContext = {
  repo: { owner: string; repo: string };
  pr: { number: number; title: any; body: string; base_sha: any; head_sha: any },
}