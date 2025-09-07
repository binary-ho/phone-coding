import * as core from '@actions/core';
import * as github from '@actions/github';
import { getPullRequestContext, getPullRequestDiff } from './context';
import { buildSummarizePrompt, buildPullRequestLineCommentsPrompt } from './prompt';
import { callGeminiApi } from './gemini';
import { postOrUpdateComment } from './comment';
import { parseDiffLines } from './diff-parser';
import { parseLineCommentReviewForLineComments } from './ai-response-parser';
import {createLineComments, findExistingReview} from './line-comment';
import {GitHub} from "@actions/github/lib/utils";
import {PullRequestContext} from "./pull-request-context";

type Octokit = InstanceType<typeof GitHub>;

async function run(): Promise<void> {
  try {
    const geminiApiKey = core.getInput('gemini-api-key', { required: true });
    const githubToken = core.getInput('github-token', { required: true });

    const mode = core.getInput('mode') || 'review';
    validateModeEnvironment(mode);

    const octokit: Octokit = github.getOctokit(githubToken);
    const pullRequestContext: PullRequestContext = await getPullRequestContext(octokit);

    const diff = await getPullRequestDiff(pullRequestContext.pr.base_sha, pullRequestContext.pr.head_sha);

    // 1. 요약
    await summaryPullRequestAndComment(pullRequestContext, diff, octokit, geminiApiKey);

    if (mode !== 'summarize') {
      // 2. PR Review + Line Comment
      core.info('[DEBUG] Starting PR review and line comment process...');
      await reviewPullRequestAndComment(pullRequestContext, diff, octokit, geminiApiKey);
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unknown error occurred');
    }
  }
}

const summaryPullRequestAndComment = async (
    prContext: PullRequestContext, diff: string, octokit: Octokit, geminiApiKey: string) => {
  const prompt = buildSummarizePrompt(prContext.pr.title, prContext.pr.body, diff);
  const existingReview = await findExistingReview(
      octokit, prContext.repo, prContext.pr.number,
  );

  if (!existingReview) {
    const geminiResponse = await callGeminiApi(geminiApiKey, prompt);
    await postOrUpdateComment(octokit, prContext.repo, prContext.pr.number, geminiResponse);
  }
}

const reviewPullRequestAndComment = async (pullRequestContext: PullRequestContext, diff: string, octokit: Octokit, geminiApiKey: string) => {
  const lineCommentsPrompt = buildPullRequestLineCommentsPrompt(
      pullRequestContext.pr.title, pullRequestContext.pr.body, diff
  );
  const lineCommentReviewResponse = await callGeminiApi(geminiApiKey, lineCommentsPrompt);
  core.info(`[DEBUG] AI Response: ${lineCommentReviewResponse}`);

  const diffLines = parseDiffLines(diff);
  core.info(`[DEBUG] Parsed diff lines count: ${diffLines.length}`);

  const parsedResponse = parseLineCommentReviewForLineComments(
      lineCommentReviewResponse, diffLines
  );

  core.info(`[DEBUG] Parsed line comments count: ${parsedResponse.lineComments.length}`);

  if (parsedResponse.lineComments.length === 0) {
    core.info('No line comments to add. Skipping line comment creation.');
    return;
  }

  await createLineComments(octokit, pullRequestContext.repo, pullRequestContext.pr.number, {
    body: parsedResponse.generalComment + '\n\n<!-- gemini-line-reviewer -->',
    comments: parsedResponse.lineComments
  });
}

const validateModeEnvironment = (mode: string) => {
  const validModes = ['review', 'summarize'];
  if (!validModes.includes(mode)) {
    throw new Error(`Invalid mode: ${mode}. Must be 'review' or 'summarize'.`);
  }
}

run();
