import { GoogleGenAI } from '@google/genai';
import {buildResponseCleansingPrompt} from "./prompt";
import {cleanJsonResponseByStatic, escapeJsonStringContent} from "./jsonResponseCleanser";

export const callGeminiApi = async (apiKey: string, prompt: string): Promise<string> => {
  try {
    const genAI = new GoogleGenAI({ apiKey });

    const generateContentResponse = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
    });

    const responseText = generateContentResponse.text;
    validateContentNotEmpty(responseText);
    return responseText;
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

export const cleanJsonAiResponse = async (apiKey: string, rawResponse: string): Promise<string> => {
  const cleanedByAI = await cleanByAiRequest(apiKey, rawResponse);
  return escapeJsonStringContent(cleanedByAI);
};

const cleanByAiRequest = async (apiKey: string, rawResponse: string): Promise<string> => {
  try {
    const cleaningPrompt = buildResponseCleansingPrompt(rawResponse);
    return await callGeminiApi(apiKey, cleaningPrompt);
  } catch (error) {
    // fallback to static cleansing
    console.error('Error in AI cleansing process. 정적 cleansing 적용:', error);
    return cleanJsonResponseByStatic(rawResponse);
  }
}