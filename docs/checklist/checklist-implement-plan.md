# AI Code Reviewer - 사용자 정의 체크리스트 기능 구현 계획서

## 개요

**이 프로젝트의 고객(외부 사용자)**이 자신의 리포지토리에서 이 GitHub Action을 사용할 때, 자신만의 체크리스트 파일을 정의하여 코드 리뷰 시 중요한 항목들을 체계적으로 검증할 수 있는 기능을 구현합니다.

## 프로젝트 이해
- **이 프로젝트**: GitHub Action을 제공하는 프로젝트 (binary-ho가 개발)
- **고객/사용자**: 이 GitHub Action을 자신의 리포지토리에서 사용하는 외부 개발자들
- **사용 방식**: 고객이 자신의 `.github/workflows/` 에서 이 Action을 호출
- **체크리스트 위치**: 고객의 리포지토리 내 (예: `.github/checklist.yml`)

## 요구사항 분석
### 핵심 요구사항
1. **고객 정의 체크리스트 파일 지원**: 이 Action을 사용하는 고객이 자신의 리포지토리에서 체크리스트를 정의할 수 있어야 함
2. **중요도 우선순위**: 체크리스트는 다른 리뷰 요소보다 우선순위가 높음
3. **근거 기반 검증**: 각 항목의 달성 여부를 근거와 함께 명시적으로 제공
4. **Summary Comment 위치**: 라인 코멘트가 아닌 PR 요약 코멘트 하단에 배치
5. **개별 처리**: 각 체크리스트 항목을 개별 요청/응답으로 처리
6. **상태 업데이트**: 초기 전체 목록 표시 후 완료 항목 지속적 업데이트

### 고객 사용 시나리오
고객(외부 개발자)이 자신의 리포지토리에서 이 Action을 사용하는 방식:

```yaml
# 고객의 .github/workflows/pr-review.yml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: binary-ho/ai-code-reviewer@v1
        with:
          gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          checklist-path: '.github/my-checklist.yml'  # 고객이 정의한 체크리스트
```

### 예상 출력 형식
```markdown
## 📋 체크리스트 검증 결과

1. nullpoint exception이 확실하게 없습니다. ✅
<details>
    <summary>근거 1. null 체크 로직이 적절히 구현되어 있습니다.</summary>
    
    모든 객체 접근 전에 null 체크가 수행되고 있습니다:
    ```typescript
    if (user && user.profile) {
        return user.profile.name;
    }
    ```
</details>

2. 메모리 누수 방지가 적절히 구현되어 있습니다. ❌
<details>
    <summary>근거 1. 이벤트 리스너 정리가 누락되었습니다.</summary>
    
    컴포넌트 언마운트 시 이벤트 리스너 정리가 필요합니다:
    ```typescript
    // 문제가 있는 코드
    useEffect(() => {
        window.addEventListener('resize', handleResize);
        // cleanup 함수 누락
    }, []);
    ```
</details>

3. 보안 취약점이 없습니다. (⏳ 처리 중...)
```

## 현재 시스템 분석

### 기존 아키텍처
- **main.ts**: 전체 워크플로우 제어 (요약 → 라인 리뷰)
- **prompt.ts**: AI 프롬프트 템플릿 로딩 및 변수 치환
- **comment.ts**: PR 요약 코멘트 생성/업데이트 (COMMENT_TAG 사용)
- **line-comment.ts**: 라인별 리뷰 코멘트 생성
- **action.yml**: 입력 파라미터 정의 (gemini-api-key, github-token, mode)

### 기존 워크플로우
1. PR 컨텍스트 및 diff 추출
2. 요약 프롬프트 생성 → AI 호출 → 요약 코멘트 게시
3. 라인 리뷰 프롬프트 생성 → AI 호출 → 라인 코멘트 게시

## 기술적 실현 가능성 평가

### ✅ 실현 가능한 요소들

