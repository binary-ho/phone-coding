import * as fs from 'fs';
import * as path from 'path';

// prompt 파일명
const PULL_REQUEST_SUMMARIZE_PROMPT = 'pull-request-summarize';
const LINE_COMMENT_PROMPT = 'review-korean-line-comments';

const loadPromptTemplate = (templateName: string): string => {
  const templatePath = path.join(__dirname, '..', 'prompts', `${templateName}.md`);
  return fs.readFileSync(templatePath, 'utf-8');
};

const replaceTemplateVariables = (template: string, prTitle: string, prBody: string, diff: string): string => {
  return template
    .replace(/\{\{prTitle\}\}/g, prTitle)
    .replace(/\{\{prBody\}\}/g, prBody)
    .replace(/\{\{diff\}\}/g, diff);
};

export const buildSummarizePrompt = (
  prTitle: string,
  prBody: string,
  diff: string,
): string => {
  const template = loadPromptTemplate(PULL_REQUEST_SUMMARIZE_PROMPT);
  return replaceTemplateVariables(template, prTitle, prBody, diff);
};

export const buildPullRequestLineCommentsPrompt = (
  prTitle: string,
  prBody: string,
  diff: string,
): string => {
  const template = loadPromptTemplate(LINE_COMMENT_PROMPT);
  return replaceTemplateVariables(template, prTitle, prBody, diff);
};
