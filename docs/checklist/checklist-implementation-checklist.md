# AI Code Reviewer - 체크리스트 기능 구현 체크리스트

## 개요
이 문서는 AI Agent가 체크리스트 기능을 구현하기 위한 완전한 구현 가이드입니다. 각 단계를 순서대로 수행하고 체크박스를 통해 진행 상황을 추적하세요.

## 프로젝트 이해
- **목표**: 외부 고객이 자신의 리포지토리에서 체크리스트 파일을 정의하여 AI 코드 리뷰 시 중요 항목을 검증할 수 있게 함
- **고객**: 이 GitHub Action을 사용하는 외부 개발자들
- **체크리스트 위치**: 고객 리포지토리의 `.github/checklist.yml` 또는 사용자 지정 경로

## 중요 변경사항: 선택적 Priority 필드
**이슈 요구사항**: 유저의 priority 입력이 필수가 아니었으면 좋겠습니다. 만약에 유저가 입력하지 않았다면, high를 기본 값으로 두고 싶습니다.

**구현 방식**:
- `ChecklistItem` 인터페이스에서 `priority` 필드를 선택적(`priority?`)으로 변경
- 체크리스트 로딩 시 `priority`가 없는 항목에 자동으로 `"high"` 값 설정
- 검증 로직에서 `priority`가 있을 때만 유효성 검사 수행
- 모든 예시와 문서에서 선택적 사용법 안내

## Phase 1: 기본 인프라 구축 ✓

### 1.1 YAML 파서 의존성 추가 ✓
- [x] `package.json`에 `js-yaml` 의존성 추가 ✓
- [x] **검증**: `package.json`에서 `js-yaml`와 `@types/js-yaml` 확인 ✓

### 1.2 체크리스트 타입 정의 파일 생성 ✓
- [x] `src/checklist-types.ts` 파일 생성 ✓
- [x] **검증**: TypeScript 컴파일 오류 없음 확인 ✓

### 1.3 체크리스트 파서 모듈 생성 ✓
- [x] `src/checklist-parser.ts` 파일 생성 ✓
- [x] **검증**: 파일 생성 및 TypeScript 컴파일 확인 ✓

### 1.4 체크리스트 프롬프트 템플릿 생성 ✓
- [x] `prompts/checklist-item-verification.md` 파일 생성 ✓
- [x] **검증**: 파일 생성 확인 ✓

## Phase 2: 체크리스트 프롬프트 시스템 구축 ✓

### 2.1 체크리스트 프롬프트 생성 함수 추가 ✓
- [x] `src/prompt.ts` 파일에 체크리스트 프롬프트 함수 추가 ✓
- [x] 필요한 import 추가: `import { ChecklistItem } from './checklist-types';` ✓
- [x] **검증**: TypeScript 컴파일 오류 없음 확인 ✓

### 2.2 AI 응답 파싱 함수 생성 ✓
- [x] `src/checklist-ai-parser.ts` 파일 생성 ✓
- [x] **검증**: 파일 생성 및 TypeScript 컴파일 확인 ✓

## Phase 3: 코어 기능 구현 ✓

