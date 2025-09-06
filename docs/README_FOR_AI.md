# AI Code Reviewer - AI용 프로젝트 소개

## 프로젝트 개요

GitHub Action으로 구현된 AI 코드 리뷰어입니다.
Google Gemini API를 사용하여 Pull Request를 자동으로 분석하고 리뷰합니다.

## 핵심 기능

### 1. 라인별 코드 리뷰
- 변경된 코드의 특정 라인에 직접 코멘트 작성
- GitHub Pull Request Review API 사용
- diff 파싱을 통한 정확한 라인 매핑

### 2. PR 요약
- Pull Request 전체에 대한 종합적인 요약 제공
- 변경사항의 전반적인 분석

### 3. 스마트 동작
- 라인별 이슈가 없을 때 자동으로 일반 코멘트로 전환
- 기존 리뷰 중복 방지
- 멱등성 보장 (동일한 커밋에 대해 기존 코멘트 업데이트)

## 사용법

### 기본 설정 (라인별 리뷰)
```yaml
- name: AI Code Reviewer
  uses: ./
  with:
    gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    mode: 'review'
```

### PR 요약 모드
```yaml
- name: AI Code Reviewer
  uses: ./
  with:
    gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    mode: 'summarize'
```

### 필수 권한
```yaml
permissions:
  pull-requests: write
  contents: read
  users: read
  issues: write
```

## 입력 파라미터

| 파라미터 | 설명 | 필수 | 기본값 |
|---------|------|------|--------|
| `gemini-api-key` | Google Gemini API 키 | ✓ | - |
| `github-token` | GitHub 토큰 | ✓ | `${{ github.token }}` |
| `mode` | 동작 모드 (`review` 또는 `summarize`) | ✗ | `review` |

## 프로젝트 구조

### 설정 파일
- `action.yml`: GitHub Action 정의
- `package.json`: Node.js 의존성 관리
- `tsconfig.json`: TypeScript 컴파일 설정

### 소스 코드 (`src/`)

#### 핵심 모듈
- `main.ts`: 진입점, 전체 워크플로우 제어
- `gemini.ts`: Google Gemini API 통신
- `context.ts`: GitHub PR 컨텍스트 처리

#### 라인 코멘트 시스템
- `line-comment.ts`: GitHub Review API를 통한 라인별 코멘트 생성
- `diff-parser.ts`: Git diff 파싱, 라인 번호 추적
- `ai-response-parser.ts`: AI 응답에서 라인별 코멘트 추출

#### 지원 모듈
- `prompt.ts`: AI 프롬프트 생성 (한국어 지시사항 포함)
- `comment.ts`: 일반 PR 코멘트 처리

#### 테스트
각 모듈마다 `.test.ts` 파일로 단위 테스트 구현 (총 51개 테스트)

### 문서 (`docs/`)
- `comment-line/`: 라인 코멘트 기능 구현 문서
- 구현 분석, 상태 보고서, 최종 검토 보고서 포함

## 동작 원리

### Review 모드 (기본)
1. PR diff 추출 및 파싱
2. 라인별 코멘트 형식으로 AI 프롬프트 생성
3. Gemini API 호출
4. AI 응답에서 라인별 코멘트 추출
5. GitHub Review API로 라인별 코멘트 생성
6. 라인별 이슈가 없으면 일반 코멘트로 폴백

### Summarize 모드
1. PR diff 추출
2. 요약 형식으로 AI 프롬프트 생성
3. Gemini API 호출
4. 일반 PR 코멘트로 결과 게시

## 기술 스택

- **언어**: TypeScript
- **런타임**: Node.js 20
- **AI API**: Google Gemini
- **GitHub API**: Octokit
- **테스트**: Jest
- **빌드**: ncc (Vercel)

## 주요 특징

- 완전한 TypeScript 타입 안전성
- 포괄적인 테스트 커버리지 (51개 테스트)
- 모듈화된 아키텍처
- 에러 처리 및 우아한 실패 처리
- 한국어 AI 프롬프트 지원