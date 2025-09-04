# Phase 3 최종 구현 및 트러블슈팅 보고서

Jules가 Phase 3 구현 및 전체 트러블슈팅 과정을 완료하고 보고서를 작성합니다.

## 1. 초기 구현 내용 (Phase 3)

Phase 3 체크리스트의 요구사항에 따라 다음의 초기 구현을 진행했습니다.

- **`src/main.ts` 오케스트레이터 구현**: Action의 전체 실행 흐름을 제어하는 메인 로직을 구현했습니다.
- **테스트 워크플로우 작성**: `.github/workflows/review-bot-test.yml` 파일을 생성하여 PR 발생 시 Action이 실행되도록 구성했습니다.
- **문서 업데이트**: `docs/implements checklist.md` 파일의 Phase 3 항목들을 완료로 체크했습니다.

## 2. 트러블슈팅 과정 및 해결책

초기 구현 후, CI/CD 파이프라인에서 여러 에러가 발생했으며, 다음과 같은 단계별 트러블슈팅을 통해 문제를 해결했습니다.

### 문제 1: 빌드 결과물(`dist/index.js`) 없음
- **원인**: 워크플로우에 TypeScript 소스 코드를 JavaScript로 컴파일하는 빌드 과정이 누락되었습니다.
- **해결**: `.github/workflows/review-bot-test.yml`에 `npm install` (의존성 설치) 및 `npm run build` (컴파일) 단계를 추가하여 해결했습니다.

### 문제 2: 타입스크립트 컴파일 에러
- **원인**: `src/main.ts`에서 다른 모듈의 함수를 호출할 때, `await` 키워드를 누락하거나 잘못된 인자를 전달하여 타입 에러가 발생했습니다.
- **해결**: 각 모듈(`context.ts`, `comment.ts`)의 함수 시그니처를 명확히 재분석하고, `main.ts`에서 `await`를 추가하고 올바른 인자를 전달하도록 코드를 수정하여 해결했습니다.

### 문제 3: `GITHUB_TOKEN` 환경 변수 참조 에러
- **원인**: `src/context.ts` 파일이 `main.ts`에서 생성된 `octokit` 인증 객체를 사용하는 대신, `GITHUB_TOKEN` 환경 변수를 직접 참조하는 구조적인 결함이 있었습니다.
- **해결**: `context.ts`가 `octokit` 객체를 직접 인자로 받도록 리팩토링하여, 토큰 처리 방식을 일원화하고 코드의 안정성을 높였습니다.

### 문제 4: Gemini 모델(`gemini-pro`) 접근 불가
- **원인**: `src/gemini.ts`에 하드코딩된 `gemini-pro` 모델이 현재 API 키로 접근할 수 없는 모델이었습니다.
- **해결**: 사용자의 제안에 따라, 사용 가능한 `gemini-1.5-flash` 모델로 변경한 뒤, 최종적으로 `gemini-2.0-flash` 모델로 업데이트하여 해결했습니다.

### 문제 5: GitHub API 권한 부족 (`users: read`)
- **원인**: Action이 자신의 이전 댓글을 찾기 위해 '인증된 사용자 정보'를 조회하는 API를 호출했으나, 워크플로우 토큰에 해당 API를 호출할 `users: read` 권한이 없었습니다.
- **해결**: `.github/workflows/review-bot-test.yml`의 `permissions` 블록에 `users: read` 권한을 추가하여 해결했습니다.

### 문제 6: PR 댓글 작성 권한 부족 (`issues: write`)
- **원인**: PR에 일반 댓글을 작성하는 기능은 내부적으로 Issues API를 사용하므로, `issues: write` 권한이 필요했습니다. 이 권한이 없어 댓글을 작성하지 못하는 잠재적인 오류가 있었습니다.
- **해결**: `.github/workflows/review-bot-test.yml`의 `permissions` 블록에 `issues: write` 권한을 명시적으로 추가하여 해결했습니다.

## 3. 최종 요약

위와 같은 과정을 통해 Phase 3의 모든 기능 구현을 완료했으며, 여러 단계의 트러블슈팅을 통해 코드의 안정성과 완성도를 크게 향상시켰습니다. 또한, 이 과정에서 얻은 교훈을 `docs/implements checklist.md` 파일에 반영하여 향후 발생할 수 있는 잠재적인 문제를 예방하도록 조치했습니다.
