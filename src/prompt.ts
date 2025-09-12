import * as fs from 'fs';
import * as path from 'path';
import { ChecklistItem } from './checklist-types';

// prompt 파일명
const PULL_REQUEST_SUMMARIZE_PROMPT = 'pull-request-summarize.md';
const LINE_COMMENT_PROMPT = 'review-and-comment-by-line.md';
const CHECKLIST_ITEM_VERIFICATION_PROMPT = 'checklist-item-verification.md';

const loadPromptTemplate = (templateName: string): string => {
  const templatePath = path.join(__dirname, '..', 'prompts', templateName);
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

export const buildChecklistItemPrompt = (
  item: ChecklistItem,
  prTitle: string,
  prBody: string,
  diff: string,
): string => {
  const template = loadPromptTemplate(CHECKLIST_ITEM_VERIFICATION_PROMPT);
  return template
    .replace(/\{\{itemTitle\}\}/g, item.title)
    .replace(/\{\{itemDescription\}\}/g, item.description)
    .replace(/\{\{itemPriority\}\}/g, item.priority || 'high')
    .replace(/\{\{prTitle\}\}/g, prTitle)
    .replace(/\{\{prBody\}\}/g, prBody)
    .replace(/\{\{diff\}\}/g, diff);
};
