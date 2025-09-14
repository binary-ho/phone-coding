import * as core from '@actions/core';
import * as github from '@actions/github';
import { getPullRequestContext, getPullRequestDiff } from './context';
import { buildSummarizePrompt, buildPullRequestLineCommentsPrompt } from './prompt';
import { callGeminiApi, cleanJsonAiResponse } from './gemini';
import { postOrUpdateComment } from './comment';
import {DiffLines, parseDiffLines} from './diff-parser';
import {
  convertToGithubLineComments,
  ImportanceLevel,
  isNoSummaryReviewContent,
  GithubLineComments
} from './line-comment';
import {GitHub} from "@actions/github/lib/utils";
import {PullRequestContext} from "./pull-request-context";
import {parsePullRequestReviewLineComments, PullRequestReviewLineComments} from "./prReviewComment";

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
  const isNoSummaryReview = await isNoSummaryReviewContent(
      octokit, prContext.repo, prContext.pr.number,
  );

  if (isNoSummaryReview) {
    const prompt = buildSummarizePrompt(prContext.pr.title, prContext.pr.body, diff);
    const geminiResponse = await callGeminiApi(geminiApiKey, prompt);
    await postOrUpdateComment(octokit, prContext.repo, prContext.pr.number, geminiResponse);
  }
}

const reviewPullRequestAndComment = async (pullRequestContext: PullRequestContext, diff: string, octokit: Octokit, geminiApiKey: string) => {
  const lineCommentsPrompt = buildPullRequestLineCommentsPrompt(
      pullRequestContext.pr.title, pullRequestContext.pr.body, diff
  );
  core.info(`[DEBUG] PR Line Review Prompt: ${lineCommentsPrompt}`);
  core.info(`================================================`);

  const lineCommentReviewResponse = await callGeminiApi(geminiApiKey, lineCommentsPrompt);
  core.info(`[DEBUG] PR Line Review AI Response: ${lineCommentReviewResponse}`);

  // cleansing
  const cleanedLineCommentReview = await cleanJsonAiResponse(geminiApiKey, lineCommentReviewResponse);
  core.info(`[DEBUG] Cleansed Line Comment Review AI Response: ${cleanedLineCommentReview}`);

  // filtering
  const prReviewLineComments = parsePullRequestReviewLineComments(cleanedLineCommentReview);
  const filteredPrReviewLineComments = filterLowImportanceComments(prReviewLineComments);
  core.info(`[DEBUG] Filtered line comments count (removed LOW_PRIORITY): ${filteredPrReviewLineComments.length}`);

  // diff 필터링 - 수정된 parseDiffLines 함수로 다시 활성화
  const diffLines = parseDiffLines(diff);
  core.info(`[DEBUG] Parsed diff lines count: ${diffLines.length}`);

  const filteredPrReviewLineCommentsInDiff = filterReviewInDifference(filteredPrReviewLineComments, diffLines);
  core.info(`[DEBUG] Filtered line comments count (in diff): ${filteredPrReviewLineCommentsInDiff.length}`);

  // convert to line comments
  const lineComments: GithubLineComments = convertToGithubLineComments(filteredPrReviewLineCommentsInDiff);
  core.info(`[DEBUG] Parsed line comments count: ${lineComments.length}`);

  if (lineComments.length === 0) {
    core.info('No line comments to add. Skipping line comment creation.');
    return;
  }

  const { owner: ownerName, repo: repositoryName } = pullRequestContext.repo;
  await octokit.rest.pulls.createReview({
    owner: ownerName,
    repo: repositoryName,
    pull_number: pullRequestContext.pr.number,
    event: 'COMMENT',
    comments: lineComments,
  });
}

const validateModeEnvironment = (mode: string) => {
  const validModes = ['review', 'summarize'];
  if (!validModes.includes(mode)) {
    throw new Error(`Invalid mode: ${mode}. Must be 'review' or 'summarize'.`);
  }
}

const filterLowImportanceComments = (lineComments: PullRequestReviewLineComments): PullRequestReviewLineComments =>
  lineComments.filter(comment => comment.importance !== ImportanceLevel.LOW_PRIORITY);

const isReviewLineInDiff = (diffLines: DiffLines, path: string, lineNumber: number): boolean => {
  const find = diffLines.find(diffLine =>
      diffLine.path === path && diffLine.lineNumber === lineNumber
  );
  return find !== undefined;
}

const filterReviewInDifference = (lineComments: PullRequestReviewLineComments, diffLines: DiffLines): PullRequestReviewLineComments =>
    lineComments.filter(comment => isReviewLineInDiff(diffLines, comment.filename, comment.line_number));

run();
