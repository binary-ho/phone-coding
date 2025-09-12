import { GoogleGenAI } from '@google/genai';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableError = (error: any): boolean => {
  const errorMessage = error?.message || '';
  const errorString = JSON.stringify(error);
  
  // 503 Service Unavailable, 429 Too Many Requests, 또는 overloaded 메시지
  return errorString.includes('"code":503') || 
         errorString.includes('"code":429') ||
         errorMessage.includes('overloaded') ||
         errorMessage.includes('unavailable');
};

export const callGeminiApi = async (apiKey: string, prompt: string): Promise<string> => {
  const maxRetries = 3;
  const baseDelay = 2000; // 2초
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Gemini API call attempt ${attempt}/${maxRetries} failed:`, errorMessage);
      
      // 재시도 가능한 에러이고 아직 재시도 횟수가 남았다면
      if (isRetryableError(error) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // 지수 백오프: 2초, 4초, 8초
        console.log(`Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }
      
      // 최종 실패 또는 재시도 불가능한 에러
      throw error;
    }
  }
  
  throw new Error('All retry attempts failed');
};
