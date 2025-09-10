/**
 * Enums and types for the AI Code Reviewer project
 * This file centralizes all enum-like values for better type safety and maintainability
 */

/**
 * Action modes for the GitHub Action
 */
export enum ActionMode {
  REVIEW = 'review',
  SUMMARIZE = 'summarize'
}

/**
 * Diff sides for line comments
 */
export enum DiffSide {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

/**
 * GitHub review events
 */
export enum ReviewEvent {
  COMMENT = 'COMMENT',
  APPROVE = 'APPROVE',
  REQUEST_CHANGES = 'REQUEST_CHANGES'
}

/**
 * Checklist item priority levels
 */
export enum ChecklistPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Checklist item status values
 */
export enum ChecklistStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Comment tags for identifying bot comments
 */
export enum CommentTag {
  GEMINI_REVIEWER = '<!-- gemini-reviewer -->',
  GEMINI_LINE_REVIEWER = '<!-- gemini-line-reviewer -->',
  GEMINI_CHECKLIST_REVIEWER = '<!-- gemini-checklist-reviewer -->'
}

/**
 * Utility functions for enum validation
 */
export class EnumUtils {
  /**
   * Get all values from an enum
   */
  static getEnumValues<T extends Record<string, string>>(enumObject: T): string[] {
    return Object.values(enumObject);
  }

  /**
   * Check if a value is valid for a given enum
   */
  static isValidEnumValue<T extends Record<string, string>>(
    enumObject: T, 
    value: string
  ): value is T[keyof T] {
    return Object.values(enumObject).includes(value);
  }

  /**
   * Get enum value with fallback
   */
  static getEnumValueOrDefault<T extends Record<string, string>>(
    enumObject: T,
    value: string | undefined,
    defaultValue: T[keyof T]
  ): T[keyof T] {
    if (value && this.isValidEnumValue(enumObject, value)) {
      return value as T[keyof T];
    }
    return defaultValue;
  }
}