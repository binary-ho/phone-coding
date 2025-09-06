# Line Comment 기능 분석 및 구현 계획

## 현재 상태 분석

### 기존 기능 확인 결과

우리 프로젝트에는 **변경 사항의 특정 라인에 comment를 다는 기능이 없습니다**.

#### 증거 1: 현재 comment.ts 구현 분석

현재 `src/comment.ts` 파일을 분석한 결과:

```typescript
// 현재 구현 - PR 레벨 코멘트만 지원
export const postOrUpdateComment = async (
  octokit: ReturnType<typeof github.getOctokit>,
  repo: { owner: string; repo: string },
  issue_number: number,
  body: string
) => {
  // issues.createComment 또는 issues.updateComment 사용
  // 이는 PR 전체에 대한 일반적인 코멘트만 생성
}
```

**문제점:**
- `octokit.rest.issues.createComment` API 사용 → PR 전체에 대한 일반 코멘트
- `octokit.rest.issues.updateComment` API 사용 → 기존 일반 코멘트 수정
- **라인별 코멘트를 위한 `pulls.createReview` API 사용하지 않음**

#### 증거 2: 코드베이스 전체 검색 결과

다음 키워드들로 전체 프로젝트를 검색한 결과 **모두 발견되지 않음**:
- "line comment" → 0건
- "review comment" → 0건  
- "createReview" → 0건
- "pulls.createReview" → 0건
- "pulls.createReviewComment" → 0건

#### 증거 3: 현재 사용 중인 GitHub API 분석

현재 프로젝트에서 사용하는 GitHub API:
- `octokit.rest.pulls.get` (context.ts) → PR 메타데이터 조회용
- `octokit.rest.issues.listComments` (comment.ts) → 일반 코멘트 목록 조회
- `octokit.rest.issues.createComment` (comment.ts) → 일반 코멘트 생성
- `octokit.rest.issues.updateComment` (comment.ts) → 일반 코멘트 수정

**라인 코멘트에 필요한 API는 사용하지 않음:**
- `octokit.rest.pulls.createReview` ❌
- `octokit.rest.pulls.createReviewComment` ❌
- `octokit.rest.pulls.listReviewComments` ❌

## GitHub API 차이점 분석

### Issues API vs Pull Request Review API

| 구분 | Issues API (현재 사용) | Pull Request Review API (라인 코멘트용) |
|------|----------------------|-----------------------------------|
| **용도** | PR 전체에 대한 일반 코멘트 | 특정 라인에 대한 리뷰 코멘트 |
| **위치** | PR 하단 대화 영역 | 코드 diff의 특정 라인 |
| **API 엔드포인트** | `/repos/{owner}/{repo}/issues/{issue_number}/comments` | `/repos/{owner}/{repo}/pulls/{pull_number}/reviews` |
| **생성 메서드** | `issues.createComment()` | `pulls.createReview()` |
| **필수 파라미터** | `body` | `body`, `comments` (라인별 코멘트 배열) |
| **라인 지정** | 불가능 | `path`, `line`, `side` 파라미터로 가능 |

### Pull Request Review API 상세 분석

라인 코멘트를 위해서는 다음 API를 사용해야 합니다:

```typescript
// 라인별 리뷰 코멘트 생성
await octokit.rest.pulls.createReview({
  owner,
  repo,
  pull_number,
  body: "전체 리뷰 요약",
  event: "COMMENT", // 또는 "APPROVE", "REQUEST_CHANGES"
  comments: [
    {
      path: "src/example.ts",      // 파일 경로
      line: 42,                    // 라인 번호
      side: "RIGHT",               // "LEFT" (이전) 또는 "RIGHT" (현재)
      body: "이 라인에 대한 코멘트"
    }
  ]
});
```

## 구현 계획

### 1단계: 새로운 모듈 생성

#### `src/line-comment.ts` 파일 생성

