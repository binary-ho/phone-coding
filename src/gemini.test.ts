import { callGeminiApi } from './gemini';
import { GoogleGenAI } from '@google/genai';

// Mock the @google/genai library
jest.mock('@google/genai', () => {
    const mockGenerateContent = jest.fn();
    return {
        GoogleGenAI: jest.fn().mockImplementation(() => ({
            getGenerativeModel: jest.fn().mockReturnValue({
                generateContent: mockGenerateContent,
            }),
            // This is to support the actual implementation which uses a different path
            models: {
                generateContent: mockGenerateContent,
            }
        })),
    };
});

// Get a reference to the mock function
const mockGenerateContent = new (GoogleGenAI as any)().models.generateContent;

describe('gemini', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return text from Gemini API on successful call', async () => {
    // Arrange
    const apiKey = 'test-api-key';
    const prompt = 'test-prompt';
    const expectedResponse = 'Test response from Gemini';
    mockGenerateContent.mockResolvedValue({ text: expectedResponse });

    // Act
    const response = await callGeminiApi(apiKey, prompt);

    // Assert
    expect(response).toBe(expectedResponse);
    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey });
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
  });

  it('should throw an error if the API response has no text', async () => {
    // Arrange
    mockGenerateContent.mockResolvedValue({ text: undefined });

    // Act & Assert
    await expect(callGeminiApi('key', 'prompt')).rejects.toThrow(
      'No text response from Gemini API'
    );
  });

  it('should re-throw an error if the API call fails', async () => {
    // Arrange
    const apiError = new Error('API Failure');
    mockGenerateContent.mockRejectedValue(apiError);

    // Act & Assert
    await expect(callGeminiApi('key', 'prompt')).rejects.toThrow(apiError);
  });
});