1. **고객 리포지토리 파일 읽기**: 
   - GitHub Actions는 고객의 리포지토리 워크스페이스에서 실행됨
   - `fs.readFileSync()`를 사용하여 고객 리포지토리의 파일 읽기 가능 (예: `.github/checklist.yml`)
   - 현재 시스템이 이미 `fs` 모듈을 사용한 파일 읽기 구조 보유

2. **Summary Comment 통합**:
   - `comment.ts`의 `postOrUpdateComment()` 함수가 이미 코멘트 업데이트 지원
   - `COMMENT_TAG`를 통한 기존 코멘트 식별 및 업데이트 메커니즘 존재
   - 체크리스트 결과를 기존 요약 코멘트에 추가 가능

3. **상태 추적 및 업데이트**:
   - GitHub API를 통한 코멘트 업데이트가 이미 구현됨
   - 체크리스트 상태를 코멘트 본문에 저장하여 지속성 확보 가능
   - 개별 항목 처리 후 실시간 상태 업데이트 가능

4. **AI 프롬프트 시스템**:
   - 기존 프롬프트 템플릿 시스템 활용 가능
   - 체크리스트 검증을 위한 새로운 프롬프트 템플릿 추가
   - 개별 항목별 맞춤형 프롬프트 생성 가능

### ⚠️ 도전적인 요소들

1. **개별 항목 처리**:
   - 현재는 단일 AI 호출로 전체 리뷰 수행
   - 각 체크리스트 항목별로 개별 AI 호출 필요 → API 비용 증가 및 처리 시간 연장

2. **상태 관리 복잡성**:
   - 여러 AI 호출 결과를 통합하여 단일 코멘트로 업데이트
   - 부분 실패 시 복구 로직 필요

3. **GitHub API 제한**:
   - API 호출 횟수 제한 (시간당 5,000회)
   - 체크리스트 항목이 많을 경우 제한에 도달 가능성

## 구현 아키텍처 설계

### 1. 고객 체크리스트 파일 형식

**파일 위치**: 고객의 리포지토리 내 `.github/checklist.yml` (또는 고객이 지정한 경로)

```yaml
# 고객이 자신의 리포지토리에 정의하는 체크리스트
checklist:
  name: "우리 팀의 코드 품질 체크리스트"
  items:
    - id: "null-safety"
      title: "nullpoint exception이 확실하게 없습니다"
      description: "모든 객체 접근에서 null 체크가 수행되는지 확인"
      priority: "high"
      
    - id: "memory-leak"
      title: "메모리 누수 방지가 적절히 구현되어 있습니다"
      description: "이벤트 리스너, 타이머, 구독 등의 정리가 적절한지 확인"
      priority: "high"
      
    - id: "security"
      title: "보안 취약점이 없습니다"
      description: "XSS, SQL 인젝션, 인증/인가 등 보안 이슈 확인"
      priority: "critical"
```

**중요**: 이 파일은 고객의 리포지토리에 위치하며, GitHub Action 실행 시 워크스페이스에서 읽어옵니다.

### 2. 핵심 구현 요소

#### A. 고객 리포지토리 파일 읽기 시스템
- **파일 위치**: 고객 워크스페이스의 상대 경로 (예: `.github/checklist.yml`)
- **읽기 방식**: `fs.readFileSync(checklistPath, 'utf-8')` - 현재 prompt.ts와 유사한 방식
- **차이점**: 고객 워크스페이스에서 읽기 vs 이 프로젝트의 prompts 디렉토리에서 읽기

#### B. 체크리스트 처리 엔진
- **체크리스트 파싱**: YAML 파일을 JavaScript 객체로 변환
- **개별 항목 처리**: 각 체크리스트 항목별로 별도의 AI 호출
- **상태 관리**: 각 항목의 진행 상태 추적 (대기중, 처리중, 완료, 실패)
- **결과 통합**: 모든 항목 결과를 하나의 코멘트로 통합

