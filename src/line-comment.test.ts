import * as lineComment from './line-comment';
import * as github from '@actions/github';

// Mock the @actions/github module
jest.mock('@actions/github');

// Define a reusable mock octokit object
const mockOctokit = {
  rest: {
    users: {
      getAuthenticated: jest.fn(),
    },
    pulls: {
      createReview: jest.fn(),
      listReviews: jest.fn(),
    },
  },
};

// Cast to the expected type for convenience
const mockedGithub = github as jest.Mocked<typeof github>;
(mockedGithub.getOctokit as any).mockReturnValue(mockOctokit);

describe('line-comment', () => {
  const repo = { owner: 'test-owner', repo: 'test-repo' };
  const pull_number = 123;
  const botUsername = 'github-actions[bot]';

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock for getAuthenticated for all tests in this suite
    mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
      data: { login: botUsername },
    } as any);
  });

  // createLineComments 함수는 main.ts로 이동되어 더 이상 export되지 않습니다.

  describe('findExistingReview', () => {
    it('should find and return an existing review from the bot', async () => {
      // Arrange
      const reviews = [
        {
          id: 1,
          user: { login: 'some-user' },
          body: 'A regular review'
        },
        {
          id: 2,
          user: { login: botUsername },
          body: 'Bot review with tag\n\n<!-- gemini-line-reviewer -->'
        },
        {
          id: 3,
          user: { login: 'another-user' },
          body: 'Another review'
        }
      ];

      mockOctokit.rest.pulls.listReviews.mockResolvedValue({
        data: reviews
      } as any);

      // Act
      const result = await lineComment.findExistingReview(
        mockOctokit as any,
        repo,
        pull_number
      );

      // Assert
      expect(result).toBe(reviews[1]);
      expect(mockOctokit.rest.pulls.listReviews).toHaveBeenCalledWith({
        ...repo,
        pull_number,
      });
      expect(mockOctokit.rest.users.getAuthenticated).toHaveBeenCalled();
    });

    it('should return undefined if no existing review is found', async () => {
      // Arrange
      const reviews = [
        {
          id: 1,
          user: { login: 'some-user' },
          body: 'A regular review'
        },
        {
          id: 2,
          user: { login: 'another-user' },
          body: 'Another review'
        }
      ];

      mockOctokit.rest.pulls.listReviews.mockResolvedValue({
        data: reviews
      } as any);

      // Act
      const result = await lineComment.findExistingReview(
        mockOctokit as any,
        repo,
        pull_number
      );

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined if bot has reviews but without the tag', async () => {
      // Arrange
      const reviews = [
        {
          id: 1,
          user: { login: botUsername },
          body: 'Bot review without tag'
        },
        {
          id: 2,
          user: { login: botUsername },
          body: 'Another bot review without tag'
        }
      ];

      mockOctokit.rest.pulls.listReviews.mockResolvedValue({
        data: reviews
      } as any);

      // Act
      const result = await lineComment.findExistingReview(
        mockOctokit as any,
        repo,
        pull_number
      );

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined if no reviews exist', async () => {
      // Arrange
      mockOctokit.rest.pulls.listReviews.mockResolvedValue({
        data: []
      } as any);

      // Act
      const result = await lineComment.findExistingReview(
        mockOctokit as any,
        repo,
        pull_number
      );

      // Assert
      expect(result).toBeUndefined();
    });

    it('should handle multiple bot reviews and return the first one with tag', async () => {
      // Arrange
      const reviews = [
        {
          id: 1,
          user: { login: botUsername },
          body: 'First bot review without tag'
        },
        {
          id: 2,
          user: { login: botUsername },
          body: 'Second bot review with tag\n\n<!-- gemini-line-reviewer -->'
        },
        {
          id: 3,
          user: { login: botUsername },
          body: 'Third bot review with tag\n\n<!-- gemini-line-reviewer -->'
        }
      ];

      mockOctokit.rest.pulls.listReviews.mockResolvedValue({
        data: reviews
      } as any);

      // Act
      const result = await lineComment.findExistingReview(
        mockOctokit as any,
        repo,
        pull_number
      );

      // Assert
      expect(result).toBe(reviews[1]); // Should return the first one with the tag
    });

    it('should handle API errors when fetching user info', async () => {
      // Arrange
      const userError = new Error('User API Error');
      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(userError);

      // Act & Assert
      await expect(
        lineComment.findExistingReview(mockOctokit as any, repo, pull_number)
      ).rejects.toThrow('User API Error');
    });

    it('should handle API errors when fetching reviews', async () => {
      // Arrange
      const reviewsError = new Error('Reviews API Error');
      mockOctokit.rest.pulls.listReviews.mockRejectedValue(reviewsError);

      // Act & Assert
      await expect(
        lineComment.findExistingReview(mockOctokit as any, repo, pull_number)
      ).rejects.toThrow('Reviews API Error');
    });

    it('should handle reviews with null user objects', async () => {
      // Arrange
      const reviews = [
        {
          id: 1,
          user: null,
          body: 'Review with null user'
        },
        {
          id: 2,
          user: { login: botUsername },
          body: 'Bot review with tag\n\n<!-- gemini-line-reviewer -->'
        }
      ];

      mockOctokit.rest.pulls.listReviews.mockResolvedValue({
        data: reviews
      } as any);

      // Act
      const result = await lineComment.findExistingReview(
        mockOctokit as any,
        repo,
        pull_number
      );

      // Assert
      expect(result).toBe(reviews[1]);
    });

    it('should handle reviews with null body', async () => {
      // Arrange
      const reviews = [
        {
          id: 1,
          user: { login: botUsername },
          body: null
        },
        {
          id: 2,
          user: { login: botUsername },
          body: 'Bot review with tag\n\n<!-- gemini-line-reviewer -->'
        }
      ];

      mockOctokit.rest.pulls.listReviews.mockResolvedValue({
        data: reviews
      } as any);

      // Act
      const result = await lineComment.findExistingReview(
        mockOctokit as any,
        repo,
        pull_number
      );

      // Assert
      expect(result).toBe(reviews[1]);
    });
  });

  describe('LineComment interface', () => {
    it('should have correct structure for LineComment', () => {
      // Arrange
      const lineCommentExample: lineComment.GithubLineComment = {
        path: 'src/test.ts',
        line: 42,
        side: 'RIGHT',
        body: 'Test comment'
      };

      // Assert
      expect(lineCommentExample.path).toBe('src/test.ts');
      expect(lineCommentExample.line).toBe(42);
      expect(lineCommentExample.side).toBe('RIGHT');
      expect(lineCommentExample.body).toBe('Test comment');
    });

    it('should accept LEFT side for LineComment', () => {
      // Arrange
      const lineCommentExample: lineComment.GithubLineComment = {
        path: 'src/test.ts',
        line: 42,
        side: 'LEFT',
        body: 'Test comment for old version'
      };

      // Assert
      expect(lineCommentExample.side).toBe('LEFT');
    });
  });

  describe('ReviewData interface', () => {
    it('should have correct structure for ReviewData', () => {
      // Arrange
      const reviewDataExample: lineComment.ReviewData = {
        body: 'Overall review summary',
        comments: [
          {
            path: 'src/test.ts',
            line: 10,
            side: 'RIGHT',
            body: 'First comment'
          },
          {
            path: 'src/utils.ts',
            line: 20,
            side: 'LEFT',
            body: 'Second comment'
          }
        ]
      };

      // Assert
      expect(reviewDataExample.body).toBe('Overall review summary');
      expect(reviewDataExample.comments).toHaveLength(2);
      expect(reviewDataExample.comments[0].path).toBe('src/test.ts');
      expect(reviewDataExample.comments[1].side).toBe('LEFT');
    });
  });
});