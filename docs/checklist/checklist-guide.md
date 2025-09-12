# 체크리스트 작성 가이드

## 체크리스트 파일 형식

체크리스트는 YAML 형식으로 작성하며, 다음 구조를 따릅니다:

```yaml
checklist:
  name: "체크리스트 이름"
  items:
    - id: "고유-식별자"
      title: "체크리스트 항목 제목"
      description: "상세 설명"
      priority: "low|medium|high|critical"  # 선택적 필드 (기본값: "high")
```

## 필드 설명

### 필수 필드

- **`checklist.name`**: 체크리스트의 이름 (문자열)
- **`checklist.items`**: 체크리스트 항목들의 배열
- **`items[].id`**: 각 항목의 고유 식별자 (문자열, 영문/숫자/하이픈 권장)
- **`items[].title`**: 체크리스트 항목의 제목 (문자열)
- **`items[].description`**: 항목에 대한 상세 설명 (문자열)

### 선택적 필드

- **`items[].priority`**: 항목의 우선순위 (문자열, 기본값: "high")

## 우선순위 가이드

- **critical**: 보안, 데이터 손실 등 치명적 이슈
- **high**: 성능, 안정성에 큰 영향 (기본값)
- **medium**: 코드 품질, 유지보수성
- **low**: 스타일, 문서화 등

**참고**: priority 필드는 선택적입니다. 생략할 경우 자동으로 "high"가 적용됩니다.

## 예시 체크리스트

### 기본 예시

```yaml
checklist:
  name: "기본 코드 품질 체크리스트"
  items:
    - id: "null-safety"
      title: "Null 안전성이 보장됩니다"
      description: "모든 객체 접근에서 null 체크가 수행되는지 확인"
      # priority 생략 시 "high" 적용
      
    - id: "error-handling"
      title: "적절한 에러 처리가 구현되어 있습니다"
      description: "try-catch 블록과 에러 로깅이 적절히 구현되었는지 확인"
      priority: "critical"
```

### 보안 중심 체크리스트

```yaml
checklist:
  name: "보안 검증 체크리스트"
  items:
    - id: "input-validation"
      title: "입력 데이터 검증이 수행됩니다"
      description: "사용자 입력에 대한 적절한 검증과 sanitization이 구현되었는지 확인"
      priority: "critical"
      
    - id: "sql-injection"
      title: "SQL 인젝션 취약점이 없습니다"
      description: "파라미터화된 쿼리나 ORM을 사용하여 SQL 인젝션을 방지하는지 확인"
      priority: "critical"
      
    - id: "xss-prevention"
      title: "XSS 공격 방어가 구현되어 있습니다"
      description: "사용자 입력 출력 시 적절한 이스케이핑이 적용되었는지 확인"
      priority: "critical"
```

### 성능 중심 체크리스트

```yaml
checklist:
  name: "성능 최적화 체크리스트"
  items:
    - id: "memory-leaks"
      title: "메모리 누수가 방지되어 있습니다"
      description: "이벤트 리스너, 타이머, 구독 등의 정리가 적절히 구현되었는지 확인"
      priority: "high"
      
    - id: "database-optimization"
      title: "데이터베이스 쿼리가 최적화되어 있습니다"
      description: "N+1 쿼리 문제가 없고, 적절한 인덱스가 사용되는지 확인"
      priority: "medium"
      
    - id: "caching-strategy"
      title: "적절한 캐싱 전략이 적용되어 있습니다"
      description: "반복적인 연산이나 데이터 조회에 캐싱이 적용되었는지 확인"
      priority: "medium"
```

### TypeScript/JavaScript 전용 체크리스트

```yaml
checklist:
  name: "TypeScript 코드 품질 체크리스트"
  items:
    - id: "type-safety"
      title: "타입 안전성이 보장됩니다"
      description: "any 타입 사용을 피하고 적절한 타입 정의가 되어있는지 확인"
      priority: "high"
      
    - id: "async-handling"
      title: "비동기 처리가 올바르게 구현되어 있습니다"
      description: "Promise와 async/await가 적절히 사용되고 에러 처리가 포함되었는지 확인"
      priority: "high"
      
    - id: "eslint-compliance"
      title: "ESLint 규칙을 준수합니다"
      description: "프로젝트의 ESLint 설정을 위반하지 않는지 확인"
      priority: "medium"
```

## 작성 팁

### 1. 명확하고 구체적인 제목 작성
- ✅ 좋은 예: "SQL 인젝션 취약점이 없습니다"
- ❌ 나쁜 예: "보안이 좋습니다"

### 2. 상세한 설명 제공
- 무엇을 확인해야 하는지 구체적으로 명시
- 가능하면 확인 방법이나 기준도 포함

### 3. 적절한 우선순위 설정
- critical: 보안, 데이터 무결성 관련
- high: 기능 동작, 성능에 직접적 영향
- medium: 코드 품질, 유지보수성
- low: 스타일, 문서화

### 4. 고유한 ID 사용
- 영문, 숫자, 하이픈(-) 조합 권장
- 의미있는 이름 사용 (예: "null-safety", "error-handling")

### 5. 적절한 항목 수 유지
- 너무 많은 항목은 처리 시간 증가
- 5-10개 항목을 권장
- 필요시 우선순위별로 분리하여 여러 체크리스트 작성

## 파일 위치

체크리스트 파일은 다음 위치에 저장하는 것을 권장합니다:

- **기본 위치**: `.github/checklist.yml`
- **커스텀 위치**: GitHub Action 설정에서 `checklist-path` 파라미터로 지정

## 검증 방법

작성한 체크리스트가 올바른지 확인하려면:

1. **YAML 문법 검증**: 온라인 YAML 검증 도구 사용
2. **필수 필드 확인**: `checklist.name`, `items[].id`, `items[].title`, `items[].description` 포함 여부
3. **우선순위 값 확인**: `low`, `medium`, `high`, `critical` 중 하나 사용
4. **ID 중복 확인**: 각 항목의 `id`가 고유한지 확인

## 문제 해결

### 일반적인 오류

1. **YAML 문법 오류**
   - 들여쓰기 확인 (스페이스 2개 권장)
   - 콜론(:) 뒤에 공백 확인

2. **필수 필드 누락**
   - 모든 필수 필드가 포함되었는지 확인

3. **잘못된 우선순위 값**
   - `low`, `medium`, `high`, `critical` 중 하나만 사용

### 디버깅 팁

- GitHub Action 로그에서 체크리스트 로딩 메시지 확인
- 파일 경로가 올바른지 확인
- YAML 파일의 인코딩이 UTF-8인지 확인

---

이 가이드를 참고하여 팀의 요구사항에 맞는 체크리스트를 작성하세요. 추가 질문이나 문제가 있으면 프로젝트 이슈를 통해 문의해 주세요.