import { ChecklistPriority, ChecklistStatus } from './enums';

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  priority?: ChecklistPriority;
  status: ChecklistStatus;
  evidence?: string;
  codeExamples?: string[];
  reasoning?: string;
}

export interface ChecklistConfig {
  checklist: {
    name: string;
    items: ChecklistItem[];
  };
}

export interface ChecklistProcessingContext {
  prTitle: string;
  prBody: string;
  diff: string;
  geminiApiKey: string;
}