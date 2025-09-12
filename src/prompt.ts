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

const replaceTemplateVariablesWithDiffList = (template: string, prTitle: string, prDescription: string, diffList: string): string => {
  return template
    .replace(/\{\{prTitle\}\}/g, prTitle)
    .replace(/\{\{prDescription\}\}/g, prDescription)
    .replace(/\{\{diffList\}\}/g, diffList);
};

const parseDiffByFile = (diff: string): string => {
  // diff를 파일별로 분리하고 각각을 <code_diff> 태그로 감싸기
  const fileDiffs = diff.split('diff --git').filter(section => section.trim());
  
  if (isFirstItem(fileDiffs.length)) {
    return formatCodeDiffWithIndent(diff);
  }
  
  return fileDiffs.map(fileDiff => {
    // 첫 번째 파일이 아닌 경우 'diff --git' 접두사 복원
    const fullDiff = fileDiff.startsWith(' ') ? `diff --git${fileDiff}` : fileDiff;
    return formatCodeDiffWithIndent(fullDiff.trim());
  }).join('\n');
};

const isFirstItem = (index: number): boolean => index === 0;

const formatCodeDiffWithIndent = (diffContent: string): string => {
  const baseIndent = '            '; // 원본 <code_diff> 태그의 들여쓰기에 맞춤 (12 spaces)
  const indentedContent = addIndentToLines(diffContent, baseIndent);
  return `        <code_diff>\n${indentedContent}\n        </code_diff>`;
};

// diff 내용의 각 줄에 들여쓰기 추가
const addIndentToLines = (text: string, indent: string): string => {
  return text
    .split('\n')
    .map(line => line.length > 0 ? indent + line : line)
    .join('\n');
}

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
  const diffList = parseDiffByFile(diff);
  return replaceTemplateVariablesWithDiffList(template, prTitle, prDescription, diffList);
};
