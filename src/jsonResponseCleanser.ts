
export const cleanJsonResponseByStatic = (rawResponse: string): string => {
    // 1. 코드 블록 제거
    const withoutCodeBlocks = removeCodeBlocks(rawResponse);

    // 2. 우선순위 태그 제거
    const withoutPriorityTags = removePriorityTag(withoutCodeBlocks);

    // 3. JSON 문자열 내부 특수문자 이스케이프
    const escapedJson = escapeJsonStringContent(withoutPriorityTags);

    // 4. JSON 추출
    const completeJson = extractCompleteJson(escapedJson);
    return completeJson.trim();
}

const removePriorityTag = (comment: string): string => {
    return comment.trim()
        // 맨 끝 (PRIORITY) 형태
        .replace(/\s*\([A-Z_]+PRIORITY\)\s*$/, '')
        // 맨 끝 `PRIORITY` 형태 (백틱)
        .replace(/\s*`[A-Z_]+PRIORITY`\s*$/, '')
        // 맨 앞 이모지 + PRIORITY 형태 (🟡 MEDIUM_PRIORITY)
        .replace(/^[\u{1F300}-\u{1F9FF}]?\s*[A-Z_]+PRIORITY\s*/u, '')
        // 맨 앞 파일명:라인번호: 형태 (이미 regex로 분리되었지만 혹시 모를 케이스)
        .replace(/^[^:]+:\d+:\s*/, '')
        .trim();
}

export const removeCodeBlocks = (text: string): string => {
    const removedCodeBlock = text.replace(/```[\w]*\n?([\s\S]*?)```/g, '$1');

    // 백틱 없이 언어만 있는 경우 제거 (json\n[...] 형태)
    const cleanedLanguage = removedCodeBlock.replace(/^(json|javascript|typescript|ts|js)\s*\n/, '');
    return extractCompleteJson(cleanedLanguage).trim();
};

const extractCompleteJson = (text: string): string => {
    const trimmed = text.trim();
    if (!trimmed.startsWith('{')) {
        return trimmed;
    }

    let braceCount = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < trimmed.length; i++) {
        const char = trimmed[i];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === '\\') {
            escaped = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (inString) {
            continue;
        }

        if (char === '{') {
            braceCount++;
        } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
                return trimmed.substring(0, i + 1);
            }
        }
    }

    return trimmed;
};

export const escapeJsonStringContent = (jsonString: string): string => {
    // JSON 문자열 내부의 comment 필드에서 문제가 되는 패턴들을 수정
    let cleaned = jsonString;
    
    // 1. comment 필드 값을 추출하여 개별적으로 처리
    cleaned = cleaned.replace(
        /"comment":\s*"([^"]+?)"/g,
        (match, commentContent) => {
            // 개행 문자를 \\n으로 이스케이프
            let escapedContent = commentContent.replace(/\n/g, '\\n');
            
            // 백슬래시를 이중 백슬래시로 이스케이프 (기존 이스케이프된 것은 제외)
            escapedContent = escapedContent.replace(/\\(?![\\"])/g, '\\\\');
            
            // 잘못된 이스케이프 시퀀스 수정 (\g 등)
            escapedContent = escapedContent.replace(/\\g/g, '\\\\g');
            
            return `"comment": "${escapedContent}"`;
        }
    );
    
    return cleaned;
};

export const unescapeCommentContent = (comment: string): string => {
    // JSON 파싱 후 comment 내용에서 escape 문자들을 원래 형태로 되돌림
    let unescaped = comment;
    
    // 1. 이중 백슬래시를 단일 백슬래시로 되돌림
    unescaped = unescaped.replace(/\\\\/g, '\\');
    
    // 2. 개행 문자 이스케이프를 실제 개행으로 되돌림
    unescaped = unescaped.replace(/\\n/g, '\n');
    
    // 3. 탭 문자 이스케이프를 실제 탭으로 되돌림  
    unescaped = unescaped.replace(/\\t/g, '\t');
    
    // 4. 따옴표 이스케이프를 원래 형태로 되돌림
    unescaped = unescaped.replace(/\\"/g, '"');
    
    return unescaped;
};