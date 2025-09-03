# Phase 2 구현 리포트

## 작업 내용

`docs/implements checklist.md`의 Phase 2에 명시된 핵심 모듈 구현 작업을 완료했습니다.

- **`src/context.ts`**: PR의 컨텍스트(제목, 본문, diff 등)를 가져오는 모듈을 구현했습니다.
- **`src/prompt.ts`**: PR 정보를 바탕으로 Gemini API에 전달할 프롬프트를 생성하는 모듈을 구현했습니다.
- **`src/gemini.ts`**: Gemini API를 호출하고 응답을 반환하는 모듈을 구현했습니다.
- **`src/comment.ts`**: GitHub PR에 리뷰 코멘트를 작성하거나 업데이트하는 모듈을 구현했습니다.

## 결과

- Phase 2의 모든 작업 항목을 완료하고 `docs/implements checklist.md`에 반영했습니다.
- 각 모듈은 단일 책임 원칙에 따라 분리되어 유지보수성을 높였습니다.
- 모든 외부 API 호출에는 오류 처리 로직이 포함되었습니다.
