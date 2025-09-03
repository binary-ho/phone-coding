## Phase 1: Project Scaffolding and Initialization

In this phase, the basic project structure and environment for developing a TypeScript-based GitHub Action will be set up.

### 1.1. Set up TypeScript GitHub Action Project Structure
- [x] Create a `package.json` file using the `npm init -y` command.
- [x] Create a `src` directory in the project root, and create a `main.ts` file inside it.
- [x] Create a `tsconfig.json` file and configure the TypeScript compiler options (e.g., target: `es2022`, module: `NodeNext`, moduleResolution: `NodeNext`, outDir: `dist`).

### 1.2. Install Dependencies
- [x] Install TypeScript-related packages with the command `npm install typescript @types/node --save-dev`.
- [x] Install the essential toolkit for GitHub Actions development with `npm install @actions/core @actions/github @actions/exec`.
- [x] Install the official SDK for communicating with the Gemini API with `npm install @google/genai`.[1]

### 1.3. Define `action.yml` Specification
- [x] Create an `action.yml` file in the project root.
- [x] Define the Action's `name`, `description`, and execution environment (`runs`).
    - `runs.using`: `'node20'`
    - `runs.main`: `'dist/index.js'`
- [x] Define the Action's `inputs`.
    - `gemini-api-key`: Required (`required: true`), the Gemini API key.
    - `github-token`: Required (`required: true`), defaults to `${{ github.token }}`.
    - `mode`: Not required, defaults to `review`, (values: `review`, `summarize`).

### 1.4. Configure Build and Packaging
- [x] Install the `ncc` package with `npm install @vercel/ncc --save-dev`. `ncc` is used to compile the code and all its dependencies into a single JavaScript file.
- [x] Add a build script to the `scripts` section of `package.json`: `"build": "ncc build src/main.ts --source-map --license licenses.txt"`.

### 1.5. Set up Authentication Credentials
- [ ] Obtain a Gemini API key from Google AI Studio.[2]
- [ ] In the GitHub repository where the Action will be tested, store the obtained key as a secret named `GEMINI_API_KEY` under `Settings > Secrets and variables > Actions`.[2]

### 1.6. Phase 1 Final Verification
- [x] Verify that the `npm run build` command executes without errors and that a `dist/index.js` file is generated.
- [x] Review the `action.yml` file to ensure it has the correct format and content.
- [ ] Confirm that the `GEMINI_API_KEY` secret is correctly set up in the GitHub repository.

---

## Phase 2: Implement Core Modules

In this phase, the core logic modules of the Action will be implemented in TypeScript. Each module will be created as a separate file under the `src` directory to maintain high cohesion.

### 2.1. Implement Context Provider (`src/context.ts`)
- [ ] Implement the `getPrContext` function.
    - Use the `context` object from `@actions/github` to extract and return the PR number, title, body, and base and head SHAs.
- [ ] Implement the `getPrDiff` function.
    - Use `@actions/exec` to run the `git diff --no-color ${{ baseSha }}..${{ headSha }}` command.[3]
    - Add a comment specifying that an accurate diff can only be obtained in an environment where `fetch-depth: 0` is set.[4, 5]
    - Return the execution result as a string.

### 2.2. Implement Prompt Assembler (`src/prompt.ts`)
- [ ] Implement the `buildPrompt` function.
    - Inputs: `prTitle`, `prBody`, `diff`, `mode` (`review` or `summarize`).
    - Branch based on the `mode` value to dynamically construct prompt templates for each persona ("PR Summarizer", "Code Reviewer").
    - Insert the PR title, body, and diff content into the prompt template with clear separators (e.g., `--- DIFF ---`).
    - Return the final, assembled prompt string.

### 2.3. Implement Gemini API Client (`src/gemini.ts`)
- [ ] Implement the `callGeminiApi` function.
    - Initialize the Gemini client using the `@google/genai` SDK. The API key should be passed as an argument to the function.
    - Call the `generativeModel.generateContent()` method to send the assembled prompt to the API.
    - Extract the text result (`response.text()`) from the API response and return it.
    - Wrap the API call in a `try-catch` block to handle potential failures and log errors.

### 2.4. Implement Feedback Integrator (`src/comment.ts`)
- [ ] Implement the `findPreviousComment` function.
    - Use the Octokit client from `@actions/github` to call `issues.listComments`.
    - Search for an existing comment by a unique identifier in its body (e.g., ``) and return its ID. Refer to the logic of `peter-evans/find-comment`.[6]
- [ ] Implement the `postOrUpdateComment` function.
    - Call `findPreviousComment` to check for an existing comment ID.
    - If an ID exists, call `issues.updateComment`; otherwise, call `issues.createComment` to post the review result to the PR. Refer to the logic of `peter-evans/create-or-update-comment`.[6]

