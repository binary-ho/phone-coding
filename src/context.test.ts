import { getPullRequestContext, getPullRequestDiff } from './context';
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
      const prContext = await getPullRequestContext(mockOctokit as any);

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
      const prContext = await getPullRequestContext(mockOctokit as any);

      // Assert
      expect(prContext).toBeUndefined();
      expect(mockOctokit.rest.pulls.get).not.toHaveBeenCalled();
    });
  });

  describe('getPullRequestDiff', () => {
    it('should call GitHub API with correct parameters', async () => {
      // Arrange
      const mockOctokit = {
        rest: {
          pulls: {
            get: jest.fn().mockResolvedValue({ data: 'mock diff content' })
          }
        }
      };
      const repo = { owner: 'test-owner', repo: 'test-repo' };
      const pullNumber = 123;

      // Act
      await getPullRequestDiff(mockOctokit as any, repo, pullNumber);

      // Assert
      expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
        mediaType: { format: 'diff' }
      });
    });

    it('should return GitHub API diff content', async () => {
      // Arrange
      const diffContent = 'diff --git a/file.txt b/file.txt\\n--- a/file.txt\\n+++ b/file.txt\\n@@ -1 +1 @@\\n-hello\\n+world\\n';
      const mockOctokit = {
        rest: {
          pulls: {
            get: jest.fn().mockResolvedValue({ data: diffContent })
          }
        }
      };
      const repo = { owner: 'test-owner', repo: 'test-repo' };
      const pullNumber = 123;

      // Act
      const diff = await getPullRequestDiff(mockOctokit as any, repo, pullNumber);

      // Assert
      expect(diff).toBe(diffContent);
    });
  });
});
