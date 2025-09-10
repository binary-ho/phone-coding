import * as core from '@actions/core';
import { ChecklistItem } from './checklist-types';
import { ChecklistStatus } from './enums';

export interface ChecklistItemResult {
  status: 'completed' | 'failed';
  evidence: string;
  codeExamples: string[];
  reasoning: string;
}

export const parseChecklistItemResponse = (
  aiResponse: string,
  item: ChecklistItem
): ChecklistItem => {
  try {
    let jsonString = '';
    
    // 방법 1: ```json``` 코드 블록에서 추출
    const jsonBlockMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonString = jsonBlockMatch[1].trim();
    } else {
      // 방법 2: 일반 코드 블록에서 추출
      const codeBlockMatch = aiResponse.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        const blockContent = codeBlockMatch[1].trim();
        // JSON 형태인지 확인
        if (blockContent.startsWith('{') && blockContent.endsWith('}')) {
          jsonString = blockContent;
        }
      }
    }
    
    // 방법 3: 중괄호로 둘러싸인 JSON 직접 추출
    if (!jsonString) {
      const jsonDirectMatch = aiResponse.match(/\{[\s\S]*?\}/);
      if (jsonDirectMatch) {
        jsonString = jsonDirectMatch[0];
      }
    }
    
    // 방법 4: 여러 줄에 걸친 JSON 추출
    if (!jsonString) {
      const multilineJsonMatch = aiResponse.match(/\{[\s\S]*?"status"[\s\S]*?"evidence"[\s\S]*?\}/);
      if (multilineJsonMatch) {
        jsonString = multilineJsonMatch[0];
      }
    }

    if (!jsonString) {
      // Fallback: AI가 JSON 형식으로 응답하지 않은 경우 텍스트 분석 시도
      core.info(`[DEBUG] No JSON found, attempting text analysis for item ${item.id}`);
      return parseTextResponse(aiResponse, item);
    }

    // Clean control characters that can break JSON parsing while preserving structure
    const cleanedJsonString = jsonString
      .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters but keep normal whitespace
    
    const result: ChecklistItemResult = JSON.parse(cleanedJsonString);
    
    // 결과 검증
    if (!result.status || !['completed', 'failed'].includes(result.status)) {
      throw new Error(`Invalid or missing status: ${result.status}`);
    }

    // 필수 필드 검증
    if (!result.evidence) {
      result.evidence = '검증 근거가 제공되지 않았습니다.';
    }
    if (!result.reasoning) {
      result.reasoning = '상세한 판단 근거가 제공되지 않았습니다.';
    }

    // ChecklistItem 업데이트
    return {
      ...item,
      status: result.status === 'completed' ? ChecklistStatus.COMPLETED : ChecklistStatus.FAILED,
      evidence: result.evidence,
      codeExamples: result.codeExamples || [],
      reasoning: result.reasoning
    };
  } catch (error) {
    // 파싱 실패 시 실패 상태로 설정
    return {
      ...item,
      status: ChecklistStatus.FAILED,
      evidence: `AI 응답 파싱 실패: ${error.message}`,
      codeExamples: [],
      reasoning: '응답 형식이 올바르지 않습니다.'
    };
  }
};

// Fallback 함수: JSON이 없을 때 텍스트 분석으로 결과 추출
const parseTextResponse = (aiResponse: string, item: ChecklistItem): ChecklistItem => {
  core.info(`[DEBUG] Parsing text response for item ${item.id}`);
  
  const responseText = aiResponse.toLowerCase();
  
  // 긍정적 키워드 검색
  const positiveKeywords = [
    '통과', '성공', '완료', '충족', '만족', '적절', '올바른', '좋은', '우수한',
    'pass', 'success', 'complete', 'good', 'excellent', 'proper', 'correct',
    '✅', '성공적', '문제없', '괜찮', '적합'
  ];
  
  // 부정적 키워드 검색
  const negativeKeywords = [
    '실패', '문제', '부족', '미흡', '개선', '수정', '오류', '에러', '취약',
    'fail', 'error', 'issue', 'problem', 'improve', 'fix', 'wrong', 'bad',
    '❌', '문제가', '부적절', '잘못', '누락'
  ];
  
  const hasPositive = positiveKeywords.some(keyword => responseText.includes(keyword));
  const hasNegative = negativeKeywords.some(keyword => responseText.includes(keyword));
  
  // 상태 결정 로직
  let status: ChecklistStatus;
  if (hasPositive && !hasNegative) {
    status = ChecklistStatus.COMPLETED;
  } else if (hasNegative) {
    status = ChecklistStatus.FAILED;
  } else {
    // 애매한 경우 응답 길이로 판단
    status = aiResponse.length > 100 ? ChecklistStatus.FAILED : ChecklistStatus.COMPLETED;
  }
  
  // 응답에서 의미있는 부분 추출
  const sentences = aiResponse.split(/[.!?]\s+/).filter(s => s.trim().length > 10);
  const evidence = sentences.length > 0 ? sentences[0].trim() : '텍스트 분석을 통한 자동 판단';
  const reasoning = sentences.length > 1 ? sentences.slice(1, 3).join(' ') : '상세한 분석 결과가 제공되지 않았습니다.';
  
  core.info(`[DEBUG] Text analysis result for ${item.id}: ${status}, evidence: ${evidence.substring(0, 50)}...`);
  
  return {
    ...item,
    status,
    evidence,
    codeExamples: [],
    reasoning
  };
};