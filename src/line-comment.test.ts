import * as lineComment from './line-comment';
import * as github from '@actions/github';
import {LineComments} from "./line-comment";
import { DiffSide } from './enums';

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

  describe('createLineComments', () => {
    it('should create a review with line comments successfully', async () => {
      // Arrange
      const lineComments: LineComments = [
          {
            path: 'src/example.ts',
            line: 10,
            side: DiffSide.RIGHT,
            body: 'This line needs improvement'
          },
          {
            path: 'src/utils.ts',
            line: 25,
            side: DiffSide.RIGHT,
            body: 'Consider refactoring this function'
          }
      ];

      const mockResponse = {
        data: {
          id: 456,
          body: 'Overall review summary',
          state: 'COMMENTED'
        }
      };

      mockOctokit.rest.pulls.createReview.mockResolvedValue(mockResponse as any);

      // Act
      const result = await lineComment.createLineComments(
        mockOctokit as any,
        repo,
        pull_number,
        lineComments
      );

      // Assert
      expect(mockOctokit.rest.pulls.createReview).toHaveBeenCalledWith({
        ...repo,
        pull_number,
        event: 'COMMENT',
        comments: lineComments,
      });
      expect(result).toBe(mockResponse);
    });

    it('should create a review with empty comments array', async () => {
      // Arrange
      const lineComments: LineComments = [];

      const mockResponse = {
        data: {
          id: 789,
          body: 'General feedback only',
          state: 'COMMENTED'
        }
      };

      mockOctokit.rest.pulls.createReview.mockResolvedValue(mockResponse as any);

      // Act
      const result = await lineComment.createLineComments(
        mockOctokit as any,
        repo,
        pull_number,
        lineComments
      );

      // Assert
      expect(mockOctokit.rest.pulls.createReview).toHaveBeenCalledWith({
        ...repo,
        pull_number,
        event: 'COMMENT',
        comments: [],
      });
      expect(result).toBe(mockResponse);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const lineComments: LineComments = [{
          path: 'src/error.ts',
          line: 1,
          side: DiffSide.RIGHT,
          body: 'This will cause an error'
      }];

      const apiError = new Error('GitHub API Error');
      mockOctokit.rest.pulls.createReview.mockRejectedValue(apiError);

      // Act & Assert
      await expect(
        lineComment.createLineComments(mockOctokit as any, repo, pull_number, lineComments)
      ).rejects.toThrow('GitHub API Error');

      expect(mockOctokit.rest.pulls.createReview).toHaveBeenCalledWith({
        ...repo,
        pull_number,
        event: 'COMMENT',
        comments: lineComments,
      });
    });
  });

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
      const lineCommentExample: lineComment.LineComment = {
        path: 'src/test.ts',
        line: 42,
        side: DiffSide.RIGHT,
        body: 'Test comment'
      };

      // Assert
      expect(lineCommentExample.path).toBe('src/test.ts');
      expect(lineCommentExample.line).toBe(42);
      expect(lineCommentExample.side).toBe(DiffSide.RIGHT);
      expect(lineCommentExample.body).toBe('Test comment');
    });

    it('should accept LEFT side for LineComment', () => {
      // Arrange
      const lineCommentExample: lineComment.LineComment = {
        path: 'src/test.ts',
        line: 42,
        side: DiffSide.LEFT,
        body: 'Test comment for old version'
      };

      // Assert
      expect(lineCommentExample.side).toBe(DiffSide.LEFT);
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
            side: DiffSide.RIGHT,
            body: 'First comment'
          },
          {
            path: 'src/utils.ts',
            line: 20,
            side: DiffSide.LEFT,
            body: 'Second comment'
          }
        ]
      };

      // Assert
      expect(reviewDataExample.body).toBe('Overall review summary');
      expect(reviewDataExample.comments).toHaveLength(2);
      expect(reviewDataExample.comments[0].path).toBe('src/test.ts');
      expect(reviewDataExample.comments[1].side).toBe(DiffSide.LEFT);
    });
  });
});