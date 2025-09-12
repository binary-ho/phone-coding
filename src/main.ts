import * as core from '@actions/core';
import * as github from '@actions/github';
import { getPullRequestContext, getPullRequestDiff } from './context';
import { buildSummarizePrompt, buildPullRequestLineCommentsPrompt } from './prompt';
import { callGeminiApi } from './gemini';
import { postOrUpdateComment, postOrUpdateChecklistComment } from './comment';
import { parseDiffLines } from './diff-parser';
import { parseLineCommentReviewForLineComments } from './ai-response-parser';
import {createLineComments, findExistingReview, LineComments} from './line-comment';
import {GitHub} from "@actions/github/lib/utils";
import {PullRequestContext} from "./pull-request-context";
import { ChecklistProcessor } from './checklist-processor';
import * as fs from 'fs';

type Octokit = InstanceType<typeof GitHub>;

async function run(): Promise<void> {
  try {
    const geminiApiKey = core.getInput('gemini-api-key', { required: true });
    const githubToken = core.getInput('github-token', { required: true });
    const checklistPath = core.getInput('checklist-path');

    const mode = core.getInput('mode') || 'review';
    validateModeEnvironment(mode);

    const octokit: Octokit = github.getOctokit(githubToken);
    const pullRequestContext: PullRequestContext = await getPullRequestContext(octokit);

    const diff = await getPullRequestDiff(pullRequestContext.pr.base_sha, pullRequestContext.pr.head_sha);

    // 1. 체크리스트 처리 (최우선)
    if (checklistPath && fs.existsSync(checklistPath)) {
      core.info(`Processing checklist from: ${checklistPath}`);
      await processChecklist(pullRequestContext, diff, octokit, geminiApiKey, checklistPath);
    } else if (checklistPath) {
      core.info(`Checklist file not found: ${checklistPath}, skipping checklist processing`);
    }

    // 2. 요약
    await summaryPullRequestAndComment(pullRequestContext, diff, octokit, geminiApiKey);

    if (mode !== 'summarize') {
      // 3. PR Review + Line Comment
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
  core.info(`[DEBUG] PR Line Review Prompt: ${lineCommentsPrompt}`);

  const lineCommentReviewResponse = await callGeminiApi(geminiApiKey, lineCommentsPrompt);
  core.info(`[DEBUG] PR Line Review AI Response: ${lineCommentReviewResponse}`);

  const diffLines = parseDiffLines(diff);
  core.info(`[DEBUG] Parsed diff lines count: ${diffLines.length}`);

  const lineComments: LineComments = parseLineCommentReviewForLineComments(
      lineCommentReviewResponse, diffLines
  );
  core.info(`[DEBUG] Parsed line comments count: ${lineComments.length}`);

  if (lineComments.length === 0) {
    core.info('No line comments to add. Skipping line comment creation.');
    return;
  }

  await createLineComments(
      octokit, pullRequestContext.repo, pullRequestContext.pr.number, lineComments
  );
}

const processChecklist = async (
  prContext: PullRequestContext,
  diff: string,
  octokit: Octokit,
  geminiApiKey: string,
  checklistPath: string
) => {
  try {
    const processor = new ChecklistProcessor();
    const checklist = await processor.loadChecklist(checklistPath);
    
    // 초기 체크리스트 코멘트 생성 (진행 상황 표시용)
    const initialComment = processor.generateChecklistComment(checklist.checklist.items);
    await postOrUpdateChecklistComment(octokit, prContext.repo, prContext.pr.number, initialComment);
    core.info('Posted initial checklist comment');
    
    // 각 항목별 개별 처리 (GitHub API 호출 최소화를 위해 중간 업데이트 제거)
    for (const item of checklist.checklist.items) {
      core.info(`Processing checklist item: ${item.id} - ${item.title}`);
      
      const processedItem = await processor.processItem(item, {
        prTitle: prContext.pr.title,
        prBody: prContext.pr.body,
        diff,
        geminiApiKey
      });
      
      // 처리된 항목으로 업데이트 (메모리에서만)
      processor.updateItem(processedItem);
      core.info(`Completed processing item: ${item.id} with status: ${processedItem.status}`);
      
      // Gemini API 호출 간격 조절 (Secondary Rate Limit 회피)
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 모든 항목 처리 완료 후 최종 결과만 1회 업데이트
    const finalComment = processor.generateChecklistComment(processor.getItems());
    await postOrUpdateChecklistComment(octokit, prContext.repo, prContext.pr.number, finalComment);
    core.info('Updated final checklist comment with all results');
    
    core.info('Completed all checklist items processing');
  } catch (error) {
    core.error(`Checklist processing failed: ${error.message}`);
    // 체크리스트 실패가 전체 워크플로우를 중단시키지 않도록 함
  }
};

const validateModeEnvironment = (mode: string) => {
  const validModes = ['review', 'summarize'];
  if (!validModes.includes(mode)) {
    throw new Error(`Invalid mode: ${mode}. Must be 'review' or 'summarize'.`);
  }
}

run();