### 2.5. Phase 2 Final Verification
- [ ] Verify that the functions in each module return the correct output types for the expected inputs (type-level verification before unit testing).
- [ ] Review the code structure to ensure each file adheres to the single-responsibility principle and has low coupling with other modules.
- [ ] Confirm that all external API calls (Git, GitHub API, Gemini API) are wrapped in appropriate error-handling logic.

---

## Phase 3: Implement Orchestration and Workflow

In this phase, the implemented modules will be integrated to control the overall execution flow of the Action, and a workflow will be written to test the Action in a real PR.

### 3.1. Implement Main Orchestrator (`src/main.ts`)
- [ ] Define and execute an async `run` function.
- [ ] Use `@actions/core` to get the `gemini-api-key`, `github-token`, and `mode` inputs.
- [ ] **Control the execution flow:**
    1. Call functions from `context.ts` to get the PR context and diff.
    2. Call the function from `prompt.ts` to generate the appropriate prompt based on the context and `mode`.
    3. Call the function from `gemini.ts` to execute the Gemini API with the generated prompt and receive the result.
    4. Call the function from `comment.ts` to post or update a comment on the PR with Gemini's response.
- [ ] Handle any errors that occur during the process using `core.setFailed()`.

### 3.2. Write Test Workflow (`.github/workflows/review-bot-test.yml`)
- [ ] Create the workflow file.
- [ ] Set it to be triggered by the `on: pull_request` event.
- [ ] Specify the required permissions in the `permissions` block: `pull-requests: write` and `contents: read`.[7, 8]
- [ ] **Define the Job:**
    1. Use `actions/checkout@v4` to check out the code. The `fetch-depth: 0` option must be included.[4, 5]
    2. Use the `uses:./` syntax to call the locally developed Action.
    3. Use the `with` block to pass the `gemini-api-key` and `github-token` to the Action.
        - `gemini-api-key: ${{ secrets.GEMINI_API_KEY }}`
        - `github-token: ${{ secrets.GITHUB_TOKEN }}`

### 3.3. Phase 3 Final Verification
- [ ] Perform a code review of `main.ts` to ensure the `run` function calls the functions from each module in the correct order and with the correct arguments.
- [ ] Validate the YAML syntax of the test workflow file.
- [ ] Confirm that the workflow is ready to be triggered correctly on PR creation and updates.

---

## Phase 4: Testing and Refinement

In this phase, unit and integration tests will be performed to ensure the Action's stability and quality, and the AI's response quality will be refined.

### 4.1. Write Unit Tests
- [ ] Install the Jest testing framework with `npm install jest @types/jest ts-jest --save-dev`.
- [ ] Set up the `jest.config.js` file.
- [ ] Write unit tests for the `buildPrompt` function in `prompt.ts` (verify that the expected prompt is generated for various inputs).
- [ ] Add unit tests for other pure functions in the modules.

### 4.2. Perform Integration Testing
- [ ] Create a test branch and commit a simple code change.
- [ ] Create a Pull Request with that branch to trigger the `review-bot-test.yml` workflow.
- [ ] Verify that the Action runs successfully and posts a comment in the expected format on the PR.
- [ ] Push a new commit to the PR branch and verify that the Action updates the existing comment instead of posting a new one.

### 4.3. Iterate on Prompt Engineering
- [ ] Evaluate the quality of the AI's response generated from the integration test.
- [ ] If the response is unsatisfactory, modify the prompt templates in `src/prompt.ts` (e.g., clearer instructions, providing examples, specifying output format).
- [ ] After modifying the prompt, repeat the integration test to check for improvements.

### 4.4. Phase 4 Final Verification
- [ ] Ensure that unit test coverage is sufficient for the core logic.
- [ ] Confirm that all integration test scenarios (initial creation, update, large diff, etc.) have passed as intended.
- [ ] Make a final assessment that the final prompt consistently produces results of satisfactory quality.

---

## Phase 5: Documentation and Deployment

In this phase, documentation will be written to help other users easily understand and use the Action, and it will be officially versioned and deployed.

### 5.1. Write `README.md` Document
- [ ] Clearly explain the Action's features and purpose.
- [ ] Provide a complete workflow example in the **Usage** section that users can copy and paste.
- [ ] In the **Inputs** section, list all the inputs defined in `action.yml` in a table format, including their description, whether they are required, and their default values.
- [ ] Specify the permissions required by the workflow (e.g., `pull-requests: write`) in the **Permissions** section.

### 5.2. Versioning and Release
- [ ] Merge all changes into the `main` branch.
- [ ] Create a Git tag to mark the first version, e.g., `git tag -a v1.0.0 -m "Initial release"`.
- [ ] Push the tag to the remote repository with `git push --follow-tags`.
- [ ] Users can now reference a stable version in their workflows, such as `@v1`.

### 5.3. Phase 5 Final Verification
- [ ] Perform a final check to ensure the example workflow in `README.md` works as described.
- [ ] Verify that the created Git tag points to the correct commit.
- [ ] Conduct a final validation to ensure the Action works correctly when called from another repository using the `@v1` tag.