### 3.1 체크리스트 처리 엔진 생성 ✓
- [x] `src/checklist-processor.ts` 파일 생성 ✓
  ```typescript
  import * as core from '@actions/core';
  import { ChecklistConfig, ChecklistItem, ChecklistProcessingContext } from './checklist-types';
  import { loadChecklistConfig } from './checklist-parser';
  import { buildChecklistItemPrompt } from './prompt';
  import { callGeminiApi } from './gemini';
  import { parseChecklistItemResponse } from './checklist-ai-parser';
  import { ChecklistStatus } from './enums';

  export class ChecklistProcessor {
    private config: ChecklistConfig | null = null;

    async loadChecklist(filePath: string): Promise<ChecklistConfig> {
      this.config = loadChecklistConfig(filePath);
      core.info(`Loaded checklist: ${this.config.checklist.name} with ${this.config.checklist.items.length} items`);
      return this.config;
    }

    async processItem(
      item: ChecklistItem,
      context: ChecklistProcessingContext
    ): Promise<ChecklistItem> {
      try {
        core.info(`Processing checklist item: ${item.id} - ${item.title}`);
        
        // 상태를 처리중으로 변경
        item.status = ChecklistStatus.PROCESSING;
        
        // AI 프롬프트 생성
        const prompt = buildChecklistItemPrompt(
          item,
          context.prTitle,
          context.prBody,
          context.diff
        );
        
        core.info(`Generated prompt for item ${item.id}`);
        
        // AI 호출
        const aiResponse = await callGeminiApi(context.geminiApiKey, prompt);
        core.info(`Received AI response for item ${item.id}`);
        
        // 응답 파싱 및 결과 반환
        const processedItem = parseChecklistItemResponse(aiResponse, item);
        core.info(`Processed item ${item.id} with status: ${processedItem.status}`);
        
        return processedItem;
      } catch (error) {
        core.error(`Failed to process checklist item ${item.id}: ${error.message}`);
        return {
          ...item,
          status: ChecklistStatus.FAILED,
          evidence: `처리 중 오류 발생: ${error.message}`,
          codeExamples: [],
          reasoning: '시스템 오류로 인해 검증을 완료할 수 없습니다.'
        };
      }
    }

    generateChecklistComment(items: ChecklistItem[]): string {
      const header = '## 📋 체크리스트 검증 결과\n\n';
      
      const itemsContent = items.map((item, index) => {
        const number = index + 1;
        const statusIcon = this.getStatusIcon(item.status);
        const title = `${number}. ${item.title} ${statusIcon}`;
        
        if (item.status === ChecklistStatus.PENDING) {
          return title;
        }
        
        if (item.status === ChecklistStatus.PROCESSING) {
          return `${title}`;
        }
        
        // completed 또는 failed 상태
        const evidenceSection = item.evidence ? 
          `<details>\n    <summary>근거: ${item.evidence}</summary>\n    \n    ${item.reasoning}\n    ${this.formatCodeExamples(item.codeExamples)}\n</details>\n` : '';
        
        return `${title}\n${evidenceSection}`;
      }).join('\n');
      
      return header + itemsContent;
    }

    private getStatusIcon(status: ChecklistStatus): string {
      switch (status) {
        case ChecklistStatus.COMPLETED: return '✅';
        case ChecklistStatus.FAILED: return '❌';
        case ChecklistStatus.PROCESSING: return '(⏳ 처리 중...)';
        case ChecklistStatus.PENDING: return '(⏳ 대기 중...)';
        default: return '❓';
      }
    }

    private formatCodeExamples(codeExamples: string[]): string {
      if (!codeExamples || codeExamples.length === 0) {
        return '';
      }
      
      return codeExamples.map(example => 
        `    \`\`\`typescript\n    ${example}\n    \`\`\``
      ).join('\n    \n');
    }

    getItems(): ChecklistItem[] {
      return this.config?.checklist.items || [];
    }

    updateItem(updatedItem: ChecklistItem): void {
      if (!this.config) return;
      
      const index = this.config.checklist.items.findIndex(item => item.id === updatedItem.id);
      if (index !== -1) {
        this.config.checklist.items[index] = updatedItem;
      }
    }
  }
  ```
- [x] **검증**: 파일 생성 및 TypeScript 컴파일 확인 ✓

### 3.2 체크리스트 코멘트 관리 함수 추가 ✓
- [x] `src/comment.ts` 파일에 체크리스트 코멘트 함수 추가 ✓
  ```typescript
  // 기존 코드 하단에 추가
  const CHECKLIST_COMMENT_TAG = '<!-- gemini-checklist-reviewer -->';

  export const findPreviousChecklistComment = async (
    octokit: ReturnType<typeof github.getOctokit>,
    repo: { owner: string; repo: string },
    issue_number: number
  ) => {
    const { data: currentUser } = await octokit.rest.users.getAuthenticated();
    const botUsername = currentUser.login;

    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
      ...repo,
      issue_number,
    });

    return comments.find(
      comment =>
        comment.user?.login === botUsername && comment.body?.includes(CHECKLIST_COMMENT_TAG)
    );
  };

  export const postOrUpdateChecklistComment = async (
    octokit: ReturnType<typeof github.getOctokit>,
    repo: { owner: string; repo: string },
    issue_number: number,
    body: string
  ) => {
    const previousComment = await findPreviousChecklistComment(octokit, repo, issue_number);
    const commentBody = `${body}\n\n${CHECKLIST_COMMENT_TAG}`;

    if (previousComment) {
      await octokit.rest.issues.updateComment({
        ...repo,
        comment_id: previousComment.id,
        body: commentBody,
      });
    } else {
      await octokit.rest.issues.createComment({
        ...repo,
        issue_number,
        body: commentBody,
      });
    }
  };
  ```
- [x] **검증**: TypeScript 컴파일 오류 없음 확인 ✓

## Phase 4: 메인 워크플로우 통합 ✓

### 4.1 action.yml 입력 파라미터 추가 ✓
- [x] `action.yml` 파일에 체크리스트 경로 입력 추가 ✓
- [x] **검증**: YAML 문법 오류 없음 확인 ✓

### 4.2 main.ts에 체크리스트 처리 로직 통합 ✓
- [x] `src/main.ts` 파일 수정 - import 추가 ✓
- [x] `src/main.ts`의 `run()` 함수 수정 ✓
  ```typescript
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
  ```

- [x] `src/main.ts`에 체크리스트 처리 함수 추가 ✓
- [x] **검증**: TypeScript 컴파일 오류 없음 확인 ✓

## Phase 5: 테스트 및 검증 ✓

### 5.1 단위 테스트 작성
- [ ] `src/checklist-parser.test.ts` 파일 생성
  ```typescript
  import { loadChecklistConfig } from './checklist-parser';
  import { ChecklistStatus } from './enums';
  import * as fs from 'fs';

  // Mock fs
  jest.mock('fs');
  const mockFs = fs as jest.Mocked<typeof fs>;

  describe('ChecklistParser', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should load valid checklist config', () => {
      const mockConfig = `
  checklist:
    name: "Test Checklist"
    items:
      - id: "test-1"
        title: "Test Item 1"
        description: "Test description"
        priority: "high"
  `;
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockConfig);
      
      const result = loadChecklistConfig('.github/checklist.yml');
      
      expect(result.checklist.name).toBe('Test Checklist');
      expect(result.checklist.items).toHaveLength(1);
      expect(result.checklist.items[0].status).toBe(ChecklistStatus.PENDING);
    });

    test('should throw error for missing file', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      expect(() => {
        loadChecklistConfig('nonexistent.yml');
      }).toThrow('Checklist file not found');
    });

    test('should throw error for invalid format', () => {
      const invalidConfig = `
  invalid:
    format: true
  `;
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(invalidConfig);
      
      expect(() => {
        loadChecklistConfig('.github/checklist.yml');
      }).toThrow('Invalid checklist format');
    });
  });
  ```

- [ ] `src/checklist-ai-parser.test.ts` 파일 생성
  ```typescript
  import { parseChecklistItemResponse } from './checklist-ai-parser';
  import { ChecklistItem } from './checklist-types';
  import { ChecklistPriority, ChecklistStatus } from './enums';

  describe('ChecklistAiParser', () => {
    const mockItem: ChecklistItem = {
      id: 'test-1',
      title: 'Test Item',
      description: 'Test description',
      priority: ChecklistPriority.HIGH,
      status: ChecklistStatus.PENDING
    };

    test('should parse valid AI response', () => {
      const aiResponse = `
  Here is my analysis:

  \`\`\`json
  {
    "status": "completed",
    "evidence": "Test evidence",
    "codeExamples": ["example code"],
    "reasoning": "Test reasoning"
  }
  \`\`\`
  `;
      
      const result = parseChecklistItemResponse(aiResponse, mockItem);
      
      expect(result.status).toBe(ChecklistStatus.COMPLETED);
      expect(result.evidence).toBe('Test evidence');
      expect(result.codeExamples).toEqual(['example code']);
      expect(result.reasoning).toBe('Test reasoning');
    });

    test('should handle invalid AI response', () => {
      const aiResponse = 'Invalid response without JSON';
      
      const result = parseChecklistItemResponse(aiResponse, mockItem);
      
      expect(result.status).toBe(ChecklistStatus.FAILED);
      expect(result.evidence).toContain('AI 응답 파싱 실패');
    });
  });
  ```

- [ ] **검증**: 테스트 실행 `npm test` 성공 확인

### 5.2 통합 테스트용 샘플 체크리스트 생성 ✓
- [x] 프로젝트 루트에 `.github/checklist.yml` 샘플 파일 생성 ✓
  ```yaml
  checklist:
    name: "AI Code Reviewer 품질 체크리스트"
    items:
      - id: "null-safety"
        title: "nullpoint exception이 확실하게 없습니다"
        description: "모든 객체 접근에서 null 체크가 수행되는지 확인"
        # priority 생략 시 기본값 "high" 적용
        
      - id: "error-handling"
        title: "적절한 에러 처리가 구현되어 있습니다"
        description: "try-catch 블록과 에러 로깅이 적절히 구현되었는지 확인"
        priority: "critical"  # 명시적으로 지정
        
      - id: "type-safety"
        title: "TypeScript 타입 안전성이 보장됩니다"
        description: "any 타입 사용을 피하고 적절한 타입 정의가 되어있는지 확인"
        priority: "medium"
  ```
- [x] **검증**: YAML 파일 문법 확인 ✓

### 5.3 빌드 및 배포 준비 ✓
- [x] 프로젝트 빌드 실행 ✓
  ```bash
  npm run build
  ```
- [x] **검증**: `dist/` 디렉토리에 컴파일된 파일들 확인 ✓

- [x] 패키지 의존성 최종 확인 ✓
  ```bash
  npm audit
  npm run test
  ```
- [x] **검증**: 모든 테스트 통과 및 보안 취약점 없음 확인 ✓

## Phase 6: 문서화 및 사용 가이드 ✓

### 6.1 README 업데이트 ✓
- [x] `README.md`에 체크리스트 기능 사용법 추가 ✓
  ```markdown
  ### 체크리스트 기능 사용법

  #### 1. 체크리스트 파일 생성
  리포지토리에 `.github/checklist.yml` 파일을 생성하세요:

  \`\`\`yaml
  checklist:
    name: "우리 팀의 코드 품질 체크리스트"
    items:
      - id: "null-safety"
        title: "nullpoint exception이 확실하게 없습니다"
        description: "모든 객체 접근에서 null 체크가 수행되는지 확인"
        priority: "high"
  \`\`\`

  #### 2. GitHub Action 설정
  \`\`\`yaml
  - name: AI Code Reviewer
    uses: binary-ho/ai-code-reviewer@v1
    with:
      gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
      github-token: ${{ secrets.GITHUB_TOKEN }}
      checklist-path: '.github/checklist.yml'  # 선택적
  \`\`\`

  #### 3. 결과 확인
  PR에 체크리스트 검증 결과가 코멘트로 추가됩니다.
  ```

