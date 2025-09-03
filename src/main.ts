import * as core from '@actions/core';
import * as github from '@actions/github';
import { getPrContext, getPrDiff } from './context';
import { buildPrompt } from './prompt';
import { callGeminiApi } from './gemini';
import { postOrUpdateComment } from './comment';

async function run(): Promise<void> {
  try {
    const geminiApiKey = core.getInput('gemini-api-key', { required: true });
    const githubToken = core.getInput('github-token', { required: true });
    const mode = core.getInput('mode') || 'review';

    if (mode !== 'review' && mode !== 'summarize') {
      throw new Error(`Invalid mode: ${mode}. Must be 'review' or 'summarize'.`);
    }

    const octokit = github.getOctokit(githubToken);

    const prContext = await getPrContext();
    if (!prContext) {
      core.info('This action is not running in a pull request context. Skipping.');
      return;
    }

    const diff = await getPrDiff(prContext.pr.base_sha, prContext.pr.head_sha);
    const prompt = buildPrompt(prContext.pr.title, prContext.pr.body, diff, mode);
    const geminiResponse = await callGeminiApi(geminiApiKey, prompt);

    await postOrUpdateComment(octokit, prContext.repo, prContext.pr.number, geminiResponse);

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unknown error occurred');
    }
  }
}

run();
