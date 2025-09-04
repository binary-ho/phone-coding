import { GoogleGenAI } from '@google/genai';

export const callGeminiApi = async (apiKey: string, prompt: string): Promise<string> => {
  try {
    const genAI = new GoogleGenAI({ apiKey });

    const result = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
    });

    const text = result.text;

    if (text === undefined) {
        throw new Error("No text response from Gemini API");
    }

    return text;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error calling Gemini API:', error.message);
    } else {
      console.error('An unknown error occurred while calling the Gemini API');
    }
    throw error;
  }
};