```typescript
import * as github from '@actions/github';

export interface LineComment {
  path: string;
  line: number;
  side: 'LEFT' | 'RIGHT';
  body: string;
}

export interface ReviewData {
  body: string;
  comments: LineComment[];
}

export const createLineComments = async (
  octokit: ReturnType<typeof github.getOctokit>,
  repo: { owner: string; repo: string },
  pull_number: number,
  reviewData: ReviewData
) => {
  return await octokit.rest.pulls.createReview({
    ...repo,
    pull_number,
    body: reviewData.body,
    event: 'COMMENT',
    comments: reviewData.comments,
  });
};

export const findExistingReview = async (
  octokit: ReturnType<typeof github.getOctokit>,
  repo: { owner: string; repo: string },
  pull_number: number
) => {
  const { data: currentUser } = await octokit.rest.users.getAuthenticated();
  const botUsername = currentUser.login;

  const { data: reviews } = await octokit.rest.pulls.listReviews({
    ...repo,
    pull_number,
  });

  return reviews.find(
    review => review.user?.login === botUsername && 
              review.body?.includes('<!-- gemini-line-reviewer -->')
  );
};
```

### 2단계: diff 파싱 모듈 생성

#### `src/diff-parser.ts` 파일 생성

```typescript
export interface DiffLine {
  path: string;
  lineNumber: number;
  content: string;
  type: 'added' | 'removed' | 'context';
}

export const parseDiff = (diff: string): DiffLine[] => {
  const lines = diff.split('\n');
  const result: DiffLine[] = [];
  let currentPath = '';
  let lineNumber = 0;

  for (const line of lines) {
    // 파일 경로 파싱
    if (line.startsWith('diff --git')) {
      const match = line.match(/diff --git a\/(.*) b\/(.*)/);
      if (match) {
        currentPath = match[2];
      }
    }
    
    // 라인 번호 파싱
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -\d+,?\d* \+(\d+),?\d* @@/);
      if (match) {
        lineNumber = parseInt(match[1]);
      }
    }
    
    // 변경 내용 파싱
    if (line.startsWith('+') && !line.startsWith('+++')) {
      result.push({
        path: currentPath,
        lineNumber: lineNumber,
        content: line.substring(1),
        type: 'added'
      });
      lineNumber++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      result.push({
        path: currentPath,
        lineNumber: lineNumber,
        content: line.substring(1),
        type: 'removed'
      });
    } else if (!line.startsWith('@@') && !line.startsWith('diff')) {
      lineNumber++;
    }
  }

  return result;
};
```

### 3단계: AI 응답 파싱 모듈 생성

#### `src/ai-response-parser.ts` 파일 생성

```typescript
import { LineComment } from './line-comment';
import { DiffLine } from './diff-parser';

export interface ParsedAIResponse {
  generalComment: string;
  lineComments: LineComment[];
}

export const parseAIResponseForLineComments = (
  aiResponse: string,
  diffLines: DiffLine[]
): ParsedAIResponse => {
  // AI 응답에서 라인별 코멘트 추출
  // 예상 형식: "파일명:라인번호: 코멘트 내용"
  const lineCommentRegex = /^(.+):(\d+):\s*(.+)$/gm;
  const lineComments: LineComment[] = [];
  let generalComment = aiResponse;

  let match;
  while ((match = lineCommentRegex.exec(aiResponse)) !== null) {
    const [fullMatch, path, lineStr, comment] = match;
    const line = parseInt(lineStr);
    
    // diff에서 해당 라인이 존재하는지 확인
    const diffLine = diffLines.find(dl => 
      dl.path === path && dl.lineNumber === line
    );
    
    if (diffLine) {
      lineComments.push({
        path,
        line,
        side: 'RIGHT',
        body: comment.trim()
      });
      
      // 일반 코멘트에서 라인 코멘트 제거
      generalComment = generalComment.replace(fullMatch, '');
    }
  }

  return {
    generalComment: generalComment.trim(),
    lineComments
  };
};
```

### 4단계: 프롬프트 수정

#### `src/prompt.ts` 수정

```typescript
export const buildPromptWithLineComments = (
  prTitle: string,
  prBody: string,
  diff: string,
  mode: 'review' | 'summarize'
): string => {
  if (mode === 'review') {
    return `
당신은 숙련된 코드 리뷰어입니다. 다음 Pull Request를 검토해주세요.

**중요: 특정 라인에 대한 코멘트는 다음 형식으로 작성해주세요:**
파일명:라인번호: 코멘트 내용

예시:
src/example.ts:42: 이 함수는 null 체크가 필요합니다.
src/utils.ts:15: 이 로직은 더 효율적으로 작성할 수 있습니다.

**PR 제목:** ${prTitle}

**PR 설명:**
${prBody}

