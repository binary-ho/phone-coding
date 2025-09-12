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
  const prDescriptionIndent = detectVariableIndent(template, 'prDescription');
  const prTitleIndent = detectVariableIndent(template, 'prTitle');
  
  const indentedPrDescription = addIndentToLines(prDescription, prDescriptionIndent);
  const indentedPrTitle = addIndentToLines(prTitle, prTitleIndent);
  
  return template
    .replace(/\{\{prTitle\}\}/g, indentedPrTitle)
    .replace(/\{\{prDescription\}\}/g, indentedPrDescription)
    .replace(/(\s*)\{\{diffList\}\}/g, diffList); // 앞의 공백을 제거하고 diffList로 대체
};

const detectVariableIndent = (template: string, variableName: string): string => {
  const lines = template.split('\n');
  const variableLine = lines.find(line => line.includes(`{{${variableName}}}`));
  
  if (!variableLine) {
    return '';
  }
  
  const match = variableLine.match(/^(\s*)/);
  return match ? match[1] : '';
};

const parseDiffByFile = (diff: string, template: string): string => {
  // diff를 파일별로 분리하고 각각을 <code_diff> 태그로 감싸기
  const fileDiffs = diff.split('diff --git').filter(section => section.trim());
  const diffListIndent = detectDiffListIndent(template);
  
  if (isFirstItem(fileDiffs.length)) {
    return formatCodeDiffWithIndent(diff, diffListIndent);
  }
  
  return fileDiffs.map(fileDiff => {
    // 첫 번째 파일이 아닌 경우 'diff --git' 접두사 복원
    const fullDiff = fileDiff.startsWith(' ') ? `diff --git${fileDiff}` : fileDiff;
    return formatCodeDiffWithIndent(fullDiff.trim(), diffListIndent);
  }).join('\n');
};

const isFirstItem = (index: number): boolean => index === 0;

const detectDiffListIndent = (template: string): { codeTagIndent: string; contentIndent: string } => {
  // {{diffList}} 변수가 있는 줄의 들여쓰기를 찾기
  const lines = template.split('\n');
  const diffListLine = lines.find(line => line.includes('{{diffList}}'));
  
  if (!diffListLine) {
    // 기본값 반환
    return { 
      codeTagIndent: '        ', // 8 spaces
      contentIndent: '            ' // 12 spaces
    };
  }
  
  // {{diffList}} 앞의 공백 개수 계산
  const match = diffListLine.match(/^(\s*)/);
  const diffListIndent = match ? match[1] : '';
  
  // <code_diff> 태그는 {{diffList}}와 같은 레벨, 내용은 4 spaces 더 들여쓰기
  return {
    codeTagIndent: diffListIndent,
    contentIndent: diffListIndent + '    '
  };
};

const formatCodeDiffWithIndent = (diffContent: string, indentConfig: { codeTagIndent: string; contentIndent: string }): string => {
  const indentedContent = addIndentToLines(diffContent, indentConfig.contentIndent);
  return `\n${indentConfig.codeTagIndent}<code_diff>\n${indentedContent}\n${indentConfig.codeTagIndent}</code_diff>`;
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
  const diffList = parseDiffByFile(diff, template);
  return replaceTemplateVariablesWithDiffList(template, prTitle, prDescription, diffList);
};
