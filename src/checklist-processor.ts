import * as core from '@actions/core';
import { ChecklistConfig, ChecklistItem, ChecklistProcessingContext } from './checklist-types';
import { loadChecklistConfig } from './checklist-parser';
import { buildChecklistItemPrompt } from './prompt';
import { callGeminiApi } from './gemini';
import { parseChecklistItemResponse } from './checklist-ai-parser';
import { ChecklistStatus } from './enums';

export class ChecklistProcessor {
  private config: ChecklistConfig | null = null;

  async loadChecklist(filePath: string): Promise<ChecklistConfig> {
    this.config = loadChecklistConfig(filePath);
    core.info(`Loaded checklist: ${this.config.checklist.name} with ${this.config.checklist.items.length} items`);
    return this.config;
  }

  async processItem(
    item: ChecklistItem,
    context: ChecklistProcessingContext
  ): Promise<ChecklistItem> {
    try {
      core.info(`Processing checklist item: ${item.id} - ${item.title}`);
      
      // 상태를 처리중으로 변경
      item.status = ChecklistStatus.PROCESSING;
      
      // AI 프롬프트 생성
      const prompt = buildChecklistItemPrompt(
        item,
        context.prTitle,
        context.prBody,
        context.diff
      );
      
      core.info(`Generated prompt for item ${item.id}`);
      
      // AI 호출
      const aiResponse = await callGeminiApi(context.geminiApiKey, prompt);
      core.info(`Received AI response for item ${item.id}`);
      
      // 응답 파싱 및 결과 반환
      const processedItem = parseChecklistItemResponse(aiResponse, item);
      core.info(`Processed item ${item.id} with status: ${processedItem.status}`);
      
      return processedItem;
    } catch (error) {
      core.error(`Failed to process checklist item ${item.id}: ${error.message}`);
      return {
        ...item,
        status: ChecklistStatus.FAILED,
        evidence: `처리 중 오류 발생: ${error.message}`,
        codeExamples: [],
        reasoning: '시스템 오류로 인해 검증을 완료할 수 없습니다.'
      };
    }
  }

  generateChecklistComment(items: ChecklistItem[]): string {
    const header = '## 📋 체크리스트 검증 결과\n\n';
    
    const itemsContent = items.map((item, index) => {
      const number = index + 1;
      const statusIcon = this.getStatusIcon(item.status);
      const title = `${number}. ${item.title} ${statusIcon}`;
      
      if (item.status === ChecklistStatus.PENDING) {
        return title;
      }
      
      if (item.status === ChecklistStatus.PROCESSING) {
        return `${title}`;
      }
      
      // completed 또는 failed 상태
      const evidenceSection = item.evidence ? 
        `<details>\n    <summary>근거: ${item.evidence}</summary>\n    \n    ${item.reasoning}\n    ${this.formatCodeExamples(item.codeExamples)}\n</details>\n` : '';
      
      return `${title}\n${evidenceSection}`;
    }).join('\n');
    
    return header + itemsContent;
  }

  private getStatusIcon(status: ChecklistStatus): string {
    switch (status) {
      case ChecklistStatus.COMPLETED: return '✅';
      case ChecklistStatus.FAILED: return '❌';
      case ChecklistStatus.PROCESSING: return '(⏳ 처리 중...)';
      case ChecklistStatus.PENDING: return '(⏳ 대기 중...)';
      default: return '❓';
    }
  }

  private formatCodeExamples(codeExamples: string[]): string {
    if (!codeExamples || codeExamples.length === 0) {
      return '';
    }
    
    return codeExamples.map(example => 
      `    \`\`\`typescript\n    ${example}\n    \`\`\``
    ).join('\n    \n');
  }

  getItems(): ChecklistItem[] {
    return this.config?.checklist.items || [];
  }

  updateItem(updatedItem: ChecklistItem): void {
    if (!this.config) return;
    
    const index = this.config.checklist.items.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
      this.config.checklist.items[index] = updatedItem;
    }
  }
}