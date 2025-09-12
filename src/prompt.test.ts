import { buildSummarizePrompt } from './prompt';

describe('buildPrompt', () => {
  it('should create a review prompt', () => {
    const prompt = buildSummarizePrompt('Test Title', 'Test Body', 'Test Diff');
    expect(prompt).toContain('Summarize the given code changes clearly and concisely in korean');
    expect(prompt).toContain('Test Title');
    expect(prompt).toContain('Test Diff');
  });

  it('should create a summarize prompt', () => {
    const prompt = buildSummarizePrompt('Test Title', 'Test Body', 'Test Diff');
    expect(prompt).toContain('Summarize the given code changes clearly and concisely in korean');
    expect(prompt).toContain('Test Title');
    expect(prompt).toContain('Test Diff');
  });
});
