import { buildSummarizePrompt } from './prompt';

describe('buildPrompt', () => {
  it('should create a review prompt', () => {
    const prompt = buildSummarizePrompt('Test Title', 'Test Body', 'Test Diff');
    expect(prompt).toContain('Please summarize the changes clearly and concisely.');
    expect(prompt).toContain('Test Title');
    expect(prompt).toContain('Test Diff');
  });

  it('should create a summarize prompt', () => {
    const prompt = buildSummarizePrompt('Test Title', 'Test Body', 'Test Diff');
    expect(prompt).toContain('Please summarize the changes clearly and concisely.');
    expect(prompt).toContain('Test Title');
    expect(prompt).toContain('Test Diff');
  });
});