#### C. 체크리스트 전용 프롬프트 시스템
- **새 프롬프트 템플릿**: `prompts/checklist-item-verification.md` 추가
- **개별 항목 검증**: 각 체크리스트 항목에 특화된 프롬프트 생성
- **근거 요구**: AI가 판단 근거와 코드 예시를 제공하도록 지시

#### `prompts/checklist-item-verification.md` - 체크리스트 검증 템플릿
```markdown
당신은 코드 품질 검증 전문가입니다.
다음 체크리스트 항목을 검증하고 근거와 함께 결과를 제공해주세요.

## 검증 항목
- **제목**: {{itemTitle}}
- **설명**: {{itemDescription}}
- **우선순위**: {{itemPriority}}

## PR 정보
- **제목**: {{prTitle}}
- **설명**: {{prBody}}

## 코드 변경사항
```diff
{{diff}}
```

## 응답 형식
다음 JSON 형식으로 응답해주세요:
```json
{
  "status": "completed|failed",
  "evidence": "검증 근거 설명",
  "codeExamples": ["관련 코드 예시들"],
  "reasoning": "상세한 판단 근거"
}
```
```

### 3. 기존 시스템 통합 방식

#### `main.ts` 수정
```typescript
async function run(): Promise<void> {
  // ... 기존 코드 ...
  
  // 체크리스트 처리 추가
  const checklistPath = core.getInput('checklist-path');
  if (checklistPath) {
    await processChecklist(pullRequestContext, diff, octokit, geminiApiKey, checklistPath);
  }
  
  // 기존 요약 및 리뷰 처리
  await summaryPullRequestAndComment(pullRequestContext, diff, octokit, geminiApiKey);
  
  if (mode !== 'summarize') {
    await reviewPullRequestAndComment(pullRequestContext, diff, octokit, geminiApiKey);
  }
}

const processChecklist = async (
  prContext: PullRequestContext,
  diff: string,
  octokit: Octokit,
  geminiApiKey: string,
  checklistPath: string
) => {
  const processor = new ChecklistProcessor();
  const checklist = await processor.loadChecklist(checklistPath);
  
  // 초기 체크리스트 코멘트 생성
  const initialComment = await processor.generateChecklistComment(checklist.items);
  await postOrUpdateChecklistComment(octokit, prContext.repo, prContext.pr.number, initialComment);
  
  // 각 항목별 개별 처리
  for (const item of checklist.items) {
    const processedItem = await processor.processItem(item, {
      prTitle: prContext.pr.title,
      prBody: prContext.pr.body,
      diff,
      geminiApiKey
    });
    
    // 상태 업데이트
    await processor.updateChecklistStatus([processedItem]);
    
    // 코멘트 업데이트
    const updatedComment = await processor.generateChecklistComment(checklist.items);
    await postOrUpdateChecklistComment(octokit, prContext.repo, prContext.pr.number, updatedComment);
  }
}
```

#### `action.yml` 수정
```yaml
inputs:
  # ... 기존 입력들 ...
  checklist-path:
    description: 'Path to the checklist configuration file'
    required: false
    default: '.github/checklist.yml'
```

## 구현 단계별 계획

### Phase 1: 기본 인프라 구축
1. **체크리스트 파일 파싱 모듈 개발**
   - YAML 파서 구현
   - 체크리스트 설정 검증 로직
   - 에러 처리 및 기본값 설정

### Phase 2: 체크리스트 프롬프트 시스템 구축 
2. **체크리스트 프롬프트 시스템 구축**
   - 개별 항목 검증용 프롬프트 템플릿 작성
   - 프롬프트 생성 함수 구현
   - AI 응답 파싱 로직 개발

3. **기본 통합 테스트**
   - 단일 체크리스트 항목 처리 테스트
   - AI 응답 파싱 정확성 검증

### Phase 3: 코어 기능 구현
1. **체크리스트 처리 엔진 개발**
   - ChecklistProcessor 클래스 구현
   - 개별 항목 처리 로직
   - 상태 관리 시스템

