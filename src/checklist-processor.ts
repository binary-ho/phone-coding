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
      core.info(`[DEBUG] AI Response for ${item.id}: ${aiResponse}`);
      
      // 응답 파싱 및 결과 반환
      const processedItem = parseChecklistItemResponse(aiResponse, item);
      core.info(`Processed item ${item.id} with status: ${processedItem.status}`);
      
      return processedItem;
    } catch (error) {
      core.error(`Failed to process checklist item ${item.id}: ${error.message}`);
      const errorInfo = this.classifyError(error);
      return {
        ...item,
        status: ChecklistStatus.FAILED,
        evidence: errorInfo.userMessage,
        codeExamples: [],
        reasoning: errorInfo.technicalDetails
      };
    }
  }

  generateChecklistComment(items: ChecklistItem[]): string {
    // 진행률 계산
    const totalItems = items.length;
    const completedItems = items.filter(item => 
      item.status === ChecklistStatus.COMPLETED || 
      item.status === ChecklistStatus.FAILED || 
      item.status === ChecklistStatus.UNCERTAIN
    ).length;
    const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    // 상태별 개수 계산
    const statusCounts = {
      completed: items.filter(item => item.status === ChecklistStatus.COMPLETED).length,
      failed: items.filter(item => item.status === ChecklistStatus.FAILED).length,
      uncertain: items.filter(item => item.status === ChecklistStatus.UNCERTAIN).length,
      processing: items.filter(item => item.status === ChecklistStatus.PROCESSING).length,
      pending: items.filter(item => item.status === ChecklistStatus.PENDING).length
    };
    
    // 진행률 바 생성
    const progressBar = this.generateProgressBar(progressPercentage);
    
    // 헤더 및 요약 정보
    const header = `## 📋 체크리스트 검증 결과\n\n`;
    const progressSection = `### 📊 진행 현황\n${progressBar} **${progressPercentage}%** (${completedItems}/${totalItems})\n\n`;
    
    // 요약 테이블
    const summaryTable = `| 상태 | 개수 | 비율 |\n|------|------|------|\n` +
      `| ✅ 통과 | ${statusCounts.completed} | ${totalItems > 0 ? Math.round((statusCounts.completed / totalItems) * 100) : 0}% |\n` +
      `| ❌ 불통과 | ${statusCounts.failed} | ${totalItems > 0 ? Math.round((statusCounts.failed / totalItems) * 100) : 0}% |\n` +
      `| ❓ 판단어려움 | ${statusCounts.uncertain} | ${totalItems > 0 ? Math.round((statusCounts.uncertain / totalItems) * 100) : 0}% |\n` +
      `| ⏳ 처리중/대기 | ${statusCounts.processing + statusCounts.pending} | ${totalItems > 0 ? Math.round(((statusCounts.processing + statusCounts.pending) / totalItems) * 100) : 0}% |\n\n`;
    
    // 개별 항목들
    const itemsSection = `### 📝 상세 결과\n\n`;
    const itemsContent = items.map((item, index) => {
      const number = index + 1;
      const statusIcon = this.getStatusIcon(item.status);
      const priorityBadge = this.getPriorityBadge(item.priority);
      const title = `**${number}. ${item.title}** ${statusIcon} ${priorityBadge}`;
      
      if (item.status === ChecklistStatus.PENDING) {
        return title;
      }
      
      if (item.status === ChecklistStatus.PROCESSING) {
        return `${title}`;
      }
      
      // completed, failed, uncertain 상태 - 깔끔한 형식으로 개선
      if (item.evidence) {
        const evidenceSection = `<details>\n<summary>분석 결과</summary>\n\n**근거:** ${item.evidence}\n\n**상세 분석:**\n${item.reasoning}\n${this.formatCodeExamples(item.codeExamples)}\n</details>`;
        return `${title}\n${evidenceSection}\n`;
      }
      
      return title;
    }).join('\n');
    
    return header + progressSection + summaryTable + itemsSection + itemsContent;
  }

  private getStatusIcon(status: ChecklistStatus): string {
    switch (status) {
      case ChecklistStatus.COMPLETED: return '✅';
      case ChecklistStatus.FAILED: return '❌';
      case ChecklistStatus.UNCERTAIN: return '❓';
      case ChecklistStatus.PROCESSING: return '(⏳ 처리 중...)';
      case ChecklistStatus.PENDING: return '(⏳ 대기 중...)';
      default: return '❓';
    }
  }

  private formatCodeExamples(codeExamples: string[]): string {
    if (!codeExamples || codeExamples.length === 0) {
      return '';
    }
    
    return '\n\n**코드 예시:**\n' + codeExamples.map((example) =>
      `\`\`\`typescript\n${example.trim()}\n\`\`\``
    ).join('\n\n');
  }

  private generateProgressBar(percentage: number): string {
    const totalBars = 20;
    const filledBars = Math.round((percentage / 100) * totalBars);
    const emptyBars = totalBars - filledBars;
    
    const filled = '█'.repeat(filledBars);
    const empty = '░'.repeat(emptyBars);
    
    return `\`${filled}${empty}\``;
  }

  private getPriorityBadge(priority?: string): string {
    if (!priority) return '';
    
    switch (priority.toLowerCase()) {
      case 'critical': return '🔴 **CRITICAL**';
      case 'high': return '🟠 **HIGH**';
      case 'medium': return '🟡 **MEDIUM**';
      case 'low': return '🟢 **LOW**';
      default: return `🔵 **${priority.toUpperCase()}**`;
    }
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

  private classifyError(error: any): { userMessage: string; technicalDetails: string } {
    const errorMessage = error?.message || '';
    const errorString = JSON.stringify(error);
    
    // API 과부하 에러 (503, 429, overloaded)
    if (errorString.includes('"code":503') || 
        errorString.includes('"code":429') ||
        errorMessage.includes('overloaded') ||
        errorMessage.includes('unavailable')) {
      return {
        userMessage: 'AI 서비스가 일시적으로 과부하 상태입니다',
        technicalDetails: '잠시 후 다시 시도해주세요. 현재 Google Gemini API 서버가 과부하 상태입니다. 보통 10-30분 후에 정상화됩니다.'
      };
    }
    
    // API 키 관련 에러
    if (errorMessage.includes('API key') || 
        errorMessage.includes('authentication') ||
        errorString.includes('"code":401')) {
      return {
        userMessage: 'API 인증에 문제가 있습니다',
        technicalDetails: 'Gemini API 키를 확인해주세요. API 키가 올바르지 않거나 만료되었을 수 있습니다.'
      };
    }
    
    // 네트워크 관련 에러
    if (errorMessage.includes('network') || 
        errorMessage.includes('timeout') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ENOTFOUND')) {
      return {
        userMessage: '네트워크 연결에 문제가 있습니다',
        technicalDetails: '인터넷 연결을 확인하거나 잠시 후 다시 시도해주세요.'
      };
    }
    
    // 할당량 초과 에러
    if (errorMessage.includes('quota') || 
        errorMessage.includes('limit') ||
        errorString.includes('"code":429')) {
      return {
        userMessage: 'API 사용량 한도를 초과했습니다',
        technicalDetails: 'Gemini API의 일일 또는 시간당 사용량 한도를 초과했습니다. 시간을 두고 다시 시도해주세요.'
      };
    }
    
    // JSON 파싱 에러
    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      return {
        userMessage: 'AI 응답 처리 중 오류가 발생했습니다',
        technicalDetails: 'AI가 예상과 다른 형식으로 응답했습니다. 다시 시도하면 정상 처리될 수 있습니다.'
      };
    }
    
    // 기타 일반적인 에러
    return {
      userMessage: '처리 중 예상치 못한 오류가 발생했습니다',
      technicalDetails: `시스템 오류: ${errorMessage}. 문제가 지속되면 GitHub Issue로 신고해주세요.`
    };
  }
}