# AI Code Reviewer

This GitHub Action uses Google's Gemini API to automatically review and summarize pull requests. It can be configured to operate in two modes: `review` and `summarize`.

## Features

- **Automatic Code Review:** Provides code reviews on your pull requests.
- **Pull Request Summarization:** Generates summaries for your pull requests.
- **Customizable Modes:** Choose between `review` and `summarize` modes to fit your needs.
- **Idempotent Commenting:** Updates its own previous comment on new commits instead of creating a new one.

## Usage

To use this action in your workflow, add the following step to your job. This action is typically triggered by the `pull_request` event.

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
          mode: 'review' # Optional: 'review' or 'summarize'
```

## Inputs

| Input            | Description                  | Required | Default            |
|------------------|------------------------------|----------|--------------------|
| `gemini-api-key` | The Gemini API key.          | `true`   | -                  |
| `github-token`   | The GitHub token.            | `true`   | `${{ github.token }}` |
| `mode`           | The mode of operation. Can be `review` or `summarize`. | `false`  | `review`           |

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
