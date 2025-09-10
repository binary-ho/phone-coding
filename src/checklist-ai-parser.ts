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

// 단순한 텍스트 분석: "통과", "불통과", "판단어려움" 문자열 매칭
const parseTextResponse = (aiResponse: string, item: ChecklistItem): ChecklistItem => {
  core.info(`[DEBUG] Parsing simple text response for item ${item.id}`);
  
  const responseText = aiResponse.trim();
  
  // 단순한 문자열 매칭 (3가지 상태)
  let status: ChecklistStatus;
  let evidence: string;
  
  if (responseText.includes('통과')) {
    status = ChecklistStatus.COMPLETED;
    evidence = '체크리스트 항목을 만족합니다';
  } else if (responseText.includes('불통과')) {
    status = ChecklistStatus.FAILED;
    evidence = '체크리스트 항목을 만족하지 않습니다';
  } else if (responseText.includes('판단어려움')) {
    status = ChecklistStatus.UNCERTAIN;
    evidence = '주어진 변경사항만으로는 판단하기 어렵습니다';
  } else {
    // 예상된 응답이 없는 경우 불확실로 처리
    status = ChecklistStatus.UNCERTAIN;
    evidence = '응답 형식을 인식할 수 없어 판단이 어렵습니다';
  }
  
  const reasoning = `AI 응답: ${responseText}`;
  
  core.info(`[DEBUG] Simple text analysis result for ${item.id}: ${status}`);
  
  return {
    ...item,
    status,
    evidence,
    codeExamples: [],
    reasoning
  };
};