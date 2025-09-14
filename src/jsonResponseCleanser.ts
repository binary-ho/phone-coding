
export const cleanJsonResponseByStatic = (rawResponse: string): string => {
    // 1. 코드 블록 제거
    const withoutCodeBlocks = removeCodeBlocks(rawResponse);

    // 2. 우선순위 태그 제거
    const withoutPriorityTags = removePriorityTag(withoutCodeBlocks);

    // 3. JSON 추출
    const completeJson = extractCompleteJson(withoutPriorityTags);
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

const removeCodeBlocks = (text: string): string => {
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