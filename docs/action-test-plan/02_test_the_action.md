# 가이드: 다른 프로젝트에서 AI 리뷰 액션 테스트하기

이 문서는 `01_create_test_project.md` 가이드에 따라 생성된 Pull Request(PR)에 대해, 우리가 만든 AI 코드 리뷰 GitHub Action을 적용하고 테스트하는 방법을 안내합니다.

## 체크리스트

- [ ] 테스트할 프로젝트에 GitHub Actions 워크플로우 디렉토리 생성
- [ ] `review.yml` 워크플로우 파일 추가
- [ ] 테스트 프로젝트의 GitHub Secrets에 `GEMINI_API_KEY` 추가
- [ ] PR을 생성하여 액션이 올바르게 실행되는지 확인
- [ ] 액션이 PR에 리뷰 코멘트를 남기는지 확인

---

## 1단계: 워크플로우 파일 생성

테스트용 프로젝트의 루트에 `.github/workflows` 디렉토리를 생성하고, 그 안에 `review.yml` 파일을 추가합니다.

**파일 경로:** `.github/workflows/review.yml`

## 2단계: 워크플로우 코드 작성

`review.yml` 파일에 아래의 코드를 작성합니다. 이 코드는 Pull Request가 생성될 때마다 AI 리뷰 액션을 실행시킵니다.

```yaml
name: 'Run AI Code Review'
on:
  pull_request:
    branches: [ main ]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      # 1. 코드를 체크아웃합니다.
      # fetch-depth: 0 옵션은 모든 히스토리를 가져와 정확한 diff를 생성하기 위해 필수적입니다.
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # 2. AI 코드 리뷰 액션을 실행합니다.
      # uses: {owner}/{repo}@{branch} 형식으로 액션을 지정합니다.
      - name: AI Pull Request Reviewer
        uses: binary-ho/vibe-from-phone@main
        with:
          # GitHub API와 상호작용하기 위한 토큰입니다.
          github_token: ${{ secrets.GITHUB_TOKEN }}

          # Gemini API 키입니다. 아래 3단계에서 설정할 Secret을 통해 전달해야 합니다.
          gemini-api-key: ${{ secrets.GEMINI_API_KEY }}

          # 'review' 모드(기본값)로 설정하여 코드 리뷰를 수행하도록 합니다.
          mode: 'review'
```

## 3단계: Gemini API 키 설정

이 액션은 Gemini API를 사용하므로, API 키를 안전하게 전달해야 합니다.

1.  테스트용 프로젝트의 GitHub 레포지토리로 이동합니다.
2.  `Settings` > `Secrets and variables` > `Actions` 메뉴로 이동합니다.
3.  `New repository secret` 버튼을 클릭합니다.
4.  **Name**에는 `GEMINI_API_KEY`를 입력합니다.
5.  **Value**에는 당신의 Gemini API 키를 붙여넣습니다.
6.  `Add secret`을 클릭하여 저장합니다.

## 4단계: 액션 실행 및 결과 확인

모든 설정이 완료되었습니다.

이제 `01_create_test_project.md` 가이드에 따라 생성한 `feature/ai-review-test-case` 브랜치에서 `main` 브랜치로 Pull Request를 생성(또는 이미 생성했다면 푸시)하면, 이 워크플로우가 자동으로 실행됩니다.

**예상 결과:**
- 워크플로우가 성공적으로 실행됩니다.
- 잠시 후, AI 리뷰 액션이 해당 PR에 찾아낸 문제점들을 조목조목 지적하는 코멘트를 남깁니다.
- 코멘트에는 `01_create_test_project.md`에서 의도적으로 추가했던 보안 문제, 코드 스멜 등이 모두 포함되어 있어야 합니다.
