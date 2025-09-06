import * as core from '@actions/core';
import * as github from '@actions/github';
import { getPrContext, getPrDiff } from './context';
import { buildPrompt, buildPromptWithLineComments } from './prompt';
import { callGeminiApi } from './gemini';
import { postOrUpdateComment } from './comment';
import { parseDiff } from './diff-parser';
import { parseAIResponseForLineComments } from './ai-response-parser';
import { createLineComments, findExistingReview } from './line-comment';

async function run(): Promise<void> {
  try {
    const geminiApiKey = core.getInput('gemini-api-key', { required: true });
    const githubToken = core.getInput('github-token', { required: true });
    const mode = core.getInput('mode') || 'review';
    const enableLineComments = core.getInput('enable-line-comments') === 'true';

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
    
    if (enableLineComments) {
      // 라인 코멘트 모드
      const prompt = buildPromptWithLineComments(
        prContext.pr.title,
        prContext.pr.body,
        diff,
        mode
      );
      
      const aiResponse = await callGeminiApi(geminiApiKey, prompt);
      const diffLines = parseDiff(diff);
      const parsedResponse = parseAIResponseForLineComments(aiResponse, diffLines);
      
      // 기존 리뷰 확인 및 생성
      const existingReview = await findExistingReview(
        octokit,
        prContext.repo,
        prContext.pr.number
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
      // 기존 일반 코멘트 모드
      const prompt = buildPrompt(prContext.pr.title, prContext.pr.body, diff, mode);
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
