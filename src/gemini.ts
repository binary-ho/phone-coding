import { GoogleGenAI } from '@google/genai';

export const callGeminiApi = async (apiKey: string, prompt: string): Promise<string> => {
  try {
    const genAI = new GoogleGenAI({ apiKey });

    const generateContentResponse = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
    });

    const responseText = generateContentResponse.text;
    validateContentNotEmpty(responseText);
    return removeCodeBlocks(responseText);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error calling Gemini API:', error.message);
    } else {
      console.error('An unknown error occurred while calling the Gemini API');
    }
    throw error;
  }
};

const validateContentNotEmpty = (responseText: string) => {
  if (responseText === undefined || responseText === null || responseText.trim() === '') {
    throw new Error("No text response from Gemini API");
  }
}

const removeCodeBlocks = (text: string): string => {
  return text.replace(/```[\w]*\n?([\s\S]*?)```/g, '$1').trim();
};