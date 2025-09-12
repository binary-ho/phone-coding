# AI Code Reviewer

This GitHub Action uses Google's Gemini API to automatically review and summarize pull requests. It operates in two modes: `review` (provides line-specific code comments) and `summarize` (provides general PR summaries).

## Features

- **Automatic Code Review:** Provides detailed code reviews with line-specific comments on your pull requests.
- **Pull Request Summarization:** Generates comprehensive summaries for your pull requests.
- **Line-Specific Comments:** Default behavior for review mode - comments appear directly on relevant lines in the diff.
- **Customizable Modes:** Choose between `review` (line-specific comments) and `summarize` (general comments) modes.
- **Smart Fallback:** Automatically falls back to general comments when no line-specific issues are found.
- **Idempotent Commenting:** Updates its own previous comment on new commits instead of creating a new one.

## Usage

To use this action in your workflow, add the following step to your job. This action is typically triggered by the `pull_request` event.

### Code Review with Line-Specific Comments

```yaml
name: 'AI Code Reviewer'

on:
  pull_request:
    branches:
      - main

permissions:
  pull-requests: write
  contents: read
  users: read
  issues: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install Dependencies
        run: npm install

      - name: Build Action
        run: npm run build

      - name: Run AI Code Reviewer
        uses: ./ # In a real-world scenario, you would use the repository name, e.g., your-username/your-repo-name@v1
        with:
          gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          mode: 'review' # Provides line-specific comments on code changes
```

### Pull Request Summarization

For generating general PR summaries instead of line-specific reviews:

```yaml
      - name: Run AI Code Reviewer for Summarization
        uses: ./ # In a real-world scenario, you would use the repository name, e.g., your-username/your-repo-name@v1
        with:
          gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          mode: 'summarize' # Provides general PR summary
```

### 체크리스트 기능 사용법

#### 1. 체크리스트 파일 생성
리포지토리에 `.github/checklist.yml` 파일을 생성하세요:

```yaml
checklist:
  name: "우리 팀의 코드 품질 체크리스트"
  items:
    - id: "null-safety"
      title: "nullpoint exception이 확실하게 없습니다"
      description: "모든 객체 접근에서 null 체크가 수행되는지 확인"
      priority: "high"
```

#### 2. GitHub Action 설정
```yaml
- name: AI Code Reviewer
  uses: binary-ho/ai-code-reviewer@v1
  with:
    gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    checklist-path: '.github/checklist.yml'  # 선택적
```

#### 3. 결과 확인
PR에 체크리스트 검증 결과가 코멘트로 추가됩니다.

## Inputs

| Input            | Description                  | Required | Default            |
|------------------|------------------------------|----------|--------------------|
| `gemini-api-key` | The Gemini API key.          | `true`   | -                  |
| `github-token`   | The GitHub token.            | `true`   | `${{ github.token }}` |
| `mode`           | The mode of operation. Can be `review` (line-specific comments) or `summarize` (general comments). | `false`  | `review`           |
| `checklist-path` | Path to the checklist configuration file in the repository | `false`  | `.github/checklist.yml` |

## Comment Types

### Line-Specific Comments (Review Mode)
When using `mode: 'review'` (default), the AI will:
- Analyze each line of the code changes
- Provide specific feedback directly on relevant lines in the diff
- Create a GitHub review with inline comments
- Automatically fall back to general comments if no line-specific issues are found

Line-specific comments appear directly in the "Files changed" tab of your pull request, making it easier to address specific issues in context.

### General Comments (Summarize Mode)
When using `mode: 'summarize'`, the AI will provide a single comprehensive comment at the PR level, summarizing the overall changes and providing general feedback about the pull request.

## Permissions

This action requires the following permissions to be set in your workflow:

```yaml
permissions:
  pull-requests: write
  contents: read
  users: read
  issues: write
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## License

This project is licensed under the MIT License.
