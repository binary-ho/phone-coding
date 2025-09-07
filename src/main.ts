import * as core from '@actions/core';
import * as github from '@actions/github';
import { getPrContext, getPrDiff } from './context';
import { buildSummarizePrompt, buildPullRequestLineCommentsPrompt } from './prompt';
import { callGeminiApi } from './gemini';
import { postOrUpdateComment } from './comment';
import { parseDiffLines } from './diff-parser';
import { parseLineCommentReviewForLineComments } from './ai-response-parser';
import { createLineComments, findExistingReview } from './line-comment';

async function run(): Promise<void> {
  try {
    const geminiApiKey = core.getInput('gemini-api-key', { required: true });
    const githubToken = core.getInput('github-token', { required: true });
    const mode = core.getInput('mode') || 'review';

    if (mode !== 'review' && mode !== 'summarize') {
      throw new Error(`Invalid mode: ${mode}. Must be 'review' or 'summarize'.`);
    }

    const octokit = github.getOctokit(githubToken);

    const prContext = await getPrContext(octokit);
    if (!prContext) {
      core.info('This action is not running in a pull request context. Skipping.');
      return;
    }

    const diff = await getPrDiff(prContext.pr.base_sha, prContext.pr.head_sha);
    
    if (mode === 'review') {
      // 1. 요약 프롬프트로 첫 번째 API 호출 및 일반 코멘트 작성
      const summaryPrompt = buildSummarizePrompt(
        prContext.pr.title,
        prContext.pr.body,
        diff,
      );
      const summaryResponse = await callGeminiApi(geminiApiKey, summaryPrompt);
      await postOrUpdateComment(octokit, prContext.repo, prContext.pr.number, summaryResponse);
      
      // 2. 라인 코멘트 프롬프트로 두 번째 API 호출
      const lineCommentsPrompt = buildPullRequestLineCommentsPrompt(
        prContext.pr.title,
        prContext.pr.body,
        diff,
      );
      
      const lineCommentReviewResponse = await callGeminiApi(geminiApiKey, lineCommentsPrompt);
      const parsedResponse = parseLineCommentReviewForLineComments(
          lineCommentReviewResponse, parseDiffLines(diff)
      );
      
      // 기존 리뷰 확인 및 생성
      const existingReview = await findExistingReview(
        octokit, prContext.repo, prContext.pr.number,
      );
      
      if (!existingReview && parsedResponse.lineComments.length > 0) {
        await createLineComments(octokit, prContext.repo, prContext.pr.number, {
          body: parsedResponse.generalComment + '\n\n<!-- gemini-line-reviewer -->',
          comments: parsedResponse.lineComments
        });
      } else if (parsedResponse.generalComment.trim()) {
        // 라인 코멘트가 없지만 일반 코멘트가 있는 경우 기존 방식 사용
        await postOrUpdateComment(octokit, prContext.repo, prContext.pr.number, parsedResponse.generalComment);
      }
    } else {
      // 요약 모드 - 일반 코멘트 사용
      const prompt = buildSummarizePrompt(prContext.pr.title, prContext.pr.body, diff);
      const geminiResponse = await callGeminiApi(geminiApiKey, prompt);
      await postOrUpdateComment(octokit, prContext.repo, prContext.pr.number, geminiResponse);
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unknown error occurred');
    }
  }
}

run();
