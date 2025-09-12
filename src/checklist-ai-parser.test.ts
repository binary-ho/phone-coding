import { parseChecklistItemResponse } from './checklist-ai-parser';
import { ChecklistItem } from './checklist-types';
import { ChecklistPriority, ChecklistStatus } from './enums';

describe('ChecklistAiParser', () => {
  const mockItem: ChecklistItem = {
    id: 'readability',
    title: '코드가 가독성이 좋습니다.',
    description: '코드가 명확하고 이해하기 쉬운지 확인',
    priority: ChecklistPriority.MEDIUM,
    status: ChecklistStatus.PENDING
  };

  describe('Simple text responses (expected format)', () => {
    test('should parse "통과" response correctly', () => {
      const aiResponse = '통과';
      const result = parseChecklistItemResponse(aiResponse, mockItem);
      
      expect(result.status).toBe(ChecklistStatus.COMPLETED);
      expect(result.evidence).toBe('체크리스트 항목을 만족합니다');
      expect(result.reasoning).toBe('AI 응답: 통과');
    });

    test('should parse "불통과" response correctly', () => {
      const aiResponse = '불통과';
      const result = parseChecklistItemResponse(aiResponse, mockItem);
      
      expect(result.status).toBe(ChecklistStatus.FAILED);
      expect(result.evidence).toBe('체크리스트 항목을 만족하지 않습니다');
      expect(result.reasoning).toBe('AI 응답: 불통과');
    });

    test('should parse "판단어려움" response correctly', () => {
      const aiResponse = '판단어려움';
      const result = parseChecklistItemResponse(aiResponse, mockItem);
      
      expect(result.status).toBe(ChecklistStatus.UNCERTAIN);
      expect(result.evidence).toBe('주어진 변경사항만으로는 판단하기 어렵습니다');
      expect(result.reasoning).toBe('AI 응답: 판단어려움');
    });
  });

  describe('Complex AI responses (actual problematic responses)', () => {
    test('should handle complex readability response', () => {
      const actualAiResponse = `## 코드 품질 검증 결과

제목: 코드가 가독성이 좋습니다.
설명: 코드가 명확하고 이해하기 쉬운지 확인
우선순위: medium

검증 결과:

PR에 포함된 코드 변경 사항들을 검토한 결과, 다음 사항들을 고려하여 해당 항목을 판단할 수 있습니다.

일관성: 전체적으로 코드 스타일이 일관적인지 확인합니다. 들여쓰기, 명명 규칙, 주석 스타일 등이 프로젝트 전반에 걸쳐 일관성을 유지하는지 검토합니다.
명확성: 변수, 함수, 클래스 등의 이름이 의미 있고 명확하게 사용되었는지 확인합니다. 코드를 처음 보는 개발자도 쉽게 이해할 수 있도록 명확한 이름을 사용하는 것이 중요합니다.
간결성: 불필요한 코드나 중복된 로직이 없는지 확인합니다. 코드를 간결하게 유지하면 가독성을 높이고 유지보수를 용이하게 할 수 있습니다.
주석: 필요한 부분에 적절한 주석이 추가되었는지 확인합니다. 주석은 코드의 의도를 설명하고 복잡한 로직을 이해하는 데 도움을 줍니다.

종합 의견:

코드 변경 사항들을 검토한 결과, 전반적으로 코드 가독성을 향상시키기 위한 노력이 엿보입니다. 하지만 몇 가지 개선할 부분들이 존재합니다.

새로 추가된 파일(checklist-ai-parser.ts, checklist-parser.ts, checklist-processor.ts, checklist-types.ts, enums.ts, prompts/checklist-item-verification.md)에 대한 설명을 추가합니다.
로직이 복잡한 부분에는 추가적인 주석을 달아 코드의 의도를 명확히 합니다.

최종 판단:

코드 변경 사항에 대한 가독성 검증 결과, 몇 가지 개선 사항을 고려하여 개선 필요 로 판단합니다.`;

      const result = parseChecklistItemResponse(actualAiResponse, mockItem);
      
      console.log('Complex readability response result:', {
        status: result.status,
        evidence: result.evidence,
        reasoning: result.reasoning.substring(0, 100) + '...'
      });
      
      // Should now be parsed as FAILED due to "개선 필요" keyword
      expect(result.status).toBe(ChecklistStatus.FAILED);
      expect(result.evidence).toBe('체크리스트 항목을 만족하지 않습니다');
    });

    test('should handle complex maintainability response', () => {
      const actualAiResponse = `## 코드 품질 검증 결과

제목: 변경 용이성이 높습니다.

설명: PR 정보와 코드 변경사항을 기반으로 코드의 결합도와 응집도를 분석하여 변경 용이성을 평가합니다.

결과:

검토 결과, 이 PR은 합격입니다.

근거:

낮은 결합도: 코드 변경 사항은 주로 새로운 기능(checklist)을 추가하는 데 집중되어 있으며, 기존 코드와의 의존성이 낮습니다.
높은 응집도: 각 파일은 특정 기능 또는 역할을 수행하도록 설계되었으며, 관련된 코드들이 하나의 모듈 안에 잘 묶여 있습니다.

이러한 특징들은 코드의 변경이 필요한 경우, 해당 모듈만 수정하면 되므로 전체 시스템에 미치는 영향을 최소화할 수 있습니다. 따라서 코드의 변경 용이성이 높다고 판단할 수 있습니다.`;

      const result = parseChecklistItemResponse(actualAiResponse, mockItem);
      
      console.log('Complex maintainability response result:', {
        status: result.status,
        evidence: result.evidence,
        reasoning: result.reasoning.substring(0, 100) + '...'
      });
      
      // Should now be parsed as COMPLETED due to "합격" keyword
      expect(result.status).toBe(ChecklistStatus.COMPLETED);
      expect(result.evidence).toBe('체크리스트 항목을 만족합니다');
    });
  });

  describe('Edge cases', () => {
    test('should handle response with keywords in context', () => {
      const aiResponse = '이 코드는 통과 기준을 만족하지 않습니다. 불통과입니다.';
      const result = parseChecklistItemResponse(aiResponse, mockItem);
      
      // Should match "불통과" even when "통과" also appears
      expect(result.status).toBe(ChecklistStatus.FAILED);
    });

    test('should handle empty response', () => {
      const aiResponse = '';
      const result = parseChecklistItemResponse(aiResponse, mockItem);
      
      expect(result.status).toBe(ChecklistStatus.UNCERTAIN);
      expect(result.evidence).toBe('응답 형식을 인식할 수 없어 판단이 어렵습니다');
    });

    test('should handle response with extra whitespace', () => {
      const aiResponse = '   통과   ';
      const result = parseChecklistItemResponse(aiResponse, mockItem);
      
      expect(result.status).toBe(ChecklistStatus.COMPLETED);
    });
  });

  describe('JSON responses (if AI provides them)', () => {
    test('should parse valid JSON response', () => {
      const jsonResponse = `
Here is my analysis:

\`\`\`json
{
  "status": "completed",
  "evidence": "Test evidence",
  "codeExamples": ["example code"],
  "reasoning": "Test reasoning"
}
\`\`\`
`;
      
      const result = parseChecklistItemResponse(jsonResponse, mockItem);
      
      expect(result.status).toBe(ChecklistStatus.COMPLETED);
      expect(result.evidence).toBe('Test evidence');
      expect(result.codeExamples).toEqual(['example code']);
      expect(result.reasoning).toBe('Test reasoning');
    });

    test('should handle invalid JSON gracefully', () => {
      const invalidJsonResponse = `
\`\`\`json
{
  "status": "invalid_status",
  "evidence": "Test evidence"
}
\`\`\`
`;
      
      const result = parseChecklistItemResponse(invalidJsonResponse, mockItem);
      
      expect(result.status).toBe(ChecklistStatus.FAILED);
      expect(result.evidence).toContain('AI 응답 파싱 실패');
    });
  });
});