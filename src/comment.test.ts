import * as comment from './comment';
import * as github from '@actions/github';

// Mock the @actions/github module
jest.mock('@actions/github');

// Define a reusable mock octokit object
const mockOctokit = {
  rest: {
    users: {
      getAuthenticated: jest.fn(),
    },
    issues: {
      listComments: jest.fn(),
      updateComment: jest.fn(),
      createComment: jest.fn(),
    },
  },
  paginate: jest.fn(),
};

// Cast to the expected type for convenience
const mockedGithub = github as jest.Mocked<typeof github>;
(mockedGithub.getOctokit as any).mockReturnValue(mockOctokit);

describe('comment', () => {
  const repo = { owner: 'test-owner', repo: 'test-repo' };
  const issue_number = 123;
  const botUsername = 'github-actions[bot]';
  const COMMENT_TAG = '<!-- gemini-reviewer -->';

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock for getAuthenticated for all tests in this suite
    mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
      data: { login: botUsername },
    } as any);
  });

  describe('findPreviousComment', () => {
    it('should find and return a previous comment from the bot', async () => {
      // Arrange
      const comments = [
        { id: 1, user: { login: 'some-user' }, body: 'A regular comment.' },
        { id: 2, user: { login: botUsername }, body: `An old review.\\n\\n${COMMENT_TAG}` },
        { id: 3, user: { login: 'another-user' }, body: 'Another comment.' },
      ];
      mockOctokit.paginate.mockResolvedValue(comments);

      // Act
      const result = await comment.findPreviousComment(mockOctokit as any, repo, issue_number);

      // Assert
      expect(result).toBe(comments[1]);
      expect(mockOctokit.paginate).toHaveBeenCalledWith(mockOctokit.rest.issues.listComments, {
        ...repo,
        issue_number,
      });
    });

    it('should return undefined if no previous comment is found', async () => {
      // Arrange
      const comments = [
        { id: 1, user: { login: 'some-user' }, body: 'A regular comment.' },
        { id: 3, user: { login: 'another-user' }, body: 'Another comment.' },
      ];
      mockOctokit.paginate.mockResolvedValue(comments);

      // Act
      const result = await comment.findPreviousComment(mockOctokit as any, repo, issue_number);

      // Assert
      expect(result).toBeUndefined();
    });
     it('should return undefined if the bot user has no comments', async () => {
      // Arrange
      mockOctokit.paginate.mockResolvedValue([]); // No comments at all

      // Act
      const result = await comment.findPreviousComment(mockOctokit as any, repo, issue_number);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('postOrUpdateComment', () => {
    const body = 'This is the new review content.';
    const expectedBody = `${body}\n\n${COMMENT_TAG}`;

    it('should update the comment if a previous one is found', async () => {
      // Arrange
      const previousComment = { id: 987, user: { login: botUsername }, body: 'old comment' };
      // Spy on findPreviousComment and mock its return value for this test
      const findSpy = jest.spyOn(comment, 'findPreviousComment').mockResolvedValue(previousComment as any);

      // Act
      await comment.postOrUpdateComment(mockOctokit as any, repo, issue_number, body);

      // Assert
      expect(findSpy).toHaveBeenCalledWith(mockOctokit, repo, issue_number);
      expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith({
        ...repo,
        comment_id: previousComment.id,
        body: expectedBody,
      });
      expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();

      findSpy.mockRestore(); // Clean up spy
    });

    it('should create a new comment if no previous one is found', async () => {
      // Arrange
      const findSpy = jest.spyOn(comment, 'findPreviousComment').mockResolvedValue(undefined);

      // Act
      await comment.postOrUpdateComment(mockOctokit as any, repo, issue_number, body);

      // Assert
      expect(findSpy).toHaveBeenCalledWith(mockOctokit, repo, issue_number);
      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        ...repo,
        issue_number,
        body: expectedBody,
      });
      expect(mockOctokit.rest.issues.updateComment).not.toHaveBeenCalled();

      findSpy.mockRestore();
    });
  });
});
