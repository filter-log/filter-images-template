# Upload Page Assets

공개 업로드 라우트는 루트의 [upload/index.html](/Users/seobeen/workspace/filter-images-template/upload/index.html#L1)이다. 이 폴더는 그 페이지가 사용하는 CSS/JS 자산을 보관한다.

## 현재 구조

- 실제 업로드 페이지: [upload/index.html](/Users/seobeen/workspace/filter-images-template/upload/index.html#L1)
- 업로드 페이지 설정: [upload/config.js](/Users/seobeen/workspace/filter-images-template/upload/config.js#L1)
- 업로드 동작 JS: [platform/upload-portal/assets/upload.js](/Users/seobeen/workspace/filter-images-template/platform/upload-portal/assets/upload.js#L1)
- 업로드 스타일: [platform/upload-portal/assets/upload.css](/Users/seobeen/workspace/filter-images-template/platform/upload-portal/assets/upload.css#L1)

## UX 포인트

- 드래그 앤 드롭
- 최대 100장 선택 제한
- 업로드 전 미리보기
- 업로드 진행률 표시
- 업로드 암호 입력
- 서버측 암호 검증 후 세션 기반 업로드
- 업로드 후 성공/실패 결과 표시
- 성공 건에 대한 URL/Markdown 복사