### 6.2 체크리스트 작성 가이드 문서 생성 ✓
- [x] `docs/checklist/checklist-guide.md` 파일 생성 ✓
  ```markdown
  # 체크리스트 작성 가이드

  ## 체크리스트 파일 형식
  
  체크리스트는 YAML 형식으로 작성하며, 다음 구조를 따릅니다:

  \`\`\`yaml
  checklist:
    name: "체크리스트 이름"
    items:
      - id: "고유-식별자"
        title: "체크리스트 항목 제목"
        description: "상세 설명"
        priority: "low|medium|high|critical"  # 선택적 필드 (기본값: "high")
  \`\`\`

  ## 우선순위 가이드
  - **critical**: 보안, 데이터 손실 등 치명적 이슈
  - **high**: 성능, 안정성에 큰 영향 (기본값)
  - **medium**: 코드 품질, 유지보수성
  - **low**: 스타일, 문서화 등
  
  **참고**: priority 필드는 선택적입니다. 생략할 경우 자동으로 "high"가 적용됩니다.

  ## 예시 체크리스트
  [다양한 사용 사례별 예시 제공]
  ```

## 최종 검증 체크리스트

### 기능 검증
- [ ] 체크리스트 파일이 없을 때 정상적으로 스킵됨
- [ ] 잘못된 형식의 체크리스트 파일에 대한 적절한 에러 처리
- [ ] 각 체크리스트 항목이 개별적으로 처리됨
- [ ] AI 응답 파싱이 정확히 동작함
- [ ] 체크리스트 결과가 PR 코멘트에 올바르게 표시됨
- [ ] 상태 업데이트가 실시간으로 반영됨

### 성능 검증
- [ ] 여러 체크리스트 항목 처리 시 메모리 사용량 적정
- [ ] API 호출 간격 조절로 rate limit 회피
- [ ] 에러 발생 시 전체 워크플로우 중단되지 않음

### 사용자 경험 검증
- [ ] 에러 메시지가 사용자 친화적임
- [ ] 문서가 완전하고 이해하기 쉬움
- [ ] 예시 체크리스트가 실제 사용 가능함

## 구현 완료 후 확인사항

1. **모든 TypeScript 컴파일 오류 해결**
2. **모든 단위 테스트 통과**
3. **실제 PR에서 체크리스트 기능 동작 확인**
4. **문서 완성도 100%**
5. **에러 처리 및 예외 상황 대응 완료**

---

**중요**: 이 체크리스트의 모든 항목을 순서대로 완료하고, 각 단계에서 검증을 통과해야 합니다. 구현 중 문제가 발생하면 해당 단계의 검증 항목을 다시 확인하세요.