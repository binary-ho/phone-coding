import { parseDiffLines } from './diff-parser';

describe('diff-parser', () => {
  describe('parseDiff', () => {
    it('should parse a simple diff with added lines', () => {
      // Arrange
      const diff = `diff --git a/src/example.ts b/src/example.ts
index 1234567..abcdefg 100644
--- a/src/example.ts
+++ b/src/example.ts
@@ -1,3 +1,5 @@
 function hello() {
+  console.log('Hello World');
   return 'hello';
+  // Added comment
 }`;

      // Act
      const result = parseDiffLines(diff);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: 'src/example.ts',
        lineNumber: 2,
        content: '  console.log(\'Hello World\');',
        type: 'added'
      });
      expect(result[1]).toEqual({
        path: 'src/example.ts',
        lineNumber: 4,
        content: '  // Added comment',
        type: 'added'
      });
    });

    it('should parse a diff with removed lines', () => {
      // Arrange
      const diff = `diff --git a/src/utils.ts b/src/utils.ts
index 1234567..abcdefg 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1,5 +1,3 @@
 function calculate() {
-  const temp = 'unused';
   const result = 42;
-  console.log('debug');
   return result;
 }`;

      // Act
      const result = parseDiffLines(diff);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: 'src/utils.ts',
        lineNumber: 2,
        content: '  const temp = \'unused\';',
        type: 'removed'
      });
      expect(result[1]).toEqual({
        path: 'src/utils.ts',
        lineNumber: 3,
        content: '  console.log(\'debug\');',
        type: 'removed'
      });
    });

    it('should parse a diff with both added and removed lines', () => {
      // Arrange
      const diff = `diff --git a/src/mixed.ts b/src/mixed.ts
index 1234567..abcdefg 100644
--- a/src/mixed.ts
+++ b/src/mixed.ts
@@ -1,4 +1,4 @@
 function process() {
-  const oldVar = 'old';
+  const newVar = 'new';
   return oldVar;
 }`;

      // Act
      const result = parseDiffLines(diff);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: 'src/mixed.ts',
        lineNumber: 2,
        content: '  const oldVar = \'old\';',
        type: 'removed'
      });
      expect(result[1]).toEqual({
        path: 'src/mixed.ts',
        lineNumber: 2,
        content: '  const newVar = \'new\';',
        type: 'added'
      });
    });

    it('should handle multiple files in a single diff', () => {
      // Arrange
      const diff = `diff --git a/src/file1.ts b/src/file1.ts
index 1234567..abcdefg 100644
--- a/src/file1.ts
+++ b/src/file1.ts
@@ -1,2 +1,3 @@
 const a = 1;
+const b = 2;
 export { a };
diff --git a/src/file2.ts b/src/file2.ts
index 7890123..defghij 100644
--- a/src/file2.ts
+++ b/src/file2.ts
@@ -1,2 +1,3 @@
 const x = 10;
+const y = 20;
 export { x };`;

      // Act
      const result = parseDiffLines(diff);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: 'src/file1.ts',
        lineNumber: 2,
        content: 'const b = 2;',
        type: 'added'
      });
      expect(result[1]).toEqual({
        path: 'src/file2.ts',
        lineNumber: 2,
        content: 'const y = 20;',
        type: 'added'
      });
    });

    it('should handle complex line number ranges', () => {
      // Arrange
      const diff = `diff --git a/src/complex.ts b/src/complex.ts
index 1234567..abcdefg 100644
--- a/src/complex.ts
+++ b/src/complex.ts
@@ -10,6 +10,8 @@ function complexFunction() {
   const step1 = 'init';
   const step2 = 'process';
+  const step2a = 'intermediate';
   const step3 = 'finalize';
+  const step3a = 'cleanup';
   return result;
 }`;

      // Act
      const result = parseDiffLines(diff);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: 'src/complex.ts',
        lineNumber: 12,
        content: '  const step2a = \'intermediate\';',
        type: 'added'
      });
      expect(result[1]).toEqual({
        path: 'src/complex.ts',
        lineNumber: 14,
        content: '  const step3a = \'cleanup\';',
        type: 'added'
      });
    });

    it('should return empty array for empty diff', () => {
      // Arrange
      const diff = '';

      // Act
      const result = parseDiffLines(diff);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle diff without changes', () => {
      // Arrange
      const diff = `diff --git a/src/unchanged.ts b/src/unchanged.ts
index 1234567..1234567 100644
--- a/src/unchanged.ts
+++ b/src/unchanged.ts`;

      // Act
      const result = parseDiffLines(diff);

      // Assert
      expect(result).toEqual([]);
    });

    it('should ignore binary file diffs', () => {
      // Arrange
      const diff = `diff --git a/image.png b/image.png
index 1234567..abcdefg 100644
Binary files a/image.png and b/image.png differ`;

      // Act
      const result = parseDiffLines(diff);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle malformed diff gracefully', () => {
      // Arrange
      const diff = `not a valid diff format
random text
+some added line without proper context`;

      // Act
      const result = parseDiffLines(diff);

      // Assert
      // The parser will still process lines starting with '+' even without proper context
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: '',
        lineNumber: 2,
        content: 'some added line without proper context',
        type: 'added'
      });
    });

    it('should correctly track line numbers across context lines', () => {
      // Arrange
      const diff = `diff --git a/src/tracking.ts b/src/tracking.ts
index 1234567..abcdefg 100644
--- a/src/tracking.ts
+++ b/src/tracking.ts
@@ -5,8 +5,10 @@ function trackLines() {
   const line5 = 'context';
   const line6 = 'context';
   const line7 = 'context';
+  const line7a = 'added';
   const line8 = 'context';
   const line9 = 'context';
+  const line9a = 'added';
   const line10 = 'context';
 }`;

      // Act
      const result = parseDiffLines(diff);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        path: 'src/tracking.ts',
        lineNumber: 8,
        content: '  const line7a = \'added\';',
        type: 'added'
      });
      expect(result[1]).toEqual({
        path: 'src/tracking.ts',
        lineNumber: 11,
        content: '  const line9a = \'added\';',
        type: 'added'
      });
    });

    it('should handle file renames correctly', () => {
      // Arrange
      const diff = `diff --git a/src/old-name.ts b/src/new-name.ts
similarity index 85%
rename from src/old-name.ts
rename to src/new-name.ts
index 1234567..abcdefg 100644
--- a/src/old-name.ts
+++ b/src/new-name.ts
@@ -1,3 +1,4 @@
 function renamed() {
+  console.log('renamed function');
   return 'renamed';
 }`;

      // Act
      const result = parseDiffLines(diff);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'src/new-name.ts',
        lineNumber: 2,
        content: '  console.log(\'renamed function\');',
        type: 'added'
      });
    });
  });
});