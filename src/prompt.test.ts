import { buildPrompt } from './prompt';

describe('buildPrompt', () => {
  it('should create a review prompt', () => {
    const prompt = buildPrompt('Test Title', 'Test Body', 'Test Diff', 'review');
    expect(prompt).toContain('Please review the following pull request.');
    expect(prompt).toContain('Test Title');
    expect(prompt).toContain('Test Body');
    expect(prompt).toContain('Test Diff');
  });

  it('should create a summarize prompt', () => {
    const prompt = buildPrompt('Test Title', 'Test Body', 'Test Diff', 'summarize');
    expect(prompt).toContain('Please provide a summary of the following pull request.');
    expect(prompt).toContain('Test Title');
    expect(prompt).toContain('Test Body');
    expect(prompt).toContain('Test Diff');
  });
});
