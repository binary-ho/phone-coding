import { getPrContext, getPrDiff } from './context';
import * as github from '@actions/github';
import * as exec from '@actions/exec';

// Mock the entire @actions/github and @actions/exec modules
jest.mock('@actions/github', () => ({
  ...jest.requireActual('@actions/github'), // import and retain default behavior
  getOctokit: jest.fn(),
  context: {
    repo: {
      owner: 'test-owner',
      repo: 'test-repo',
    },
    payload: {},
    issue: {
        number: 123,
    }
  },
}));

jest.mock('@actions/exec', () => ({
  exec: jest.fn(),
}));

// Type-safe mock functions
const mockedExec = exec.exec as jest.Mock;
const mockedGithub = github as jest.Mocked<typeof github>;

describe('context', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPrContext', () => {
    it('should return PR context when the event is a pull request', async () => {
      // Arrange
      mockedGithub.context.payload.pull_request = { number: 123 };
      const mockOctokit = {
        rest: {
          pulls: {
            get: jest.fn().mockResolvedValue({
              data: {
                title: 'Test PR',
                body: 'This is the body',
                base: { sha: 'base-sha' },
                head: { sha: 'head-sha' },
              },
            }),
          },
        },
      };

      // Act
      const prContext = await getPrContext(mockOctokit as any);

      // Assert
      expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
      });
      expect(prContext).toEqual({
        repo: { owner: 'test-owner', repo: 'test-repo' },
        pr: {
          number: 123,
          title: 'Test PR',
          body: 'This is the body',
          base_sha: 'base-sha',
          head_sha: 'head-sha',
        },
      });
    });

    it('should return undefined when the event is not a pull request', async () => {
      // Arrange
      mockedGithub.context.payload.pull_request = undefined;
      const mockOctokit = { rest: { pulls: { get: jest.fn() } } };

      // Act
      const prContext = await getPrContext(mockOctokit as any);

      // Assert
      expect(prContext).toBeUndefined();
      expect(mockOctokit.rest.pulls.get).not.toHaveBeenCalled();
    });
  });

  describe('getPrDiff', () => {
    it('should call "git diff" with the correct SHAs', async () => {
      // Arrange
      const baseSha = 'base123';
      const headSha = 'head456';

      // Act
      await getPrDiff(baseSha, headSha);

      // Assert
      expect(mockedExec).toHaveBeenCalledWith(
        `git diff --no-color ${baseSha}..${headSha}`,
        [],
        expect.any(Object)
      );
    });

    it('should capture and return the stdout of the git diff command', async () => {
      // Arrange
      const diffOutput = 'diff --git a/file.txt b/file.txt\\n--- a/file.txt\\n+++ b/file.txt\\n@@ -1 +1 @@\\n-hello\\n+world\\n';
      mockedExec.mockImplementation((command, args, options) => {
        options.listeners.stdout(Buffer.from(diffOutput));
        return Promise.resolve(0);
      });

      // Act
      const diff = await getPrDiff('base-sha', 'head-sha');

      // Assert
      expect(diff).toBe(diffOutput);
    });
  });
});