### Phase 4: 코멘트 통합 시스템
1. 코멘트 통합 시스템
   - 체크리스트 전용 코멘트 태그 시스템
   - 기존 요약 코멘트와의 통합 방식

### Phase 5: 고급 기능 및 최적화
1. **성능 최적화**
   - 병렬 처리 가능한 항목들 식별
   - API 호출 최적화
   - 캐싱 메커니즘 도입

2. **사용자 경험 개선**
   - 진행 상황 표시 개선
   - 에러 메시지 사용자 친화적 개선
   - 설정 검증 및 가이드 제공

3. **문서화 및 예제**
   - 체크리스트 작성 가이드
   - 다양한 사용 사례 예제
   - 트러블슈팅 가이드
   

### Phase 6: 도전적 과제
2. 코멘트 통합 시스템
   - 실시간 상태 업데이트 메커니즘

3. 에러 처리 및 복구
   - 부분 실패 시 복구 로직
   - API 제한 대응 방안
   - 타임아웃 처리


## 위험 요소 및 대응 방안

### 1. API 비용 및 제한
**위험**: 체크리스트 항목이 많을 경우 Gemini API 호출 횟수 급증
**대응**: 
- 배치 처리 옵션 제공 (여러 항목을 하나의 프롬프트로 처리)
- 우선순위 기반 처리 (critical > high > medium > low)
- 사용자 설정 가능한 최대 항목 수 제한

### 2. 처리 시간 연장
**위험**: 개별 항목 처리로 인한 전체 리뷰 시간 증가
**대응**:
- 비동기 처리 및 진행 상황 표시
- 타임아웃 설정 및 부분 결과 제공
- 우선순위 높은 항목 우선 처리

### 3. 상태 일관성
**위험**: 여러 AI 호출 중 일부 실패 시 상태 불일치
**대응**:
- 트랜잭션 방식의 상태 업데이트
- 실패 항목 재시도 메커니즘
- 상태 복구 기능

### 4. 사용자 설정 복잡성
**위험**: 체크리스트 설정이 복잡하여 사용자 진입 장벽 증가
**대응**:
- 설정 검증 및 친화적 에러 메시지
- 단계별 설정 가이드 제공 (Readme)

## 성공 지표

### 기능적 지표
- ✅ 체크리스트 파일 로딩 성공률 > 99%
- ✅ 개별 항목 처리 정확도 > 95%
- ✅ 상태 업데이트 일관성 > 99%
- ✅ 에러 복구 성공률 > 90%

### 성능 지표
- ⏱️ 항목당 평균 처리 시간 < 30초
- ⏱️ 전체 체크리스트 처리 시간 < 5분 (10개 항목 기준)
- 📊 API 호출 실패율 < 1%

### 사용자 경험 지표
- 📝 설정 오류율 < 5%
- 📖 문서 완성도 100%
- 🔧 사용자 피드백 반영률 > 80%

## 결론

제안된 체크리스트 기능은 **기술적으로 실현 가능**하며, 기존 시스템의 아키텍처를 크게 변경하지 않고도 통합할 수 있습니다. 

### 핵심 성공 요인
1. **점진적 구현**: Phase별 단계적 개발로 위험 최소화
2. **기존 시스템 활용**: 현재의 코멘트 시스템과 AI 프롬프트 구조 재사용
3. **사용자 중심 설계**: 직관적인 설정과 명확한 결과 표시
4. **확장성 고려**: 향후 추가 기능 확장 가능한 구조

### 권장 사항
- **Phase 1부터 시작**하여 기본 기능 검증 후 단계적 확장
- **소규모 체크리스트**로 시작하여 점진적으로 항목 수 증가
- **사용자 피드백**을 적극 수집하여 지속적 개선

이 구현 계획을 통해 사용자들이 자신만의 품질 기준을 체계적으로 적용할 수 있는 강력한 코드 리뷰 도구를 제공할 수 있을 것입니다.