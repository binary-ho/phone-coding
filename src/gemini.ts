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
  // 백틱이 있는 코드 블록 제거 (```json ... ```)
  let cleaned = text.replace(/```[\w]*\n?([\s\S]*?)```/g, '$1');
  
  // 백틱 없이 언어만 있는 경우 제거 (json\n[...] 형태)
  cleaned = cleaned.replace(/^(json|javascript|typescript|ts|js)\s*\n/, '');
  return extractCompleteJson(cleaned).trim();
};

const extractCompleteJson = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) {
    return trimmed;
  }
  
  let braceCount = 0;
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) {
      continue;
    }
    
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        return trimmed.substring(0, i + 1);
      }
    }
  }
  
  return trimmed;
};