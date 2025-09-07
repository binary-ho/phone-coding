import { parseLineCommentReviewForLineComments } from './ai-response-parser';
import { DiffLine } from './diff-parser';

describe('ai-response-parser', () => {
  describe('parseAIResponseForLineComments', () => {
    const mockDiffLines: DiffLine[] = [
      {
        path: 'src/example.ts',
        lineNumber: 10,
        content: '  console.log("test");',
        type: 'added'
      },
      {
        path: 'src/example.ts',
        lineNumber: 15,
        content: '  return result;',
        type: 'added'
      },
      {
        path: 'src/utils.ts',
        lineNumber: 5,
        content: '  const temp = "unused";',
        type: 'removed'
      },
      {
        path: 'src/utils.ts',
        lineNumber: 20,
        content: '  // TODO: implement',
        type: 'added'
      }
    ];

    it('should parse AI response with valid line comments', () => {
      // Arrange
      const aiResponse = `Overall, this PR looks good but has some issues.

src/example.ts:10: This console.log should be removed in production code.
src/utils.ts:20: TODO comments should be resolved before merging.

The changes improve the functionality but need cleanup.`;

      // Act
      const result = parseLineCommentReviewForLineComments(aiResponse, mockDiffLines);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: 'src/example.ts',
        line: 10,
        side: 'RIGHT',
        body: 'This console.log should be removed in production code.'
      });
      expect(result[1]).toEqual({
        path: 'src/utils.ts',
        line: 20,
        side: 'RIGHT',
        body: 'TODO comments should be resolved before merging.'
      });
    });

    it('should handle AI response with only general comments', () => {
      // Arrange
      const aiResponse = `This PR introduces good improvements to the codebase.
The implementation follows best practices and is well-structured.
No specific line-level issues were found.`;

      // Act
      const result = parseLineCommentReviewForLineComments(aiResponse, mockDiffLines);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle AI response with only line comments', () => {
      // Arrange
      const aiResponse = `src/example.ts:10: Remove this debug statement.
src/utils.ts:20: Complete this TODO item.`;

      // Act
      const result = parseLineCommentReviewForLineComments(aiResponse, mockDiffLines);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: 'src/example.ts',
        line: 10,
        side: 'RIGHT',
        body: 'Remove this debug statement.'
      });
      expect(result[1]).toEqual({
        path: 'src/utils.ts',
        line: 20,
        side: 'RIGHT',
        body: 'Complete this TODO item.'
      });
    });

    it('should filter out line comments for non-existent lines in diff', () => {
      // Arrange
      const aiResponse = `General feedback about the PR.

src/example.ts:10: Valid comment for existing line.
src/example.ts:99: Invalid comment for non-existent line.
src/nonexistent.ts:5: Comment for non-existent file.
src/utils.ts:20: Valid comment for existing line.

Overall assessment complete.`;

      // Act
      const result = parseLineCommentReviewForLineComments(aiResponse, mockDiffLines);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: 'src/example.ts',
        line: 10,
        side: 'RIGHT',
        body: 'Valid comment for existing line.'
      });
      expect(result[1]).toEqual({
        path: 'src/utils.ts',
        line: 20,
        side: 'RIGHT',
        body: 'Valid comment for existing line.'
      });
    });

    it('should handle malformed line comment formats', () => {
      // Arrange
      const aiResponse = `General feedback.

src/example.ts:10: Valid format.
src/example.ts:invalid: Invalid line number.
invalid-format: Missing file path.
src/example.ts: Missing line number.
:15: Missing file path.

More general feedback.`;

      // Act
      const result = parseLineCommentReviewForLineComments(aiResponse, mockDiffLines);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'src/example.ts',
        line: 10,
        side: 'RIGHT',
        body: 'Valid format.'
      });
    });

    it('should handle empty AI response', () => {
      // Arrange
      const aiResponse = '';

      // Act
      const result = parseLineCommentReviewForLineComments(aiResponse, mockDiffLines);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle AI response with whitespace and formatting', () => {
      // Arrange
      const aiResponse = `   General comment with leading spaces.

src/example.ts:10:   Comment with extra spaces   
src/utils.ts:20:Comment without space after colon

   Trailing general comment.   `;

      // Act
      const result = parseLineCommentReviewForLineComments(aiResponse, mockDiffLines);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: 'src/example.ts',
        line: 10,
        side: 'RIGHT',
        body: 'Comment with extra spaces'
      });
      expect(result[1]).toEqual({
        path: 'src/utils.ts',
        line: 20,
        side: 'RIGHT',
        body: 'Comment without space after colon'
      });
    });

    it('should handle line comments with complex file paths', () => {
      // Arrange
      const complexDiffLines: DiffLine[] = [
        {
          path: 'src/components/ui/Button.tsx',
          lineNumber: 25,
          content: '  onClick={handleClick}',
          type: 'added'
        },
        {
          path: 'tests/unit/utils.spec.ts',
          lineNumber: 10,
          content: '  expect(result).toBe(true);',
          type: 'added'
        }
      ];

      const aiResponse = `Code review complete.

src/components/ui/Button.tsx:25: Consider adding proper TypeScript types for the onClick handler.
tests/unit/utils.spec.ts:10: This test assertion could be more descriptive.

Overall the changes look good.`;

      // Act
      const result = parseLineCommentReviewForLineComments(aiResponse, complexDiffLines);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: 'src/components/ui/Button.tsx',
        line: 25,
        side: 'RIGHT',
        body: 'Consider adding proper TypeScript types for the onClick handler.'
      });
      expect(result[1]).toEqual({
        path: 'tests/unit/utils.spec.ts',
        line: 10,
        side: 'RIGHT',
        body: 'This test assertion could be more descriptive.'
      });
    });

    it('should handle multiline comments correctly', () => {
      // Arrange
      const aiResponse = `General review feedback.

src/example.ts:10: This is a single line comment.
src/utils.ts:20: This is a multiline comment
that spans multiple lines
but should be treated as one comment.

Final thoughts on the PR.`;

      // Act
      const result = parseLineCommentReviewForLineComments(aiResponse, mockDiffLines);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: 'src/example.ts',
        line: 10,
        side: 'RIGHT',
        body: 'This is a single line comment.'
      });
      expect(result[1]).toEqual({
        path: 'src/utils.ts',
        line: 20,
        side: 'RIGHT',
        body: 'This is a multiline comment'
      });
    });

    it('should handle duplicate line comments', () => {
      // Arrange
      const aiResponse = `Review feedback.

src/example.ts:10: First comment about this line.
src/example.ts:10: Second comment about the same line.
src/utils.ts:20: Comment about different line.

End of review.`;

      // Act
      const result = parseLineCommentReviewForLineComments(aiResponse, mockDiffLines);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        path: 'src/example.ts',
        line: 10,
        side: 'RIGHT',
        body: 'First comment about this line.'
      });
      expect(result[1]).toEqual({
        path: 'src/example.ts',
        line: 10,
        side: 'RIGHT',
        body: 'Second comment about the same line.'
      });
      expect(result[2]).toEqual({
        path: 'src/utils.ts',
        line: 20,
        side: 'RIGHT',
        body: 'Comment about different line.'
      });
    });

    it('should handle empty diff lines array', () => {
      // Arrange
      const aiResponse = `src/example.ts:10: This comment won't be included.
src/utils.ts:20: Neither will this one.

General feedback remains.`;

      // Act
      const result = parseLineCommentReviewForLineComments(aiResponse, []);

      // Assert
      expect(result).toHaveLength(0);
    });
  });
});