**변경 사항:**
\`\`\`diff
${diff}
\`\`\`

전체적인 리뷰 요약과 함께 개선이 필요한 특정 라인들에 대해 위 형식으로 코멘트해주세요.
`;
  }
  
  // summarize 모드는 기존과 동일
  return buildPrompt(prTitle, prBody, diff, mode);
};
```

### 5단계: 메인 로직 수정

#### `src/main.ts` 수정

```typescript
import { parseDiff } from './diff-parser';
import { parseAIResponseForLineComments } from './ai-response-parser';
import { createLineComments, findExistingReview } from './line-comment';
import { buildPromptWithLineComments } from './prompt';

const run = async (): Promise<void> => {
  try {
    // 기존 코드...
    const context = await getPrContext(octokit);
    const diff = await getPrDiff(context.pr.base_sha, context.pr.head_sha);
    
    // 라인 코멘트 모드 확인
    const enableLineComments = core.getInput('enable-line-comments') === 'true';
    
    if (enableLineComments) {
      // 라인 코멘트 모드
      const prompt = buildPromptWithLineComments(
        context.pr.title,
        context.pr.body,
        diff,
        mode
      );
      
      const aiResponse = await callGeminiApi(geminiApiKey, prompt);
      const diffLines = parseDiff(diff);
      const parsedResponse = parseAIResponseForLineComments(aiResponse, diffLines);
      
      // 기존 리뷰 확인 및 생성
      const existingReview = await findExistingReview(
        octokit,
        context.repo,
        context.pr.number
      );
      
      if (!existingReview && parsedResponse.lineComments.length > 0) {
        await createLineComments(octokit, context.repo, context.pr.number, {
          body: parsedResponse.generalComment,
          comments: parsedResponse.lineComments
        });
      }
    } else {
      // 기존 일반 코멘트 모드
      // 기존 로직 유지...
    }
  } catch (error) {
    core.setFailed(`Action failed: ${error}`);
  }
};
```

### 6단계: action.yml 수정

```yaml
name: 'AI Code Reviewer'
description: 'Uses Gemini to review and summarize pull requests.'
inputs:
  gemini-api-key:
    description: 'Gemini API key'
    required: true
  github-token:
    description: 'GitHub token'
    required: true
    default: ${{ github.token }}
  mode:
    description: 'Mode of operation'
    required: false
    default: 'review'
  enable-line-comments:  # 새로 추가
    description: 'Enable line-specific comments'
    required: false
    default: 'false'
runs:
  using: 'node20'
  main: 'dist/index.js'
```

## 구현 시 고려사항

### 1. GitHub API 제한사항
- Pull Request Review API는 한 번에 최대 30개의 라인 코멘트만 생성 가능
- 대용량 diff의 경우 여러 번의 API 호출 필요

### 2. diff 파싱의 복잡성
- 파일 이름 변경, 바이너리 파일, 복잡한 merge conflict 등 처리 필요
- 정확한 라인 번호 매핑이 중요

### 3. AI 응답 파싱의 안정성
- AI가 정확한 형식으로 응답하지 않을 경우 대비책 필요
- 존재하지 않는 파일/라인에 대한 코멘트 필터링 필요

### 4. 기존 기능과의 호환성
- 기존 일반 코멘트 기능과 라인 코멘트 기능 선택적 사용 가능
- 점진적 마이그레이션 지원

## 테스트 계획

### 1. 단위 테스트
- `diff-parser.ts` 테스트: 다양한 diff 형식 파싱
- `ai-response-parser.ts` 테스트: AI 응답 파싱 정확성
- `line-comment.ts` 테스트: GitHub API 호출 모킹

### 2. 통합 테스트
- 실제 PR에서 라인 코멘트 생성 확인
- 대용량 diff 처리 성능 테스트
- AI 응답 형식 변화에 대한 견고성 테스트

## 결론

현재 프로젝트에는 **라인별 코멘트 기능이 존재하지 않으며**, 이를 구현하기 위해서는:

1. **새로운 모듈 4개 추가** (line-comment, diff-parser, ai-response-parser, prompt 수정)
2. **GitHub Pull Request Review API 사용**으로 전환
3. **AI 프롬프트 엔지니어링** 개선
4. **action.yml 입력 파라미터 추가**

이 구현을 통해 사용자는 코드의 특정 라인에 대한 정확한 피드백을 받을 수 있게 됩니다.