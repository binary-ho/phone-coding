import { buildSummarizePrompt } from './prompt';

describe('buildPrompt', () => {
  it('should create a review prompt', () => {
    const prompt = buildSummarizePrompt('Test Title', 'Test Body', 'Test Diff');
    expect(prompt).toContain('Please review the following pull request.');
    expect(prompt).toContain('Test Title');
    expect(prompt).toContain('Test Body');
    expect(prompt).toContain('Test Diff');
  });

  it('should create a summarize prompt', () => {
    const prompt = buildSummarizePrompt('Test Title', 'Test Body', 'Test Diff');
    expect(prompt).toContain('Please provide a summary of the following pull request.');
    expect(prompt).toContain('Test Title');
    expect(prompt).toContain('Test Body');
    expect(prompt).toContain('Test Diff');
  });
});
