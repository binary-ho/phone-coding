import * as fs from 'fs';
import * as path from 'path';

// prompt 파일명
const PULL_REQUEST_SUMMARIZE_PROMPT = 'pull-request-summarize.xml';
const LINE_COMMENT_PROMPT = 'review-and-comment-by-line.xml';

const loadPromptTemplate = (templateName: string): string => {
  const templatePath = path.join(__dirname, '..', 'prompts', templateName);
  return fs.readFileSync(templatePath, 'utf-8');
};

const replaceTemplateVariables = (template: string, prTitle: string, prDescription: string, diff: string): string => {
  return template
    .replace(/\{\{prTitle\}\}/g, prTitle)
    .replace(/\{\{prDescription\}\}/g, prDescription)
    .replace(/\{\{diff\}\}/g, diff);
};

export const buildSummarizePrompt = (
  prTitle: string,
  prDescription: string,
  diff: string,
): string => {
  const template = loadPromptTemplate(PULL_REQUEST_SUMMARIZE_PROMPT);
  return replaceTemplateVariables(template, prTitle, prDescription, diff);
};

export const buildPullRequestLineCommentsPrompt = (
  prTitle: string,
  prDescription: string,
  diff: string,
): string => {
  const template = loadPromptTemplate(LINE_COMMENT_PROMPT);
  return replaceTemplateVariables(template, prTitle, prDescription, diff);
};
