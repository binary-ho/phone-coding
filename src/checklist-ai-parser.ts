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
    // JSON 블록 추출
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      throw new Error('No JSON block found in AI response');
    }

    const result: ChecklistItemResult = JSON.parse(jsonMatch[1]);
    
    // 결과 검증
    if (!['completed', 'failed'].includes(result.status)) {
      throw new Error(`Invalid status: ${result.status}`);
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