import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { ChecklistConfig } from './checklist-types';
import { ChecklistPriority, ChecklistStatus, EnumUtils } from './enums';

export const loadChecklistConfig = (filePath: string): ChecklistConfig => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Checklist file not found: ${filePath}`);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const config = yaml.load(fileContent) as ChecklistConfig;
    
    validateChecklistConfig(config);
    
    // 초기 상태 및 기본값 설정
    config.checklist.items.forEach(item => {
      item.status = ChecklistStatus.PENDING;
      // priority가 없으면 기본값 'high' 설정
      if (!item.priority) {
        item.priority = ChecklistPriority.HIGH;
      }
    });
    
    return config;
  } catch (error) {
    throw new Error(`Failed to load checklist: ${error.message}`);
  }
};

const validateChecklistConfig = (config: ChecklistConfig): void => {
  if (!config.checklist) {
    throw new Error('Invalid checklist format: missing "checklist" root');
  }
  
  if (!config.checklist.name) {
    throw new Error('Invalid checklist format: missing "name"');
  }
  
  if (!Array.isArray(config.checklist.items)) {
    throw new Error('Invalid checklist format: "items" must be an array');
  }
  
  config.checklist.items.forEach((item, index) => {
    if (!item.id || !item.title || !item.description) {
      throw new Error(`Invalid item at index ${index}: missing required fields`);
    }
    
    // priority는 선택적 필드이므로 있을 때만 검증
    if (item.priority && !EnumUtils.isValidEnumValue(ChecklistPriority, item.priority)) {
      const validPriorities = EnumUtils.getEnumValues(ChecklistPriority).join(', ');
      throw new Error(`Invalid priority at index ${index}: ${item.priority}. Must be one of: ${validPriorities}`);
    }
  });
};